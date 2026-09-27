// Reproducible, silent derivatives of genuine camera footage. Masters stay ignored.
// Run from platform after obtaining the four licensed masters listed in the rights notes.
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
const root = '.local/visual-reset/masters';
const out = 'public/varathans25/visual-reset';
mkdirSync(out, { recursive: true });
const clips = [
  { name: 'highlands', file: 'highlands-32702820.mp4', start: 35, seconds: 16, filter: 'eq=contrast=1.06:saturation=1.06' },
  { name: 'tea', file: 'tea-6540434.mp4', start: 1, seconds: 14, filter: 'null' },
  { name: 'kitchen', file: 'kitchen-4902170.mp4', start: 0, seconds: 8, filter: 'null' },
  { name: 'evening', file: 'night-5615181.mp4', start: 0, seconds: 10, filter: 'crop=1440:1100:0:1390' },
];
const report = [];
function ff(args) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (p.status !== 0) throw new Error('Video export failed');
}
for (const clip of clips) {
  for (const width of [1600, 720]) {
    const file = `${out}/${clip.name}-${width === 720 ? 'mobile' : width}.mp4`;
    const filter = width === 720
      ? `${clip.name === 'evening' ? 'null' : clip.filter},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280:(iw-ow)*0.6:(ih-oh)*0.5`
      : `${clip.filter},scale=${width}:-2`;
    ff(['-ss', String(clip.start), '-i', `${root}/${clip.file}`, '-t', String(clip.seconds), '-vf', filter, '-r', '24', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', width === 1600 ? '25' : '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file]);
  }
  const poster = `.local/visual-reset/${clip.name}-poster.png`;
  ff(['-ss', String(clip.start + 1), '-i', `${root}/${clip.file}`, '-frames:v', '1', '-vf', `${clip.filter},scale=1600:-2`, poster]);
  await sharp(poster).webp({ quality: 84 }).toFile(`${out}/${clip.name}-poster.webp`);
  const raw = spawnSync('ffprobe', ['-v', 'quiet', '-show_format', '-show_streams', '-of', 'json', `${out}/${clip.name}-1600.mp4`], { encoding: 'utf8' });
  const data = JSON.parse(raw.stdout);
  report.push({ name: clip.name, duration: data.format.duration, bytes: data.format.size, streams: data.streams.map(({ codec_type, codec_name, width, height }) => ({ codec_type, codec_name, width, height })) });
}
writeFileSync('.local/visual-reset/media-report.json', JSON.stringify(report, null, 2));
console.log(report);
