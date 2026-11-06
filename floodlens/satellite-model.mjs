const layers={flood:'VIIRS_Combined_Flood_2-Day',truecolor:'VIIRS_NOAA20_CorrectedReflectance_TrueColor'};
export function satelliteState(data,key,now=Date.now()){
 if(data?.schemaVersion!==1||data.kind!=='dated_satellite_context'||data.crs!=='OGC:CRS84'||!Object.hasOwn(layers,key)||data.source!=='https://lance.modaps.eosdis.nasa.gov/flood/')throw Error('Unsupported satellite snapshot');
 const bbox=data.bbox;if(!Array.isArray(bbox)||bbox.length!==4||!bbox.every(Number.isFinite)||bbox[0]<79||bbox[1]<5||bbox[2]>83||bbox[3]>11||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])throw Error('Invalid satellite extent');
 if(!Number.isFinite(data.displayResolutionDegrees)||Math.abs(data.displayResolutionDegrees-.00439453125)>1e-12||data.nominalProductResolutionMeters!==250||!Number.isInteger(data.pixelWidth)||!Number.isInteger(data.pixelHeight)||Math.abs((bbox[2]-bbox[0])/data.displayResolutionDegrees-data.pixelWidth)>.001||Math.abs((bbox[3]-bbox[1])/data.displayResolutionDegrees-data.pixelHeight)>.001)throw Error('Invalid satellite projection');
 const p=data.products?.[key];if(p?.layer!==layers[key]||p.path!==`/floodlens/data/satellite/${key}.png`||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isInteger(p.bytes)||p.bytes<24||p.bytes>3000000||!/^[a-f0-9]{64}$/.test(p.sha256)||p.compositeDays!==(key==='flood'?2:1))throw Error('Invalid satellite product');
 const at=Date.parse(p.date+'T00:00:00Z'),retrieved=Date.parse(data.retrievedAt);if(!Number.isFinite(at)||new Date(at).toISOString().slice(0,10)!==p.date||!Number.isFinite(retrieved)||retrieved<at||!Number.isFinite(now))throw Error('Invalid satellite date');
 return {status:now<at||now<retrieved?'clock_unknown':now-at>72*3600000?'stale':'available',product:p};
}
export async function verifiedSatelliteImage(data,key,fetcher=fetch,now=Date.now()){
 const {status,product:p}=satelliteState(data,key,now);if(status!=='available')throw Error('Unavailable satellite snapshot');
 const r=await fetcher(p.path+'?sha256='+p.sha256,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Satellite image unavailable');
 const b=new Uint8Array(await r.arrayBuffer());if(b.length!==p.bytes||b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71)throw Error('Satellite image size/type mismatch');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==p.sha256)throw Error('Satellite manifest/image version mismatch');
 let text='';for(let i=0;i<b.length;i+=8192)text+=String.fromCharCode(...b.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(text);
}
