import { assertPublicKey } from "./src/public-config";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (env.VITE_SUPABASE_PUBLISHABLE_KEY)
    assertPublicKey(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (
    Boolean(env.VITE_SUPABASE_URL) !==
    Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY)
  )
    throw new Error("Set both public backend values together.");
  const url = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL) : null;
  if (
    url &&
    (url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" &&
        !["localhost", "127.0.0.1"].includes(url.hostname)))
  )
    throw new Error("Expected an exact HTTPS Supabase origin");
  const origin = url?.origin || "";
  const csp = `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: ${origin}; font-src 'self'; connect-src 'self' ${origin}; base-uri 'none'; object-src 'none'; form-action 'none'`;
  return {
    base: "/adminpage/",
    build: { outDir: "dist/adminpage", emptyOutDir: true, sourcemap: false },
    plugins: [
      {
        name: "v25-csp",
        transformIndexHtml(html) {
          return html.replace(
            "<head>",
            `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`,
          );
        },
      },
    ],
  };
});
