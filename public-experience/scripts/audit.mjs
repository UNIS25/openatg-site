import {readFileSync,readdirSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('out/varathans25/premium-preview');
const origin=process.argv[2]||'http://127.0.0.1:4188';
const report={origin,routes:[],assets:[],secretFiles:0};
const release=JSON.parse(readFileSync(resolve(root,'release.json'),'utf8'));
const privateValues=[];
// Match known local secret values without reporting them. Ignore non-secrets and
// short placeholder values. Nothing from an environment file enters the output.
for(const env of ['../../varathans25-premium-club-platform/platform/.env.local','../../varathans25-admin-backend/commerce/.env.local']){
  try{for(const line of readFileSync(env,'utf8').split('\n')){
    const match=line.match(/^([A-Z0-9_]*(?:KEY|SECRET|PASSWORD)[A-Z0-9_]*)=(.+)$/);
    if(match&&match[2].length>20)privateValues.push(match[2].replace(/^['"]|['"]$/g,''));
  }}catch{/* An absent private configuration is not required to build or audit. */}
}
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/AKIA[0-9A-Z]{16}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{50,}/,/sb_secret_[A-Za-z0-9_-]{15,}/,/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,/SUPABASE_SERVICE_ROLE_KEY|review-accounts|admin-credentials|test_price_rappen/];
function scan(dir){for(const entry of readdirSync(dir)){const file=resolve(dir,entry);if(statSync(file).isDirectory())scan(file);else{
  if(/\.env|\.db$|\.sql$|\.map$|\.ts$|\.tsx$|\.fixtures?/.test(file))throw Error('Private/server file in public output');
  const bytes=readFileSync(file);for(const value of privateValues)if(bytes.includes(Buffer.from(value)))throw Error('Known private value in output');
  if(/\.(html|js|css|json)$/.test(file))for(const pattern of patterns)if(pattern.test(bytes.toString()))throw Error('Secret or private fixture pattern in output');
  report.secretFiles++;
}}}scan(root);
for(const path of [ '/varathans25/premium-preview/',...release.routes]){
  const response=await fetch(origin+path);if(!response.ok)throw Error(`HTTP ${response.status}: ${path}`);
  const html=await response.text();const expected=readFileSync(resolve('out',path.slice(1),'index.html'),'utf8');
  // Cloudflare can inject its existing analytics script. Verify all emitted page
  // content apart from that single known injected tag, never relax site CSP.
  const actual=html.replace(/<script[^>]*src=["']https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js[^<]*<\/script>/g,'');
  if(actual.trim()!==expected.trim())throw Error(`Live page differs from verified export: ${path}`);
  report.routes.push({path,status:response.status});
}
for(const [path,expected] of Object.entries(release.files).filter(([p])=>p.startsWith('media/'))){
  const response=await fetch(origin+'/varathans25/premium-preview/'+path);if(!response.ok)throw Error(`Broken asset: ${path}`);
  const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');if(actual!==expected)throw Error(`Asset hash mismatch: ${path}`);
  report.assets.push({path,sha256:actual,cacheControl:response.headers.get('cache-control')});
}
mkdirSync('artifacts',{recursive:true});writeFileSync(`artifacts/${origin.startsWith('http://127.')?'local':'live'}-audit.json`,JSON.stringify(report,null,2));
console.log(`PASS: ${report.routes.length} HTTP routes, ${report.assets.length} byte-verified assets, ${report.secretFiles} files scanned; no secrets/private fixtures.`);
