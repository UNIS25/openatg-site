import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { safeInteger } from "./domain";
export type QrInvoice = {
  reference: string;
  amount_rappen: number;
  order_id: string;
  name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  expires_at: string;
};
// Published SIX sample account, never a merchant account. Local test output only.
const TEST_IBAN = "CH4431999123000889012";
export function rfValid(reference: string) {
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(reference)) return false;
  const moved = reference.slice(4) + reference.slice(0, 4);
  let rest = 0;
  for (const c of moved) {
    for (const n of /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c)
      rest = (rest * 10 + Number(n)) % 97;
  }
  return rest === 1;
}
export function rfReference(digits: string) {
  if (!/^\d{1,21}$/.test(digits)) throw new Error("Invalid reference");
  let remainder = 0;
  for (const n of digits + "271500")
    remainder = (remainder * 10 + Number(n)) % 97;
  return `RF${String(98 - remainder).padStart(2, "0")}${digits}`;
}
const clean = (s: string) => {
  if (!s || s.length > 100 || /[\r\n]/.test(s))
    throw new Error("Invalid QR field");
  return s;
};
export function qrPayload(invoice: QrInvoice) {
  safeInteger(invoice.amount_rappen, 1);
  if (!rfValid(invoice.reference))
    throw new Error("Invalid reference checksum");
  // SCOR requires a regular IBAN, not QR-IBAN. Use the SIX regular-IBAN sample.
  const iban = "CH9300762011623852957";
  return [
    "SPC",
    "0200",
    "1",
    iban,
    "S",
    "TEST — NOT PAYABLE",
    "Teststrasse",
    "1",
    "8000",
    "Zürich",
    "CH",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `${Math.floor(invoice.amount_rappen / 100)}.${String(invoice.amount_rappen % 100).padStart(2, "0")}`,
    "CHF",
    "S",
    clean(invoice.name),
    clean(invoice.street),
    clean(invoice.house_number),
    clean(invoice.postal_code),
    clean(invoice.city),
    "CH",
    "SCOR",
    invoice.reference,
    "TEST - NOT PAYABLE",
    "EPD",
  ].join("\r\n");
}
export async function createTestBill(invoice: QrInvoice): Promise<Buffer> {
  const qr = await QRCode.toBuffer(qrPayload(invoice), {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 600,
  });
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: "TEST — NOT PAYABLE · Varathans25",
        Author: "Varathans25 local review",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(25).fillColor("#9D3842").text("TEST — NOT PAYABLE");
    doc
      .moveDown()
      .fontSize(12)
      .fillColor("#1B3F63")
      .text("Varathans25 · local payment-adapter review");
    doc.text(`Reference: ${invoice.reference}`);
    doc.text(`Order / membership: ${invoice.order_id}`);
    doc.text(`Expires: ${invoice.expires_at.slice(0, 10)}`);
    doc
      .moveDown()
      .text(
        "No payment is requested. This sample is not a production QR-bill.",
      );
    doc.text("Creditor: TEST ONLY · Teststrasse 1 · 8000 Zürich · CH");
    doc.text("SIX sample regular IBAN: CH93 0076 2011 6238 5295 7");
    doc.moveDown().text(`CHF ${(invoice.amount_rappen / 100).toFixed(2)}`);
    doc.text(
      `${invoice.name}\n${invoice.street} ${invoice.house_number}\n${invoice.postal_code} ${invoice.city}\nCH`,
    );
    doc.image(qr, 40, 360, { width: 180 });
    doc.fontSize(10).text("TEST — NOT PAYABLE", 40, 550);
    doc.text(
      "Production requires approved creditor data, bank acceptance and certified layout validation.",
    );
    doc.end();
  });
}
export interface HostedPaymentAdapter {
  kind: "payrexx" | "twint" | "hosted-card" | "membership";
  approved: boolean;
  createSession(orderId: string): Promise<{ redirectUrl: string }>;
}
export class DisabledHostedAdapter implements HostedPaymentAdapter {
  approved = false;
  constructor(public kind: HostedPaymentAdapter["kind"]) {}
  async createSession(): Promise<{ redirectUrl: string }> {
    throw new Error("Provider approval and encrypted credentials required");
  }
}
void TEST_IBAN; // Documents the distinction: this QR-IBAN must not be used with SCOR.
