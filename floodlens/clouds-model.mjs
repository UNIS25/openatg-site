export function cloudState(data,now=Date.now()){
 if(![1,2].includes(data?.schemaVersion)||data.kind!=='infrared_cloud_imagery'||data.layer!=='Himawari_AHI_Band13_Clean_Infrared'||data.nativeResolutionKm!==2||!Array.isArray(data.frames)||data.frames.length!==3||!Array.isArray(data.bbox)||data.bbox.length!==4)throw Error('Unsupported cloud imagery');
 if(data.source!=='https://nasa-gibs.github.io/gibs-api-docs/'||data.terms!=='https://www.jma.go.jp/jma/en/copyright.html')throw Error('Unexpected cloud source');
 const [west,south,east,north]=data.bbox;if(![west,south,east,north].every(Number.isFinite)||west<79||east>83||south<5||north>11||west>=east||south>=north)throw Error('Unexpected cloud extent');
 const retrieved=Date.parse(data.retrievedAt);if(!Number.isFinite(now)||!Number.isFinite(retrieved))throw Error('Invalid cloud time');let previous=0;
 for(const f of data.frames){const time=Date.parse(f.captureAt);if(!Number.isFinite(time)||time<=previous||time>retrieved||!(data.schemaVersion===2?/^\/floodlens\/data\/clouds\/frame-[0-2]\.png$/:/^\/floodlens\/data\/clouds\/\d{8}T\d{4}\.png$/).test(f.path)||!/^[a-f0-9]{64}$/.test(f.sha256)||!Number.isFinite(f.landPixelCoverage)||f.landPixelCoverage<.99)throw Error('Invalid cloud frame');previous=time;}
 if(data.capturedAt!==data.frames.at(-1).captureAt)throw Error('Cloud time mismatch');
 if(now<previous)return {status:'clock_unknown'};
 if(now-previous>3*3600000)return {status:'stale'};
 return {status:'available',ageMinutes:Math.floor((now-previous)/60000)};
}

// Fixed image slots can cross a deployment/cache boundary. Display only bytes
// matching this exact manifest; an old tab rejects schema 2 before rendering.
export async function verifiedCloudImages(data,fetcher=fetch,now=Date.now()){
 if(cloudState(data,now).status!=='available')throw Error('Unavailable cloud frames');
 return Promise.all(data.frames.map(async f=>{
  if(!Number.isInteger(f.bytes)||f.bytes<24||f.bytes>500000)throw Error('Unbounded cloud frame');
  const r=await fetcher(f.path+'?sha256='+f.sha256,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('Cloud image unavailable');const b=new Uint8Array(await r.arrayBuffer());
  if(b.length!==f.bytes||b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)throw Error('Cloud image size/type mismatch');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==f.sha256)throw Error('Cloud manifest/image version mismatch');
  let text='';for(let i=0;i<b.length;i+=8192)text+=String.fromCharCode(...b.subarray(i,i+8192));
  return 'data:image/png;base64,'+btoa(text);
 }));
}
