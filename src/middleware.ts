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

function handleUnauthorized(request: NextRequest, reason: string, tokenInfo?: Record<string, unknown>) {
  const { pathname } = request.nextUrl;
  authLog("UNAUTHORIZED_REDIRECT", {
    reason,
    path: pathname,
    method: request.method,
    token: tokenInfo ?? null,
    referer: request.headers.get("referer") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

  if (!token) {
    return handleUnauthorized(request, "NO_TOKEN");
  }

  if (ENFORCE_GITHUB_ORG && token.org !== REQUIRED_ORG) {
    return handleUnauthorized(request, "WRONG_ORG", {
      tokenOrg: token.org ?? null,
      requiredOrg: REQUIRED_ORG,
      username: token.username ?? token.name ?? null,
    });
  }

  // Rewrite .prompt.md and .prompt.yml requests to the raw API route
  if (pathname.startsWith("/prompts/") && (pathname.endsWith(".prompt.md") || pathname.endsWith(".prompt.yml"))) {
    const id = pathname.slice("/prompts/".length);
    const url = request.nextUrl.clone();
    url.pathname = `/api/prompts/${id}/raw`;
    return NextResponse.rewrite(url);
  }

  // Add pathname header for layout detection
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
