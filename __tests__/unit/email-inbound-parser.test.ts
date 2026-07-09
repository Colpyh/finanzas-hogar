/**
 * Tests for parseBciEmail()
 * Covers spec scenarios 2.1–2.11
 */
import { parseBciEmail } from "@/email-inbound/parser";

// Sanitized fixture based on real BCI debit notification
const BCI_TEXT_FIXTURE = `
Número tarjeta débito: ****5616
Monto: $4.000
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: MUNICH
`;

const BCI_TEXT_SMALL_AMOUNT = `
Número tarjeta débito: ****5616
Monto: $850
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: MUNICH
`;

const BCI_TEXT_LARGE_AMOUNT = `
Número tarjeta débito: ****5616
Monto: $1.234.567
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: SUPERMARKET SA
`;

// Formato REAL de BCI (jul 2026): sin dos puntos, con asteriscos de énfasis
// y la línea "*compra en comercio nacional *" ANTES de los datos — la palabra
// "comercio" ahí enganchaba el regex viejo y devolvía basura como merchant.
const BCI_TEXT_2026_FORMAT = `
Hola
*NOMBRE APELLIDO USUARIO*
Realizaste un(a)
*compra en comercio nacional *
con tu * tarjeta de débito*.
Número tarjeta débito ****5616
Monto $3.500
Fecha 03/07/2026
Hora 21:28 horas
Comercio ALMACEN EL SOL
Si no quieres recibir notificaciones en tu correo electrónico puedes
modificar tus preferencias en *Bci.cl*.
`;

// Mismo formato pero reenviado manualmente desde Gmail (wrapper Fwd)
const BCI_TEXT_2026_FORWARDED = `---------- Forwarded message ---------
De: <contacto@bci.cl>
Date: vie, 3 jul 2026 a las 21:28
Subject: Notificación de uso de tu tarjeta de débito
To: <usuario@gmail.com>


Hola
*NOMBRE APELLIDO USUARIO*
Realizaste un(a)
*compra en comercio nacional *
con tu * tarjeta de débito*.
Número tarjeta débito ****5616
Monto $1.690
Fecha 04/07/2026
Hora 13:28 horas
Comercio MERCADOPAGO*CONV
`;

// Correo de BCI que NO es compra (transferencia programada) — debe dar null:
// tiene "Monto transferido" y "Fecha de abono" pero no las etiquetas de compra.
const BCI_TRANSFER_EMAIL = `
Hola
*NOMBRE APELLIDO USUARIO*
Realizaste una *transferencia de fondos programada * desde tu cuenta N°
*12345678*

*Datos de tu transferencia*
Monto transferido $5.000
Nombre del destinatario Fintual Agf S
Banco de destino BANCO SECURITY
Fecha de abono 05/07/2026
Número de comprobante 1195244383
`;

describe("parseBciEmail", () => {
  // Scenario 2.1 — $4.000 → 4000
  it("parses amount '$4.000' as 4000", () => {
    const result = parseBciEmail(BCI_TEXT_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(4000);
  });

  // Scenario 2.2 — $850 → 850
  it("parses amount '$850' as 850", () => {
    const result = parseBciEmail(BCI_TEXT_SMALL_AMOUNT);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(850);
  });

  // Scenario 2.3 — $1.234.567 → 1234567
  it("parses amount '$1.234.567' as 1234567", () => {
    const result = parseBciEmail(BCI_TEXT_LARGE_AMOUNT);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234567);
  });

  // Scenario 2.4 — date DD/MM/YYYY → YYYY-MM-DD
  it("converts date '19/04/2026' to '2026-04-19'", () => {
    const result = parseBciEmail(BCI_TEXT_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.date).toBe("2026-04-19");
  });

  // Scenario 2.5 — time "09:53 horas" → "09:53"
  it("parses time '09:53 horas' as '09:53'", () => {
    const result = parseBciEmail(BCI_TEXT_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.time).toBe("09:53");
  });

  // Scenario 2.6 — merchant
  it("parses merchant 'MUNICH'", () => {
    const result = parseBciEmail(BCI_TEXT_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.merchant).toBe("MUNICH");
  });

  // Scenario 2.7 — cardLast4 "****5616" → "5616"
  it("parses cardLast4 '****5616' as '5616'", () => {
    const result = parseBciEmail(BCI_TEXT_FIXTURE);
    expect(result).not.toBeNull();
    expect(result!.cardLast4).toBe("5616");
  });

  // Scenario 2.8 — source is always 'bci' on successful parse
  // Note: parseBciEmail returns ParsedBciEmail without source field (source is implied)
  it("returns all required fields on valid input", () => {
    const result = parseBciEmail(BCI_TEXT_FIXTURE);
    expect(result).not.toBeNull();
    expect(result).toEqual({
      amount: 4000,
      date: "2026-04-19",
      time: "09:53",
      merchant: "MUNICH",
      cardLast4: "5616",
    });
  });

  // Formato real 2026 (sin dos puntos, con asteriscos y preámbulo)
  describe("formato BCI 2026 (sin dos puntos)", () => {
    it("parses the real 2026 body and does NOT grab 'comercio nacional' as merchant", () => {
      const result = parseBciEmail(BCI_TEXT_2026_FORMAT);
      expect(result).toEqual({
        amount: 3500,
        date: "2026-07-03",
        time: "21:28",
        merchant: "ALMACEN EL SOL",
        cardLast4: "5616",
      });
    });

    it("parses a manually forwarded body (Fwd wrapper)", () => {
      const result = parseBciEmail(BCI_TEXT_2026_FORWARDED);
      expect(result).toEqual({
        amount: 1690,
        date: "2026-07-04",
        time: "13:28",
        merchant: "MERCADOPAGO*CONV",
        cardLast4: "5616",
      });
    });

    it("returns null for a BCI transfer email (Monto transferido / Fecha de abono)", () => {
      expect(parseBciEmail(BCI_TRANSFER_EMAIL)).toBeNull();
    });
  });

  // Scenario 2.9 — non-BCI HTML → null
  it("returns null for non-BCI content", () => {
    const result = parseBciEmail("This is a promotional email from another bank");
    expect(result).toBeNull();
  });

  // Scenario 2.10 — empty string → null
  it("returns null for empty string", () => {
    expect(parseBciEmail("")).toBeNull();
  });

  // Scenario 2.11 — missing field → null
  it("returns null when amount is missing", () => {
    const body = `
Número tarjeta débito: ****5616
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: MUNICH
`;
    expect(parseBciEmail(body)).toBeNull();
  });

  it("returns null when date is missing", () => {
    const body = `
Número tarjeta débito: ****5616
Monto: $4.000
Hora: 09:53 horas
Comercio: MUNICH
`;
    expect(parseBciEmail(body)).toBeNull();
  });

  it("returns null when merchant is missing", () => {
    const body = `
Número tarjeta débito: ****5616
Monto: $4.000
Fecha: 19/04/2026
Hora: 09:53 horas
`;
    expect(parseBciEmail(body)).toBeNull();
  });

  it("returns null when card last4 is missing", () => {
    const body = `
Monto: $4.000
Fecha: 19/04/2026
Hora: 09:53 horas
Comercio: MUNICH
`;
    expect(parseBciEmail(body)).toBeNull();
  });

  it("handles extra whitespace gracefully", () => {
    const body = `
  Número  tarjeta  débito:   ****5616
  Monto:   $4.000
  Fecha:   19/04/2026
  Hora:    09:53  horas
  Comercio:   MUNICH
`;
    const result = parseBciEmail(body);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(4000);
    expect(result!.cardLast4).toBe("5616");
  });

  it("never returns a partial object", () => {
    // Missing time field — should return null, not partial
    const body = `
Número tarjeta débito: ****5616
Monto: $4.000
Fecha: 19/04/2026
Comercio: MUNICH
`;
    const result = parseBciEmail(body);
    // Either null or complete — never partial
    if (result !== null) {
      expect(result).toHaveProperty("amount");
      expect(result).toHaveProperty("date");
      expect(result).toHaveProperty("time");
      expect(result).toHaveProperty("merchant");
      expect(result).toHaveProperty("cardLast4");
    }
  });
});
