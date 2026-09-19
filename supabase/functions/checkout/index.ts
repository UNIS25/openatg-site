import { headers, response } from "../_shared/http.ts";
// Deliberate external boundary. No approved provider is supplied. Never create a
// pretend payment, collect customer data, or treat the display age gate as ID proof.
// Install a reviewed payment/age-provider adapter here before enabling payments.
// It must verify provider webhooks, then call the service-only transactional RPCs.
Deno.serve((request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== "POST")
    return response(request, 405, { error: "Method not allowed" });
  return response(request, 503, { error: "PAYMENT_PROVIDER_NOT_CONFIGURED" });
});
