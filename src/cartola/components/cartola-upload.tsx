"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importCartola } from "@/cartola/actions";
import { extractPdfText, WrongPasswordError } from "@/cartola/extract-pdf-text";

const MAX_BYTES = 15 * 1024 * 1024; // el PDF no sale del navegador; margen amplio

export function CartolaUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // permitir re-seleccionar el mismo archivo
    if (!picked) return;
    if (picked.type !== "application/pdf") {
      toast.error("La cartola debe ser un PDF.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error("El PDF es demasiado grande.");
      return;
    }
    setPassword("");
    setFile(picked);
  }

  function close() {
    if (loading) return;
    setFile(null);
    setPassword("");
  }

  async function process() {
    if (!file) return;
    setLoading(true);
    try {
      // Descifrado + extracción EN EL NAVEGADOR: la clave nunca sale del celu.
      const text = await extractPdfText(file, password);
      const result = await importCartola(text);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const parts: string[] = [`${result.imported ?? 0} importados`];
      if (result.duplicates) parts.push(`${result.duplicates} ya registrados`);
      if (result.nonExpenses) parts.push(`${result.nonExpenses} no-gastos omitidos`);
      toast.success("Cartola procesada", { description: parts.join(" · ") });
      setFile(null);
      setPassword("");
      if (result.imported) router.refresh();
    } catch (err) {
      if (err instanceof WrongPasswordError) {
        toast.error("Contraseña incorrecta — probá de nuevo.");
      } else {
        toast.error("No se pudo leer la cartola. ¿Es un PDF válido?");
      }
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
        onChange={onPick}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary border border-primary/30 rounded-[10px] px-3 py-2 hover:bg-primary/5 transition-colors"
      >
        <FileText size={14} />
        Subir cartola (PDF)
      </button>

      <Dialog open={file !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña de la cartola</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground leading-snug">
              Las cartolas del BCI vienen protegidas. Ingresá la contraseña — se
              usa solo en tu dispositivo para abrir el PDF, nunca se envía.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cartola-password">Contraseña</Label>
              <Input
                id="cartola-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && password) process();
                }}
                autoFocus
                placeholder="Contraseña del PDF"
              />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">📄 {file?.name}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" onClick={process} disabled={loading || !password}>
              {loading ? "Procesando…" : "Procesar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
