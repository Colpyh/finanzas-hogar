/**
 * Reduce una foto a un máximo de lado y la recomprime a JPEG — liviana para
 * subir y almacenar. Usada tanto por el escaneo de boleta con IA (necesita
 * legibilidad, 1280px/0.82) como por adjuntar una imagen simple de respaldo
 * (no se lee texto, alcanza con menos: 1000px/0.72).
 */
export async function compressImage(
  file: File,
  opts: { maxSize?: number; quality?: number } = {}
): Promise<{ base64: string; dataUrl: string }> {
  const { maxSize = 1280, quality = 0.82 } = opts;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { base64: dataUrl.split(",")[1] ?? "", dataUrl };
}
