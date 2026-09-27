import { failure, json, supabase } from "@/lib/server";
import { defaultPolish, polishSchema } from "@/lib/polish";
export async function GET() {
  try {
    const { data, error } = await supabase().rpc("v25_platform_catalogue");
    if (error) throw error;
    const { data: plans } = await supabase()
      .from("v25_membership_plans")
      .select("*")
      .order("fee_rappen");
    const { data: delivery } = await supabase().rpc("v25_platform_options");
    const { data: settings } = await supabase().rpc("v25_polish_public");
    const parsed = polishSchema.safeParse(settings);
    return json({
      products: data,
      plans,
      delivery,
      polish: parsed.success ? parsed.data : defaultPolish,
    });
  } catch (e) {
    return failure(e);
  }
}
