"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { importCartola } from "@/cartola/actions";

const MAX_BYTES = 3.7 * 1024 * 1024; // el server acepta 4mb de body

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:application/pdf;base64,XXXX" → nos quedamos con XXXX
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("read_error"));
    reader.readAsDataURL(file);
  });
}

export function CartolaUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("La cartola debe ser un PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("El PDF es demasiado grande (máx. ~3.5 MB).");
      return;
    }

    setLoading(true);
    try {
      const base64 = await readAsBase64(file);
      const result = await importCartola(base64);
      if (result.error) {
        toast.error(result.error);
      } else {
        const parts: string[] = [`${result.imported ?? 0} importados`];
        if (result.duplicates) parts.push(`${result.duplicates} ya registrados`);
        if (result.nonExpenses) parts.push(`${result.nonExpenses} no-gastos omitidos`);
        toast.success("Cartola procesada", { description: parts.join(" · ") });
        if (result.imported) router.refresh();
      }
    } catch {
      toast.error("No se pudo procesar la cartola. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary border border-primary/30 rounded-[10px] px-3 py-2 hover:bg-primary/5 transition-colors disabled:opacity-60"
      >
        <FileText size={14} />
        {loading ? "Procesando…" : "Subir cartola (PDF)"}
      </button>
    </>
  );
}
