import { createClient } from "@supabase/supabase-js";
if (
  process.env.PLATFORM_ENV !== "local" ||
  process.env.SUPABASE_URL !== "http://127.0.0.1:58531"
)
  throw new Error("Local review only");
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const { data, error } = await db.rpc("v25_platform_retention");
if (error) throw new Error(error.code);
console.log(data);
