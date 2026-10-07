import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

// Next 16: middleware → proxy 규약. 라우트 렌더 전 인증 가드.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // 비로그인 + 보호 경로 → /login
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 로그인 상태로 /login 접근 → /
  if (session && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// API·정적 자산·PWA 파일은 제외.
// 아이콘은 파일명을 하나씩 적지 않고 패턴으로 받는다 — 설치용 PNG를 추가할 때
// 여기를 같이 고치지 않으면 인증 가드에 걸려 307이 되고, 브라우저가 아이콘을
// 못 받아 PWA 설치 요건이 조용히 깨진다. 확장자를 요구하므로 /iconography 같은
// 라우트가 섞여 들어오지는 않는다.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon[\\w-]*\\.(?:svg|png)|asset).*)",
  ],
};
