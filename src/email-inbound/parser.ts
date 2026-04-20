export type ParsedBciEmail = {
  amount: number; // CLP integer (BCI doesn't use decimals on debit)
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  merchant: string;
  cardLast4: string;
};

/**
 * Parses a BCI debit notification email. Input is the TextBody from Postmark
 * (preferred over HtmlBody because plain text is more resilient to template
 * changes). Returns null if ANY required field fails to parse — the caller
 * treats a null as parsedSource='unknown' and still stores the row.
 */
export function parseBciEmail(body: string): ParsedBciEmail | null {
  if (!body) return null;

  // Normalize line endings
  const text = body.replace(/\r\n/g, "\n");

  // Amount: "Monto" label followed by $X.XXX (BCI uses dots as thousands sep, no decimals)
  const amountMatch = text.match(/Monto[^\n$]*\$?\s*([\d.]+)(?:,(\d{1,2}))?/i);
  if (!amountMatch || !amountMatch[1]) return null;
  const intPart = amountMatch[1].replace(/\./g, "");
  const decPart = amountMatch[2] ?? "";
  const amount = decPart
    ? Number(`${intPart}.${decPart}`)
    : Number(intPart);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Date: "Fecha" label, DD/MM/YYYY → YYYY-MM-DD
  const dateMatch = text.match(/Fecha[^\n]*?(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!dateMatch) return null;
  const dd = dateMatch[1];
  const mm = dateMatch[2];
  const yyyy = dateMatch[3];
  if (!dd || !mm || !yyyy) return null;
  const date = `${yyyy}-${mm}-${dd}`;

  // Time: "Hora" label, HH:MM
  const timeMatch = text.match(/Hora[^\n]*?(\d{2}:\d{2})/i);
  if (!timeMatch || !timeMatch[1]) return null;
  const time = timeMatch[1];

  // Merchant: "Comercio" label, take the rest of the row, trim
  const merchantMatch = text.match(/Comercio[^\n:]*[:\s]+([^\n]+)/i);
  if (!merchantMatch || !merchantMatch[1]) return null;
  const merchant = merchantMatch[1].trim().replace(/\s+/g, " ");
  if (!merchant) return null;

  // Card last 4: ****NNNN
  const last4Match = text.match(/\*{4}\s*(\d{4})/);
  if (!last4Match || !last4Match[1]) return null;
  const cardLast4 = last4Match[1];

  return { amount, date, time, merchant, cardLast4 };
}
