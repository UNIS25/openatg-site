import {createServer} from 'node:https';
import {readFileSync,statSync,createReadStream} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('out');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp4':'video/mp4','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer({key:readFileSync('artifacts/localhost-key.pem'),cert:readFileSync('artifacts/localhost-cert.pem')},(request,response)=>{
  try{
    let file=resolve(root,'.'+decodeURIComponent(new URL(request.url,'https://localhost').pathname));
    if(!file.startsWith(root+'/'))throw Error('Path outside output');
    if(statSync(file).isDirectory())file=resolve(file,'index.html');
    const {size}=statSync(file);
    const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
    const range=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){
      const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):size-1,size-1);
      if(start> end){response.writeHead(416,{'Content-Range':`bytes */${size}`});response.end();return;}
      response.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${size}`});
      createReadStream(file,{start,end}).pipe(response);
    }else{response.writeHead(200,{...headers,'Content-Length':size});createReadStream(file).pipe(response);}
  }catch{response.writeHead(404);response.end('Not found');}
});
server.listen(4189,'127.0.0.1',()=>console.log('Verified-export HTTPS preview on https://127.0.0.1:4189'));
