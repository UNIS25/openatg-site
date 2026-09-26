// PRIVATE STAGING ONLY: original motion study using existing project photographs.
// No external footage, audio, generated product facts or modified logos.
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
const out = "public/varathans25/media";
mkdirSync(out, { recursive: true });
mkdirSync(".local/cinematic", { recursive: true });
const root = "public/varathans25/images/";
const inputs = [
  "restaurant/dining-interior.webp",
  "varathans25-green-tea-powder.webp",
  "gelber-curry-kokos.webp",
  "restaurant/rooftop-panorama.webp",
  "restaurant/dining-interior.webp",
];
const args = inputs.flatMap((file) => [
  "-loop",
  "1",
  "-framerate",
  "24",
  "-t",
  "3",
  "-i",
  root + file,
]);
const filters = inputs.map((file, i) => {
  const fit = file.startsWith("restaurant/")
    ? "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
    : "scale=600:650:force_original_aspect_ratio=decrease,pad=1280:720:650:(oh-ih)/2:color=0xf6f5f1";
  return `[${i}:v]${fit},setsar=1,format=yuv420p,settb=AVTB[v${i}]`;
});
filters.push(
  "[v0][v1]xfade=transition=fade:duration=1:offset=2[x1]",
  "[x1][v2]xfade=transition=fade:duration=1:offset=4[x2]",
  "[x2][v3]xfade=transition=fade:duration=1:offset=6[x3]",
  "[x3][v4]xfade=transition=fade:duration=1:offset=8[out]",
);
execFileSync("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  ...args,
  "-filter_complex",
  filters.join(";"),
  "-map",
  "[out]",
  "-an",
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  "27",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  out + "/daylight-study-1280.mp4",
]);
execFileSync("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  out + "/daylight-study-1280.mp4",
  "-vf",
  "scale=960:540",
  "-an",
  "-c:v",
  "libx264",
  "-crf",
  "28",
  "-movflags",
  "+faststart",
  out + "/daylight-study-960.mp4",
]);
execFileSync("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  out + "/daylight-study-1280.mp4",
  "-an",
  "-c:v",
  "libvpx-vp9",
  "-b:v",
  "0",
  "-crf",
  "38",
  "-row-mt",
  "1",
  out + "/daylight-study-1280.webm",
]);
await sharp(root + "restaurant/dining-interior.webp")
  .resize(1280, 720, { fit: "cover" })
  .webp({ quality: 82 })
  .toFile(out + "/daylight-poster-1280.webp");
await sharp(root + "restaurant/dining-interior.webp")
  .resize(640, 800, { fit: "cover" })
  .webp({ quality: 82 })
  .toFile(out + "/daylight-poster-mobile.webp");
const report = [
  "daylight-study-1280.mp4",
  "daylight-study-960.mp4",
  "daylight-study-1280.webm",
].map((name) => ({
  name,
  bytes: statSync(out + "/" + name).size,
  metadata: JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_name,codec_type,width,height",
        "-of",
        "json",
        out + "/" + name,
      ],
      { encoding: "utf8" },
    ),
  ),
}));
writeFileSync(
  ".local/cinematic/encoding.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
