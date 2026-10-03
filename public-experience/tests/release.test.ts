import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {copy,locales,link,base} from '../src/copy';
const output=resolve('out',base.slice(1));
test('Every declared route has a complete localized document and scoped navigation',()=>{
  const release=JSON.parse(readFileSync(resolve(output,'release.json'),'utf8'));
  assert.equal(release.routes.length,51);
  for(const route of release.routes){
    const html=readFileSync(resolve('out',route.slice(1),'index.html'),'utf8');
    const locale=route.split('/')[3];
    assert.ok(html.includes(`<html lang="${locale}"`));
    assert.ok(html.includes('noindex, nofollow, noarchive'));
    for(const match of html.matchAll(/href="([^"]+)"/g)){
      const href=match[1].replaceAll('&amp;','&');
      if(href.startsWith('/')){
        assert.ok(href.startsWith(base+'/'),href);
        const pathname=href.split('?')[0];
        assert.ok(statSync(resolve('out',pathname.slice(1),pathname.endsWith('/')?'index.html':'')).isFile(),pathname);
      }
    }
    assert.ok(!html.includes('<form'));
  }
});
test('Content hashes match every exported byte',()=>{
  const release=JSON.parse(readFileSync(resolve(output,'release.json'),'utf8'));
  for(const [file,expected] of Object.entries(release.files)) assert.equal(createHash('sha256').update(readFileSync(resolve(output,file))).digest('hex'),expected);
});
test('German is default and all languages have the complete copy',()=>{
  assert.ok(readFileSync(resolve(output,'index.html'),'utf8').includes('<html lang="de"'));
  for(const locale of locales){assert.deepEqual(Object.keys(copy[locale]),Object.keys(copy.de));assert.equal(link(locale,'store'),`${base}/${locale}/store/`);}
});
test('Public runtime and documents contain no backend, price, account or fixture payloads',()=>{
  const forbidden=/SUPABASE_|SERVICE_ROLE|PRIVATE KEY|review-accounts|test_price_rappen|priceCents|available_quantity|is_test|\/api\/(?:auth|state|actions|checkout)|localhost:58531|127\.0\.0\.1:58531/;
  function scan(dir:string){for(const entry of readdirSync(dir)){const file=resolve(dir,entry);if(statSync(file).isDirectory())scan(file);else if(/\.(?:html|js|json|css)$/.test(file))assert.ok(!forbidden.test(readFileSync(file,'utf8')),file);}}
  scan(output);
});
test('Store preserves five tea products, curry, three distinct films and verified restaurant link',()=>{
  for(const locale of locales){
    const html=readFileSync(resolve(output,locale,'store/index.html'),'utf8');
    assert.equal([...html.matchAll(/data-product=/g)].length,6);
    for(const film of ['highlands','tea','kitchen'])assert.ok(html.includes(`data-film="${film}"`));
    assert.ok(html.includes('https://www.varathans25.ch/'));
    assert.ok(!html.includes('data-film="gateway"'));
  }
});
