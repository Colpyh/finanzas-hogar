import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/shared/lib/supabase/service";
import { parseBciEmail } from "@/email-inbound/parser";
import { htmlToText } from "@/email-inbound/html-to-text";
import { normalizeInboundPayload } from "@/email-inbound/webhook/inbound";
import { sendPushToHousehold } from "@/shared/lib/push";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ householdId: string }> }
) {
  const { householdId } = await params;
  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("secret") ?? "";
  const expectedSecret = process.env.WEBHOOK_SECRET ?? "";

  // 1. Constant-time secret comparison
  if (
    expectedSecret.length === 0 ||
    providedSecret.length !== expectedSecret.length ||
    !timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret)
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Payload size guard (1MB) before JSON.parse
  const raw = await req.text();
  if (raw.length > 1_000_000) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  // 3. Parse and validate Postmark shape
  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, skipped: "parse_error" });
  }

  // Acepta Postmark y CloudMailin — normalizados a una forma común
  const payload = normalizeInboundPayload(jsonBody);
  if (!payload) {
    return NextResponse.json({ ok: true, skipped: "parse_error" });
  }

  const svc = createServiceClient();

  // 4. Household must exist
  const { data: hh } = await svc
    .from("household")
    .select("id")
    .eq("id", householdId)
    .maybeSingle();

  if (!hh) {
    return NextResponse.json({ ok: true, skipped: "unknown_household" });
  }

  // 5. Only BCI emails proceed (200 OK so the provider doesn't retry)
  if (!payload.from.toLowerCase().includes("bci.cl")) {
    return NextResponse.json({ ok: true, skipped: "not_bci" });
  }

  // 6. Idempotency via SHA-256(MessageID)
  const messageId =
    payload.messageId ??
    `${payload.from}:${payload.subject}:${payload.date ?? ""}`;
  const payloadHash = createHash("sha256").update(messageId).digest("hex");

  const { data: existing } = await svc
    .from("pending_expense")
    .select("id")
    .eq("payload_hash", payloadHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: "duplicate",
      pendingId: existing.id,
    });
  }

  // 7. Parse BCI email. Texto plano si viene; si no, HTML convertido — el
  // correo ORIGINAL de BCI (reenvío por filtro de Gmail) es HTML-only.
  const parsedEmail = parseBciEmail(
    payload.textBody ?? htmlToText(payload.htmlBody ?? "")
  );

  if (!parsedEmail) {
    // BCI manda muchos tipos de correo (transferencias, avisos, estados de
    // cuenta). Si no parseó como compra Y el asunto tampoco es de compra,
    // descartarlo — guardarlo solo generaba pendientes vacíos ("—") en la UI.
    // Si el asunto SÍ es de compra pero no parseó, se guarda igual: es la
    // señal de que BCI cambió el formato del correo.
    if (!payload.subject.toLowerCase().includes("uso de tu tarjeta")) {
      return NextResponse.json({ ok: true, skipped: "not_purchase" });
    }
    console.warn("[email-inbound] parse_failed", {
      householdId,
      provider: payload.provider,
      from: payload.from,
      subject: payload.subject,
      hasTxt: !!payload.textBody,
      hasHtml: !!payload.htmlBody,
    });
  }

  // 8. INSERT pending_expense (even if parse failed — row is still useful for inspection)
  const { data: inserted, error } = await svc
    .from("pending_expense")
    .insert({
      household_id: householdId,
      // El JSON original del proveedor (no el normalizado) — para inspección
      raw_payload: jsonBody,
      payload_hash: payloadHash,
      parsed_amount: parsedEmail?.amount?.toString() ?? null,
      parsed_currency: parsedEmail ? "CLP" : null,
      parsed_date: parsedEmail?.date ?? null,
      parsed_time: parsedEmail?.time ?? null,
      parsed_merchant: parsedEmail?.merchant ?? null,
      parsed_card_last4: parsedEmail?.cardLast4 ?? null,
      parsed_source: parsedEmail ? "bci" : "unknown",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    // Do NOT leak raw payload in logs
    console.error("[email-inbound] insert failed", {
      householdId,
      code: error.code,
    });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Fire-and-forget: push notification to all household members
  sendPushToHousehold(householdId, {
    title: "Nuevo gasto detectado",
    body: `$${parsedEmail?.amount?.toLocaleString("es-CL") ?? "?"} en ${parsedEmail?.merchant ?? "comercio desconocido"}`,
    url: "/gastos-pendientes",
  }).catch(() => {
    console.warn("[email-inbound] push_failed", { householdId });
  });

  console.info("[email-inbound] processed", {
    householdId,
    pendingId: inserted.id,
    parsed: !!parsedEmail,
  });

  return NextResponse.json({ ok: true, pendingId: inserted.id });
}
