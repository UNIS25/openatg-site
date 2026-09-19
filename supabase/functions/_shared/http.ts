export function headers(request: Request) {
  const origin = Deno.env.get("STORE_ORIGIN") ?? "https://openatg.com";
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    ...(request.headers.get("origin") === origin
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers":
            "authorization, apikey, content-type, x-client-info",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        }
      : {}),
  };
}
export function response(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: headers(request),
  });
}
