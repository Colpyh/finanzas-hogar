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

function validateImage(imageBase64: string, mimeType: string): string | undefined {
  if (!ALLOWED_MIME.has(mimeType)) {
    return "El archivo debe ser una imagen (JPG, PNG o WebP)";
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return "La imagen es demasiado grande — probá con una foto más liviana";
  }
  return undefined;
}

async function uploadToReceiptsBucket(
  householdId: string,
  imageBase64: string,
  mimeType: string
): Promise<{ path?: string; error?: string }> {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const path = `${householdId}/${randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, Buffer.from(imageBase64, "base64"), { contentType: mimeType });
  if (error) return { error: error.message };
  return { path };
}

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

  const validationError = validateImage(imageBase64, mimeType);
  if (validationError) return { error: validationError };

  // Extracción y upload en paralelo: no dependen entre sí.
  const [receipt, uploadResult] = await Promise.all([
    extractReceiptWithGemini(imageBase64, mimeType),
    uploadToReceiptsBucket(household.id, imageBase64, mimeType),
  ]);

  const imagePath = uploadResult.path;
  if (uploadResult.error) {
    console.warn("[receipts] upload_failed", { message: uploadResult.error });
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

export type UploadReceiptImageResult = { error?: string; imagePath?: string };

/**
 * Sube una imagen simple de respaldo para una compra (sin extracción con IA).
 * A diferencia de `analyzeReceipt`, si el upload falla es un error duro — no
 * hay ítems ni total que rescatar, la imagen ES el resultado.
 */
export async function uploadReceiptImage(
  imageBase64: string,
  mimeType: string
): Promise<UploadReceiptImageResult> {
  const auth = await requireHousehold();
  if (!auth.ok) return { error: auth.error };
  const { household } = auth;

  const validationError = validateImage(imageBase64, mimeType);
  if (validationError) return { error: validationError };

  const result = await uploadToReceiptsBucket(household.id, imageBase64, mimeType);
  if (result.error || !result.path) {
    return { error: "No se pudo subir la imagen — probá de nuevo." };
  }
  return { imagePath: result.path };
}
