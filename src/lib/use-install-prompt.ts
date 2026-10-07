"use client";

import { useSyncExternalStore } from "react";

// "홈 화면에 추가" 배너의 표시 모드를 관리하는 스토어.
//
// Chrome(Android)은 PWA 설치 요건을 만족하면 beforeinstallprompt를 한 번 발생시킨다.
// preventDefault()로 기본 미니 인포바를 막고 이벤트를 보관해 뒀다가, 사용자가 우리
// 배너의 버튼을 누를 때 prompt()로 네이티브 설치 창을 연다("native" 모드).
//
// 그런데 이 이벤트는 **오지 않을 수 있다** — iOS Safari는 지원하지 않고, 과거에
// 설치를 거부했으면 브라우저가 한동안 억제하며, 하이드레이션 전에 지나가 버리는
// 경우도 있다. 이벤트만 기다리면 그런 환경에서는 설치 안내가 영영 안 뜨므로,
// FALLBACK_DELAY_MS 동안 이벤트가 없으면 브라우저 메뉴를 쓰라는 수동 안내로
// 전환한다("manual" 모드).
//
// 리스너를 모듈 최상위에서 등록하는 이유: 이벤트는 로드 직후 한 번만 오기 때문에
// 컴포넌트 마운트를 기다리면 놓칠 수 있다. 등록은 모듈 평가 1회로 끝난다.
// 상태를 모듈 변수에 두고 useSyncExternalStore로 구독해 effect 내 setState를
// 피한다(React Compiler의 set-state-in-effect 규칙 — .claude/rules/react-components.md).

// beforeinstallprompt는 표준이 아니라 lib.dom에 타입이 없다 → 교차 타입으로 좁힌다
// (use-standalone.ts의 IosNavigator와 동일 패턴 — any 회피).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// layout.tsx의 인라인 스크립트가 하이드레이션 전에 이벤트를 보관해 두는 자리
type InstallWindow = Window & { __bip?: Event };

type IosNavigator = Navigator & { standalone?: boolean };

/** 이벤트를 기다리다 수동 안내로 넘어가는 시간 */
const FALLBACK_DELAY_MS = 3000;

/** 닫기를 누른 사용자에게 매 방문 다시 띄우지 않기 위한 플래그 */
const DISMISS_KEY = "install-banner-dismissed";

export type InstallMode =
  /** 배너를 띄우지 않음(설치됨·닫음·아직 판단 전) */
  | "none"
  /** 네이티브 설치 창을 열 수 있음 */
  | "native"
  /** 브라우저 메뉴로 직접 설치해야 함 */
  | "manual";

let mode: InstallMode = "none";
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setMode(next: InstallMode) {
  if (mode === next) return;
  mode = next;
  emit();
}

function adopt(event: Event) {
  deferred = event as BeforeInstallPromptEvent;
  setMode("native");
}

function wasDismissed() {
  // 시크릿 모드 등에서 localStorage 접근이 던질 수 있다 → 안 띄운 적 없는 것으로 본다
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandalone() {
  const nav = window.navigator as IosNavigator;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

/** 수동 설치 경로 안내 문구 — 렌더 중 navigator를 읽지 않도록 모듈 평가 시 1회 계산 */
export const INSTALL_HINT =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent)
    ? '공유 버튼 → "홈 화면에 추가"'
    : '브라우저 메뉴 → "앱 설치"';

if (typeof window !== "undefined") {
  // 인라인 스크립트가 먼저 잡아 둔 이벤트를 인수한다(이벤트는 재발생하지 않는다)
  const stashed = (window as InstallWindow).__bip;
  if (stashed) adopt(stashed);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    adopt(event);
  });
  // 설치 완료(또는 다른 경로로 설치됨) → 보관한 이벤트는 무효이므로 배너를 내린다
  window.addEventListener("appinstalled", () => {
    deferred = null;
    setMode("none");
  });

  setTimeout(() => {
    if (mode === "none" && !isStandalone() && !wasDismissed()) {
      setMode("manual");
    }
  }, FALLBACK_DELAY_MS);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

// 모듈 변수를 그대로 반환 → 스냅샷이 원시값이라 재렌더 루프가 없다
function getSnapshot(): InstallMode {
  return mode;
}

// SSR에서는 항상 "none" — hydration 불일치 없음
function getServerSnapshot(): InstallMode {
  return "none";
}

/** 설치 배너를 어떤 형태로 띄울지 반환한다. */
export function useInstallMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 배너 닫기 — 이 브라우저에서는 다시 띄우지 않는다. */
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // 저장 못 하면 이번 세션에만 닫힌다
  }
  deferred = null;
  setMode("none");
}

/**
 * 네이티브 설치 창을 띄운다.
 * prompt()는 이벤트당 1회만 유효하므로 호출 즉시 소비 처리해 중복 호출을 막고,
 * 쓸 수 있는 이벤트가 없으면 수동 안내로 내려간다.
 */
export async function requestInstall() {
  const event = deferred;
  if (!event) {
    setMode("manual");
    return;
  }
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // 거부하면 같은 이벤트를 다시 쓸 수 없다 → 메뉴로 설치할 수 있게 안내만 남긴다
  setMode(outcome === "accepted" ? "none" : "manual");
}
