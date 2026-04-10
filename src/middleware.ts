import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth", "/unauthorized", "/monitoring"];
const REQUIRED_ORG = process.env.S8_REQUIRED_ORG || "solution8-com";
const ENFORCE_GITHUB_ORG = process.env.S8_ENFORCE_GITHUB_ORG !== "false";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function authLog(event: string, details: Record<string, unknown>) {
  console.log(`[AUTH] ${event}`, JSON.stringify(details));
}

function wantsJson(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  return request.nextUrl.pathname.startsWith("/api") || accept.includes("application/json");
}

function handleUnauthorized(request: NextRequest, reason: string, tokenInfo?: Record<string, unknown>) {
  const { pathname } = request.nextUrl;
  const jsonResponse = { error: "unauthorized", reason };
  const responseType = wantsJson(request) ? "json" : "redirect";

  authLog("UNAUTHORIZED", {
    reason,
    path: pathname,
    method: request.method,
    responseType,
    token: tokenInfo ?? null,
    referer: request.headers.get("referer") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (responseType === "json") {
    return NextResponse.json(jsonResponse, { status: 401 });
  }

  const url = new URL("/unauthorized", request.url);
  return NextResponse.redirect(url, { status: 302 });
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
  const sessionCookie = allCookies.find((cookie) => cookie.name.includes("session-token"));
  const sessionCookieName = sessionCookie?.name?.replace(/\.\d+$/, "");
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_JWT_SECRET;

  let token = await getToken({
    req: request,
    secret: secret,
    cookieName: sessionCookieName,
    secureCookie: sessionCookieName?.startsWith("__Secure-"),
  });

  if (!token) {
    token = await getToken({ req: request, secret });
  }

  if (!token) {
    return handleUnauthorized(request, "NO_TOKEN", {
      cookies: allCookies.map((cookie) => cookie.name),
      sessionCookieName: sessionCookieName ?? null,
    });
  }

  if (ENFORCE_GITHUB_ORG && token.org !== REQUIRED_ORG) {
    return handleUnauthorized(request, "WRONG_ORG", {
      tokenOrg: token.org ?? null,
      requiredOrg: REQUIRED_ORG,
      username: token.username ?? token.name ?? null,
    });
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
