import { z } from "zod";
const schema = z.object({
  transaction_id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  reference: z.string().regex(/^RF[0-9]{2}[A-Z0-9]{1,21}$/),
  amount_rappen: z.coerce.number().int().positive().max(100000000),
  currency: z.literal("CHF"),
  booked_at: z.iso.date(),
});
export function parseReconciliation(csv: string) {
  if (csv.length > 100000) throw new Error("Import too large");
  const lines = csv.replace(/\r/g, "").trim().split("\n");
  const header = "transaction_id,reference,amount_rappen,currency,booked_at";
  if (lines.shift() !== header || !lines.length || lines.length > 500)
    throw new Error("Invalid bank CSV");
  const seen = new Set<string>();
  return lines.map((line) => {
    const columns = line.split(",");
    if (columns.length !== 5) throw new Error("Invalid bank row");
    const row = schema.parse(
      Object.fromEntries(header.split(",").map((key, i) => [key, columns[i]])),
    );
    if (seen.has(row.transaction_id)) throw new Error("Duplicate bank line");
    seen.add(row.transaction_id);
    return row;
  });
}
