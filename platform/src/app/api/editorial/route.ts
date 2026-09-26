import { json, supabase } from "@/lib/server";
import { config } from "@/lib/config";
import { defaultEditorial, editorialSchema } from "@/lib/cinematic";
export async function GET() {
  const safe = {
    ...defaultEditorial,
    invitation_enabled: false,
    active_film: "poster-only" as const,
  };
  try {
    if (!config().local) return json(safe);
    const { data, error } = await supabase().rpc("v25_editorial_public");
    const parsed = editorialSchema.safeParse(data);
    return json(!error && parsed.success ? parsed.data : safe);
  } catch {
    return json(safe);
  }
}
