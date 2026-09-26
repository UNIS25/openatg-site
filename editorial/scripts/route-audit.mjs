import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin=process.argv[2]||'http://127.0.0.1:4187';
const phase=process.argv[3]||'local';
const baseFiles=execFileSync('git',['ls-tree','-r','--name-only','2d2bc01a5ee2061e8fcc8ec8ad2ccecf81904b76'],{encoding:'utf8'}).trim().split('\n');
const manifest=JSON.parse(readFileSync('editorial/assets/export-manifest.json','utf8'));
const pages=[...baseFiles.filter(p=>p.endsWith('.html')),...Object.keys(manifest.files).filter(p=>p.endsWith('.html'))];
const paths=new Map();
for(const file of pages){
 const path='/'+file.replace(/index\.html$/,'');
 paths.set(path,{kind:'route',file});
 const html=readFileSync(file,'utf8');
 for(const match of html.matchAll(/<(?:script|img|link)\b[^>]*>/gi)){
  const tag=match[0];
  if(tag.startsWith('<link')&&!/rel="(?:stylesheet|icon|preload)"/.test(tag))continue;
  const refs=[...(tag.matchAll(/\b(?:src|href)="([^"]+)"/g))].map(m=>m[1]);
  for(const ref of refs){
   const url=new URL(ref,origin+path);
   if(url.origin!==origin||url.pathname==='/'||url.protocol==='data:')continue;
   const local=decodeURIComponent(url.pathname).replace(/^\//,'');
   if(existsSync(local)&&!local.endsWith('.html'))paths.set(url.pathname,{kind:'asset',file:local});
  }
 }
}
for(const file of Object.keys(manifest.files).filter(f=>!f.endsWith('.html')))paths.set('/'+file,{kind:'asset',file});
const list=[...paths];let cursor=0;const results=[];
await Promise.all(Array.from({length:6},async()=>{while(cursor<list.length){const [path,info]=list[cursor++];let result;for(let attempt=1;attempt<=2;attempt++){try{
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});const data=Buffer.from(await response.arrayBuffer());
 const hash=createHash('sha256').update(data).digest('hex');
 const exact=info.kind==='asset' ? hash===createHash('sha256').update(readFileSync(info.file)).digest('hex'):undefined;
 result={path,kind:info.kind,status:response.status,bytes:data.length,exact};if(response.ok&&exact!==false)break;
 }catch(e){result={path,kind:info.kind,error:e.message};}}
 results.push(result);
}}));
const failures=results.filter(r=>r.status!==200||r.exact===false||r.error);
const report={origin,phase,routes:results.filter(r=>r.kind==='route').length,assets:results.filter(r=>r.kind==='asset').length,failures,results};
writeFileSync(`editorial/artifacts/${phase}-routes.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({origin,phase,routes:report.routes,assets:report.assets,failures},null,2));
if(failures.length)process.exitCode=1;
