"use server";

import { randomUUID } from "node:crypto";
import { requireHousehold } from "@/household/guards";
import { createClient } from "@/shared/lib/supabase/server";
import { extractReceiptWithGemini } from "./gemini";
import { itemsMatchTotal, type ExtractedReceipt } from "./types";

// ~2MB de imagen real (base64 agrega ~33%). El cliente comprime a ~150-300KB,
// esto es solo un guard contra payloads anómalos.
const MAX_BASE64_LENGTH = 3_000_000;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AnalyzeReceiptResult = {
  error?: string;
  receipt?: ExtractedReceipt;
  /** Ruta en el bucket `receipts` — puede faltar si el upload falló. */
  imagePath?: string;
  itemsMatchTotal?: boolean;
};

/**
 * Analiza la foto de una boleta: extrae total/comercio/fecha/ítems con IA y
 * guarda la imagen como comprobante. La foto se sube AUNQUE la extracción
 * falle (el usuario puede cargar el gasto a mano con la boleta adjunta).
 */
export async function analyzeReceipt(
  imageBase64: string,
  mimeType: string
): Promise<AnalyzeReceiptResult> {
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { household } = auth;

  if (!ALLOWED_MIME.has(mimeType)) {
    return { error: "El archivo debe ser una imagen (JPG, PNG o WebP)" };
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return { error: "La imagen es demasiado grande — probá con una foto más liviana" };
  }

  // Extracción y upload en paralelo: no dependen entre sí.
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${household.id}/${randomUUID()}.${ext}`;

  const [receipt, uploadResult] = await Promise.all([
    extractReceiptWithGemini(imageBase64, mimeType),
    (async () => {
      const supabase = await createClient();
      return supabase.storage
        .from("receipts")
        .upload(path, Buffer.from(imageBase64, "base64"), { contentType: mimeType });
    })(),
  ]);

  const imagePath = uploadResult.error ? undefined : path;
  if (uploadResult.error) {
    console.warn("[receipts] upload_failed", { message: uploadResult.error.message });
  }

  if (!receipt) {
    return {
      error:
        "No pudimos leer la boleta — probá con una foto más nítida y derecha, o cargá el gasto a mano.",
      imagePath,
    };
  }

  return {
    receipt,
    imagePath,
    itemsMatchTotal: itemsMatchTotal(receipt.items, receipt.total),
  };
}
