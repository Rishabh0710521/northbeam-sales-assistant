import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/webhooks") || path === "/privacy") return NextResponse.next();

  const cron = request.headers.get("x-cron-secret");
  if (cron && cron === process.env.CRON_SECRET) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (process.env.DASHBOARD_PASSWORD && password === process.env.DASHBOARD_PASSWORD) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Sales assistant"' }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};