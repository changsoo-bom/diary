// public/icon.svg → PWA 설치용 raster 아이콘(public/icon-192.png, icon-512.png) 생성.
// Chrome(Android)은 SVG를 PWA 설치 요건 아이콘으로 인정하지 않아 PNG가 반드시 필요하다.
//   실행: node scripts/gen-icons.mjs
//
// SVG의 'R'은 Pretendard(woff2)를 지정하지만 librsvg는 웹폰트를 읽지 못해 시스템
// 산세리프로 폴백된다. 글자 한 자라 차이는 무시할 수준이지만, 그 탓에 베이스라인이
// 미세하게 어긋나므로 글리프만 trim한 뒤 캔버스 정중앙에 다시 앉힌다.

import { statSync, readFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "public/icon.svg";
const SIZES = [192, 512];
// 캔버스 대비 글리프 높이. maskable 안전영역(중앙 80% 원) 안에 들어가도록 넉넉히 잡는다.
const GLYPH_RATIO = 0.55;
const WORK = 1024; // 합성 작업 해상도(최종 크기보다 크게 잡아 리샘플 손실 최소화)

const svg = readFileSync(SRC);

// density를 올려 벡터를 충분한 해상도로 래스터화한 뒤 글리프 바운딩박스만 남긴다.
const base = await sharp(svg, { density: 512 }).resize(WORK, WORK).png().toBuffer();
const glyph = await sharp(base).trim({ threshold: 10 }).toBuffer();
const { width, height } = await sharp(glyph).metadata();

const scale = (WORK * GLYPH_RATIO) / Math.max(width, height);
const scaled = await sharp(glyph)
  .resize({ width: Math.round(width * scale), height: Math.round(height * scale) })
  .toBuffer();

const canvas = await sharp({
  create: { width: WORK, height: WORK, channels: 3, background: "#ffffff" },
})
  .composite([{ input: scaled, gravity: "center" }])
  .png()
  .toBuffer();

for (const size of SIZES) {
  const out = `public/icon-${size}.png`;
  await sharp(canvas).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`${out}  ${size}x${size}  ${statSync(out).size} bytes`);
}
