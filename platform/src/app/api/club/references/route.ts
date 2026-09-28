import { z } from "zod";
import { verifiedClubSession } from "@/lib/club-access";
import { referenceLibrary, referenceBrands } from "@/lib/restricted-references";
import { failure, json } from "@/lib/server";

export async function GET(request: Request) {
  try {
    await verifiedClubSession();
    const params = new URL(request.url).searchParams;
    const brand = params.has("brand")
      ? z.enum(referenceBrands).parse(params.get("brand"))
      : undefined;
    return json({ references: referenceLibrary.filter((r) => !brand || r.brand === brand) });
  } catch (error) {
    return failure(error);
  }
}
