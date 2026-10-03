// The requested original is read only. Preserve every video frame in order,
// including its Earth opening and restaurant ending. No trim or crossfade.
import {spawnSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const original=process.argv[2];
if(!original)throw Error('Pass the original downloaded film path');
const expected='674ddcf1e1069b45408b9c3cb2daade6fff7d63b55b6b782f16c0c436221f8ad';
const hash=data=>createHash('sha256').update(data).digest('hex');
if(hash(readFileSync(original))!==expected)throw Error('The original downloaded film has changed');
mkdirSync('artifacts/media-master',{recursive:true});mkdirSync('media',{recursive:true});
function ff(args){const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});if(result.status!==0)throw Error('Film export failed');}
for(const width of [1920,1280])ff(['-i',original,'-map','0:v:0',...(width===1280?['-vf','scale=1280:720']:[]),'-an','-map_metadata','-1','-c:v','libx264','-preset','slow','-crf',width===1920?'23':'24','-maxrate',width===1920?'4M':'1900k','-bufsize',width===1920?'8M':'3800k','-pix_fmt','yuv420p','-movflags','+faststart',`media/gateway-${width}.mp4`]);
ff(['-i',original,'-map','0:v:0','-frames:v','1','artifacts/media-master/poster.png']);
await sharp('artifacts/media-master/poster.png').webp({quality:90}).toFile('media/gateway-poster.webp');
writeFileSync('artifacts/media-master/original.sha256',expected+'\n');
