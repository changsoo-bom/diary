import type { MetadataRoute } from "next";

// 아이콘 주의 — Chrome(Android)의 PWA 설치 요건은 192·512px **raster** 아이콘이다.
// SVG는 설치 요건 아이콘으로 인정되지 않아, SVG만 두면 beforeinstallprompt 자체가
// 발생하지 않는다(= 갤럭시에서 "앱 설치"가 영영 안 뜸). PNG를 먼저 두고 SVG는
// 고해상도 표시용으로 뒤에 남긴다. PNG는 public/icon.svg에서 생성한 것으로,
// 아이콘을 바꾸면 `node scripts/gen-icons.mjs`로 재생성한다.
// 이 요건은 src/app/manifest.test.ts가 고정한다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Record",
    short_name: "Record",
    description: "함께 쓰는 기록 앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1e1e1e",
    lang: "ko",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // 워드마크가 캔버스의 55% 크기라 마스크 안전영역(중앙 80%) 안에 들어온다.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
