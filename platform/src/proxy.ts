import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
  const h = new Headers(request.headers);
  h.set("x-nonce", nonce);
  h.set("Content-Security-Policy", csp);
  const host = request.headers.get("host");
  let response: NextResponse;
  if (host === "admin.varathans25.ch" && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/de/admin";
    response = NextResponse.rewrite(url, { request: { headers: h } });
  } else response = NextResponse.next({ request: { headers: h } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|varathans25/|favicon.ico).*)"],
};
