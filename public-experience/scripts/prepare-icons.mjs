import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
// Vector redraw of the official logo's distinctive small 2 / large open-bowl 5.
// Fine strokes are strengthened for tiny tab icons. The full official logo is
// used unchanged in the website. These derivatives contain no brand lettering.
const svg=readFileSync('media/favicon.svg');
const sizes=[16,32,48];
const frames=await Promise.all(sizes.map(size=>sharp(svg,{density:384}).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*frames.length);
header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);
let offset=header.length;
frames.forEach((frame,i)=>{
  const start=6+i*16;
  header[start]=sizes[i];header[start+1]=sizes[i];
  header.writeUInt16LE(1,start+4);header.writeUInt16LE(32,start+6);
  header.writeUInt32LE(frame.length,start+8);header.writeUInt32LE(offset,start+12);
  offset+=frame.length;
});
writeFileSync('media/favicon.ico',Buffer.concat([header,...frames]));
await sharp(svg,{density:384}).resize(180,180).png().toFile('media/apple-touch-icon.png');
mkdirSync('artifacts/icons',{recursive:true});
for(let i=0;i<sizes.length;i++)writeFileSync(`artifacts/icons/favicon-${sizes[i]}.png`,frames[i]);
console.log('Prepared SVG, 16/32/48px ICO and 180px Apple touch icon.');
