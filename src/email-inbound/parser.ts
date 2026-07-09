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

  // Las etiquetas se anclan al INICIO de línea (flag m): el cuerpo real trae
  // frases como "*compra en comercio nacional *" ANTES de los datos, y un
  // regex suelto enganchaba esa palabra "comercio" devolviendo basura.
  // `[ \t:]*` acepta ambos formatos de BCI: "Monto: $4.000" (con dos puntos,
  // formato abr-2026) y "Monto $3.500" (sin dos puntos, formato jul-2026).
  // El anclaje también excluye variantes de otros correos del banco como
  // "Monto transferido $..." o "Fecha de abono ..." (transferencias).

  // Amount: $X.XXX (BCI uses dots as thousands sep, no decimals on debit)
  const amountMatch = text.match(/^[ \t]*Monto[ \t:]*\$[ \t]*([\d.]+)(?:,(\d{1,2}))?/im);
  if (!amountMatch || !amountMatch[1]) return null;
  const intPart = amountMatch[1].replace(/\./g, "");
  const decPart = amountMatch[2] ?? "";
  const amount = decPart
    ? Number(`${intPart}.${decPart}`)
    : Number(intPart);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Date: DD/MM/YYYY → YYYY-MM-DD
  const dateMatch = text.match(/^[ \t]*Fecha[ \t:]*(\d{2})\/(\d{2})\/(\d{4})/im);
  if (!dateMatch) return null;
  const dd = dateMatch[1];
  const mm = dateMatch[2];
  const yyyy = dateMatch[3];
  if (!dd || !mm || !yyyy) return null;
  const date = `${yyyy}-${mm}-${dd}`;

  // Time: HH:MM
  const timeMatch = text.match(/^[ \t]*Hora[ \t:]*(\d{2}:\d{2})/im);
  if (!timeMatch || !timeMatch[1]) return null;
  const time = timeMatch[1];

  // Merchant: resto de la línea que EMPIEZA con "Comercio"
  const merchantMatch = text.match(/^[ \t]*Comercio[ \t:]+([^\n]+)/im);
  if (!merchantMatch || !merchantMatch[1]) return null;
  const merchant = merchantMatch[1].trim().replace(/\s+/g, " ");
  if (!merchant) return null;

  // Card last 4: ****NNNN
  const last4Match = text.match(/\*{4}\s*(\d{4})/);
  if (!last4Match || !last4Match[1]) return null;
  const cardLast4 = last4Match[1];

  return { amount, date, time, merchant, cardLast4 };
}
