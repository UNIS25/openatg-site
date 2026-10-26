export function cloudState(data,now=Date.now()){
 if(data?.schemaVersion!==1||data.kind!=='infrared_cloud_imagery'||data.layer!=='Himawari_AHI_Band13_Clean_Infrared'||data.nativeResolutionKm!==2||!Array.isArray(data.frames)||data.frames.length!==3||!Array.isArray(data.bbox)||data.bbox.length!==4)throw Error('Unsupported cloud imagery');
 if(data.source!=='https://nasa-gibs.github.io/gibs-api-docs/'||data.terms!=='https://www.jma.go.jp/jma/en/copyright.html')throw Error('Unexpected cloud source');
 const [west,south,east,north]=data.bbox;if(![west,south,east,north].every(Number.isFinite)||west<79||east>83||south<5||north>11||west>=east||south>=north)throw Error('Unexpected cloud extent');
 const retrieved=Date.parse(data.retrievedAt);if(!Number.isFinite(now)||!Number.isFinite(retrieved))throw Error('Invalid cloud time');let previous=0;
 for(const f of data.frames){const time=Date.parse(f.captureAt);if(!Number.isFinite(time)||time<=previous||time>retrieved||!/^\/floodlens\/data\/clouds\/\d{8}T\d{4}\.png$/.test(f.path)||!/^[a-f0-9]{64}$/.test(f.sha256)||!Number.isFinite(f.landPixelCoverage)||f.landPixelCoverage<.99)throw Error('Invalid cloud frame');previous=time;}
 if(data.capturedAt!==data.frames.at(-1).captureAt)throw Error('Cloud time mismatch');
 if(now<previous)return {status:'clock_unknown'};
 if(now-previous>3*3600000)return {status:'stale'};
 return {status:'available',ageMinutes:Math.floor((now-previous)/60000)};
}
