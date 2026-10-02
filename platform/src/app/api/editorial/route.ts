import { json, supabase } from "@/lib/server";
import { config } from "@/lib/config";
import { defaultEditorial, editorialSchema } from "@/lib/cinematic";
import { defaultExperience } from "@/lib/experience";
export async function GET() {
  const safe = {
    ...defaultEditorial,
    experience: {
      ...defaultExperience,
      gateway_film: "evening" as const,
      store_film: "tea" as const,
      club_film: "evening" as const,
    },
    invitation_enabled: false,
    active_film: "poster-only" as const,
  };
  try {
    if (!config().local) return json(safe);
    const { data, error } = await supabase().rpc("v25_editorial_public");
    const parsed = editorialSchema.safeParse(data);
    return json(
      !error && parsed.success
        ? {
            ...parsed.data,
            experience: parsed.data.experience || defaultExperience,
          }
        : safe,
    );
  } catch {
    return json(safe);
  }
}
