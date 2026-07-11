/**
 * Conversión HTML→texto para correos que solo traen parte HTML (el correo
 * ORIGINAL de BCI, que llega así vía el reenvío por filtro de Gmail).
 *
 * Imita cómo un browser "lee" la tabla del banco: los saltos de línea crudos
 * del HTML NO son estructura (se normalizan a espacio); los límites reales
 * son los tags de bloque. Clave para el parser: `</td>` se convierte en
 * ESPACIO — así `<td>Monto</td><td>$10.000</td>` queda "Monto $10.000" en
 * UNA línea, que es lo que esperan los regex anclados de parseBciEmail.
 */
export function htmlToText(html: string): string {
  if (!html) return "";

  return (
    html
      // fuera style/script con su contenido
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      // whitespace crudo del fuente = espacio (como lo trata un browser)
      .replace(/[\r\n\t]+/g, " ")
      // celdas: etiqueta y valor quedan en la misma línea
      .replace(/<\/t[dh]>/gi, " ")
      // límites de bloque = salto de línea
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(tr|p|div|table|h[1-6]|li|ul|ol)>/gi, "\n")
      // resto de tags, fuera
      .replace(/<[^>]+>/g, "")
      // entidades comunes (suficiente para los correos del banco)
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&aacute;/gi, "á")
      .replace(/&eacute;/gi, "é")
      .replace(/&iacute;/gi, "í")
      .replace(/&oacute;/gi, "ó")
      .replace(/&uacute;/gi, "ú")
      .replace(/&ntilde;/gi, "ñ")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      // colapsar espacios dentro de cada línea
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n")
  );
}
