import { failure, json, supabase } from "@/lib/server";
export async function GET() {
  try {
    const { data, error } = await supabase().rpc("v25_platform_catalogue");
    if (error) throw error;
    const { data: plans } = await supabase()
      .from("v25_membership_plans")
      .select("*")
      .order("fee_rappen");
    const { data: delivery } = await supabase().rpc("v25_platform_options");
    return json({ products: data, plans, delivery });
  } catch (e) {
    return failure(e);
  }
}
