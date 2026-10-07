import assert from "node:assert/strict";
import test from "node:test";
import manifest from "./manifest.ts";

// PWA 설치 요건 자체 점검 — 의존성 없는 순수 함수라 런타임 그대로 돌린다.
//   실행: node --test src/app/manifest.test.ts
//
// 아이콘을 SVG만 남기면 Chrome(Android)이 설치 가능으로 판정하지 않아
// beforeinstallprompt가 발생하지 않고, "홈 화면에 추가" 배너가 영영 뜨지 않는다.
// 눈에 보이는 에러 없이 조용히 사라지는 회귀라 여기서 고정한다.

test("manifest가 Chrome의 PWA 설치 요건을 만족한다", () => {
  const { icons, display, start_url, name, short_name } = manifest();

  // Chrome은 SVG를 설치 요건 아이콘으로 인정하지 않는다 → raster만 센다
  const raster = (icons ?? []).filter((icon) => icon.type !== "image/svg+xml");

  for (const size of ["192x192", "512x512"]) {
    assert.ok(
      raster.some((icon) => icon.sizes === size),
      `raster ${size} 아이콘이 필요하다`
    );
  }
  // 런처에서 원형·squircle로 잘릴 때 여백을 확보하는 아이콘
  assert.ok(
    raster.some((icon) => icon.purpose === "maskable"),
    "maskable 아이콘이 필요하다"
  );

  assert.equal(display, "standalone");
  assert.ok(start_url, "start_url이 필요하다");
  assert.ok(name || short_name, "name 또는 short_name이 필요하다");
});
