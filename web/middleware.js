import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("vietarr_token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|favicon.ico).*)"]
};
