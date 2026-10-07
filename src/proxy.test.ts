import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// 인증 가드 경계 자체 점검.
//   실행: node --test src/proxy.test.ts
//
// proxy.ts를 import하지 않고 소스에서 matcher 문자열만 읽어 평가한다 —
// proxy.ts는 next/server와 "@/" 경로 별칭에 의존해서 런타임 그대로는 못 돌린다.
// Next는 이 문자열을 그대로 정규식으로 쓰므로 같은 방식으로 재현한다.
//
// 이 테스트가 지키는 것: 정적 자산을 제외하려다 보호 라우트까지 열어버리거나(인증
// 우회), 반대로 PWA 아이콘이 가드에 걸려 307이 되는 것(설치 요건이 조용히 깨짐).
function guardMatcher(): RegExp {
  const src = readFileSync(new URL("./proxy.ts", import.meta.url), "utf8");
  const found = src.match(/matcher:\s*\[\s*"((?:[^"\\]|\\.)*)"/);
  assert.ok(found, "proxy.ts에서 matcher 문자열을 찾지 못했다");
  // 소스의 문자열 리터럴 → 실제 값(\\w → \w)
  const pattern: string = JSON.parse(`"${found[1]}"`);
  return new RegExp(`^${pattern}$`);
}

test("인증 가드가 보호 라우트에만 걸린다", () => {
  const re = guardMatcher();

  // 가드가 걸려야 하는 경로(비로그인이면 /login으로 보내야 함)
  for (const path of [
    "/",
    "/gallery",
    "/login",
    "/profile/edit",
    "/calendar/trip/1",
    // 아이콘 '비슷한' 이름이 제외 규칙에 묻어가면 안 된다
    "/iconography",
    "/icon-evil/secret",
  ]) {
    assert.ok(re.test(path), `${path}는 가드 대상이어야 한다`);
  }

  // 가드에서 제외되어야 하는 경로 — 브라우저가 로그인 없이 받아야 하는 것들.
  // 아이콘이 여기 빠지면 307이 되어 PWA 설치 요건이 깨진다.
  for (const path of [
    "/icon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/manifest.webmanifest",
    "/sw.js",
    "/favicon.ico",
    "/api/photos",
    "/asset/fonts/Pretendard-Regular.woff2",
    "/_next/static/chunk.js",
  ]) {
    assert.ok(!re.test(path), `${path}는 가드에서 제외되어야 한다`);
  }
});
