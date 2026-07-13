/**
 * Extrae el texto de un PDF (posiblemente cifrado) EN EL NAVEGADOR con la
 * contraseña del usuario. La clave y el PDF nunca salen del dispositivo: al
 * servidor solo viaja el texto ya extraído. pdfjs-dist se importa de forma
 * dinámica para no pesar en el bundle salvo cuando se usa esta función.
 */
export class WrongPasswordError extends Error {
  constructor() {
    super("wrong_password");
    this.name = "WrongPasswordError";
  }
}

export async function extractPdfText(file: File, password: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;

  const data = new Uint8Array(await file.arrayBuffer());

  const loadingTask = pdfjs.getDocument({ data, password });
  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (err: unknown) {
    // pdf.js lanza PasswordException si falta o no coincide la contraseña.
    if (err && typeof err === "object" && (err as { name?: string }).name === "PasswordException") {
      throw new WrongPasswordError();
    }
    throw err;
  }

  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  await loadingTask.destroy();
  return parts.join("\n");
}
