"use client";

import { useSyncExternalStore } from "react";

// 브라우저의 "홈 화면에 추가" 프롬프트를 우리 UI로 띄우기 위한 스토어.
//
// Chrome(Android)은 PWA 설치 요건을 만족하면 beforeinstallprompt를 한 번 발생시킨다.
// preventDefault()로 기본 미니 인포바를 막고 이벤트를 보관해 뒀다가, 사용자가 우리
// 배너의 버튼을 누를 때 prompt()로 네이티브 설치 창을 연다.
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

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  // 설치 완료(또는 다른 경로로 설치됨) → 보관한 이벤트는 무효이므로 배너를 내린다
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

// 모듈 변수 참조를 그대로 반환 → 스냅샷이 안정적이라 재렌더 루프가 없다
function getSnapshot() {
  return deferred;
}

// SSR에서는 항상 null — hydration 불일치 없음
function getServerSnapshot() {
  return null;
}

/**
 * 설치 프롬프트를 띄울 수 있는 상태면 보관된 이벤트를, 아니면 null을 반환한다.
 * 이미 설치된 PWA·미지원 브라우저(iOS Safari 등)에서는 이벤트가 오지 않아 계속 null이다.
 */
export function useInstallPrompt() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/**
 * 네이티브 설치 창을 띄우고 사용자의 선택을 반환한다.
 * prompt()는 이벤트당 1회만 유효하므로 호출 즉시 소비 처리해 중복 호출을 막는다.
 */
export async function requestInstall(): Promise<InstallOutcome> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}
