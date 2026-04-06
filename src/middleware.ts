import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/unauthorized", "/monitoring"];
const REQUIRED_ORG = process.env.S8_REQUIRED_ORG || "solution8-com";
const ENFORCE_GITHUB_ORG = process.env.S8_ENFORCE_GITHUB_ORG !== "false";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname);

  if (
    pathname.startsWith("/_next/") ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico" ||
    hasFileExtension ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  // =======================================================================
  // FOOLPROOF COOKIE DISCOVERY
  // Vercel Edge misreads HTTPS status and looks for the wrong cookie name.
  // We find exactly what the browser sent and force getToken to use it.
  // =======================================================================

  const allCookies = request.cookies.getAll();
  const sessionCookie = allCookies.find(c => c.name.includes("session-token"));
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_JWT_SECRET;

  let token = await getToken({
    req: request,
    secret: secret,
    cookieName: sessionCookie?.name,
    salt: sessionCookie?.name,
    secureCookie: sessionCookie?.name?.startsWith("__Secure-"),
  });

  if (!token) {
    token = await getToken({ req: request, secret });
  }

  if (!token) {
    console.error("[AUTH] NO_TOKEN in middleware. Found cookies:", allCookies.map(c => c.name));
    const url = new URL("/unauthorized", request.url);
    return NextResponse.redirect(url, { status: 302 });
  }

  if (ENFORCE_GITHUB_ORG && token.org !== REQUIRED_ORG) {
    const url = new URL("/unauthorized", request.url);
    return NextResponse.redirect(url, { status: 302 });
  }

  if (pathname.startsWith("/prompts/") && (pathname.endsWith(".prompt.md") || pathname.endsWith(".prompt.yml"))) {
    const id = pathname.slice("/prompts/".length);
    const url = request.nextUrl.clone();
    url.pathname = `/api/prompts/${id}/raw`;
    return NextResponse.rewrite(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
