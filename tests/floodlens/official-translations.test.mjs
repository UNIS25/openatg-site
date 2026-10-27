import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateSnapshot,warningSourceUrl,warningState,warningMatches} from '../../floodlens/core.mjs';
const snapshot=JSON.parse(await readFile(new URL('../../floodlens/data/reviewed.json',import.meta.url)));
const warning=snapshot.bulletins.find(w=>w.kind==='lightning');
test('official Tamil original is language-selected; unchanged originals remain fallback',()=>{
 validateSnapshot(snapshot);
 assert.ok(warningSourceUrl(warning,'ta').endsWith('1793085463.pdf'));
 for(const lang of ['en','si','unknown'])assert.equal(warningSourceUrl(warning,lang),warning.url);
 assert.equal(warningSourceUrl({...warning,officialTranslations:undefined},'ta'),warning.url);
 assert.equal(warningSourceUrl(undefined,'ta'),undefined);
});
test('later translation listing does not change bulletin issue, severity, scope or expiry',()=>{
 const ta=warning.officialTranslations.ta;
 assert.equal(ta.issuedAt,warning.issuedAt);assert.equal(ta.expiresAt,warning.expiresAt);
 assert.ok(Date.parse(ta.listingAt)>Date.parse(ta.issuedAt));assert.equal(warning.severity,'amber');
 assert.deepEqual(warning.districtCodes,['LK52','LK51']);
 assert.equal(warningState(warning,Date.parse(ta.listingAt)),'active');
 assert.equal(warningState(warning,Date.parse(ta.expiresAt)),'expired');
 assert.equal(warningMatches(warning,{type:'district',code:'LK11'}),false);
});
test('unreviewed translation identities, unsafe URLs and altered validity fail validation',()=>{
 const bad=[{url:'javascript:alert(1)'},{url:'https://www.dmc.gov.lk.evil.test/a.pdf'},{url:'https://user@www.dmc.gov.lk/images/dmcreports/a.pdf'},{url:'https://www.dmc.gov.lk/images/dmcreports/a.pdf?redirect=bad'},{url:'https://www.dmc.gov.lk/other.pdf'},{sha256:'bad'},{bulletinId:'other'},{issuedAt:'2026-10-27T12:45:00+05:30'},{expiresAt:'2026-10-28T23:30:00+05:30'},{listingAt:null},{reviewedAt:'invalid'}];
 for(const change of bad){const d=structuredClone(snapshot);Object.assign(d.bulletins.find(w=>w.kind==='lightning').officialTranslations.ta,change);assert.throws(()=>validateSnapshot(d),JSON.stringify(change));}
 const d=structuredClone(snapshot);d.bulletins.find(w=>w.kind==='lightning').officialTranslations.xx=warning.officialTranslations.ta;assert.throws(()=>validateSnapshot(d));
});
