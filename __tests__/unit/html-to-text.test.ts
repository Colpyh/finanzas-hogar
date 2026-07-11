import { htmlToText } from "@/email-inbound/html-to-text";
import { parseBciEmail } from "@/email-inbound/parser";

// Estructura REAL del correo HTML de BCI (reenvío por filtro de Gmail manda
// el original, que NO trae parte text/plain): tabla con <td>Etiqueta</td>
// <td>Valor</td> y saltos de línea crudos dentro de los tags.
const BCI_HTML_FIXTURE = `<!DOCTYPE html>
<html lang="es">
<head>
  <title>Notificaci&oacute;n uso TDD</title>
  <style type="text/css">
    @media(max-width:767px) { .d-block { width: 100%; } }
  </style>
</head>
<body>
  <p>Hola<br><strong>NOMBRE APELLIDO USUARIO</strong></p>
  <p>Realizaste un(a) <strong>compra en comercio nacional</strong> con tu <strong>tarjeta de d&eacute;bito</strong>.</p>
  <table>
    <tr>
      <td class="d-block" width="50%" align="left" style="text-align: right; padding: 8px 15px;">N&uacute;mero tarjeta d&eacute;bito</td>
      <td class="d-block" width="50%" align="left" style="padding: 8px 15px;">****5616</td>
    </tr>
    <tr style="background-color: #ebebec;">
      <td class="d-block" width="50%" align="left" style="text-align: right; padding: 10px 15px;">
        Monto</td>
      <td class="d-block" width="50%" align="left" style="padding: 10px 15px;">
        $10.000</td>
    </tr>
    <tr>
      <td class="d-block" width="50%" align="left" style="text-align: right;padding: 10px 15px;">Fecha
      </td>
      <td class="d-block" width="50%" align="left" style="padding: 10px 15px;">11/07/2026</td>
    </tr>
    <tr style="background-color: #ebebec;">
      <td class="d-block">Hora</td>
      <td class="d-block">12:28 horas</td>
    </tr>
    <tr>
      <td class="d-block">Comercio</td>
      <td class="d-block">ALMACEN EL SOL</td>
    </tr>
  </table>
</body>
</html>`;

describe("htmlToText", () => {
  it("joins <td> label/value pairs on one line and breaks rows", () => {
    const text = htmlToText(BCI_HTML_FIXTURE);
    expect(text).toMatch(/^\s*Monto \$10\.000\s*$/m);
    expect(text).toMatch(/^\s*Fecha 11\/07\/2026\s*$/m);
    expect(text).toMatch(/^\s*Comercio ALMACEN EL SOL\s*$/m);
  });

  it("drops <style> blocks entirely", () => {
    expect(htmlToText(BCI_HTML_FIXTURE)).not.toContain("max-width");
  });

  it("decodes common HTML entities", () => {
    const text = htmlToText(BCI_HTML_FIXTURE);
    expect(text).toContain("Número tarjeta débito");
  });

  it("returns empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });
});

describe("parseBciEmail sobre HTML convertido (correo original de BCI)", () => {
  it("parses the full purchase from the HTML-only email", () => {
    const result = parseBciEmail(htmlToText(BCI_HTML_FIXTURE));
    expect(result).toEqual({
      amount: 10000,
      date: "2026-07-11",
      time: "12:28",
      merchant: "ALMACEN EL SOL",
      cardLast4: "5616",
    });
  });
});
