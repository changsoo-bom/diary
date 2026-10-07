import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallPrompt } from "./_components/install-prompt";
import { PWARegister } from "./_components/pwa-register";
import { QueryProvider } from "./_components/query-provider";
import { BottomNav } from "./_components/bottom-nav";
import { PageTransition } from "./_components/page-transition";
import { PullToRefresh } from "./_components/pull-to-refresh";
import { Splash } from "./_components/splash";

export const metadata: Metadata = {
  title: "Record",
  description: "함께 쓰는 기록 앱",
  applicationName: "Record",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Record",
  },
  icons: {
    // SVG를 먼저 두되(지원 브라우저는 고해상도로 렌더), PNG 폴백을 반드시 남긴다 —
    // iOS의 apple-touch-icon은 SVG를 지원하지 않아 홈 화면 아이콘이 비어 보인다.
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e1e1e",
  // iOS standalone PWA에서 env(safe-area-inset-*) 값을 실제 인셋으로 채우려면 필수
  // (미지정 시 항상 0 → 홈 인디케이터가 하단 탭바를 침범)
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Splash />
        <PWARegister />
        <QueryProvider>
          <PullToRefresh>
            <PageTransition>{children}</PageTransition>
          </PullToRefresh>
        </QueryProvider>
        <BottomNav />
        <InstallPrompt />
      </body>
    </html>
  );
}
