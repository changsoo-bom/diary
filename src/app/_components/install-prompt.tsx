"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { requestInstall, useInstallPrompt } from "@/lib/use-install-prompt";

/**
 * "홈 화면에 추가" 유도 배너.
 * 브라우저가 설치 가능하다고 알려줬을 때(beforeinstallprompt)만 나타나고,
 * 버튼을 누르면 OS 네이티브 설치 창이 열린다.
 */
export function InstallPrompt() {
  const prompt = useInstallPrompt();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  // 설치된 PWA·미지원 브라우저(iOS Safari 등)에서는 prompt가 null이라 저절로 숨는다
  // — standalone 중복 판별은 불필요하다(설치 후엔 이벤트가 오지 않음).
  // 로그인 화면은 하단 탭바가 없어 배너가 떠 보이므로 BottomNav와 같은 조건으로 숨긴다.
  if (!prompt || dismissed || pathname === "/login") return null;

  return (
    // 하단 탭바(BottomNav) 바로 위에 띄운다
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-50 animate-fade-up px-6">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
        <Image
          src="/icon-192.png"
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-xl border border-line"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">홈 화면에 추가</p>
          <p className="truncate text-xs text-text-muted">
            앱처럼 바로 열 수 있어요
          </p>
        </div>
        <button
          type="button"
          onClick={() => void requestInstall()}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-bg bg-primary transition-opacity hover:opacity-80"
        >
          설치
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="설치 안내 닫기"
          className="shrink-0 p-1 text-text-muted transition-opacity hover:opacity-60"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="size-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
