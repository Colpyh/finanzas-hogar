"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PurchaseForm } from "@/compras/components/purchase-form";
import { analyzeReceipt, type AnalyzeReceiptResult } from "@/receipts/actions";
import { Camera, Loader2, RotateCcw } from "lucide-react";

type Category = { id: string; name: string };
type Member = { userId: string; displayName: string };
type Card = { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; used: number };

type Props = { categories: Category[]; members: Member[]; cards: Card[] };

/**
 * Reduce la foto a máx 1280px por lado y la recomprime a JPEG (~150-300KB):
 * suficiente para que la IA lea la boleta, liviano para subir y almacenar.
 */
async function compressImage(file: File): Promise<{ base64: string; dataUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return { base64: dataUrl.split(",")[1] ?? "", dataUrl };
}

export function ReceiptCapture({ categories, members, cards }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeReceiptResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setAnalyzing(true);
    try {
      const { base64, dataUrl } = await compressImage(file);
      setPreview(dataUrl);
      const res = await analyzeReceipt(base64, "image/jpeg");
      if (res.error && !res.receipt) {
        // Sin extracción: puede seguir a mano, con la foto ya subida si llegó
        setError(res.error);
        setResult(res);
      } else {
        setResult(res);
      }
    } catch {
      setError("No se pudo procesar la imagen — probá de nuevo.");
    } finally {
      setAnalyzing(false);
    }
  }

  // Extracción exitosa → form precargado con ítems editables
  if (result?.receipt) {
    return (
      <PurchaseForm
        categories={categories}
        members={members}
        cards={cards}
        initial={{
          description: result.receipt.merchant,
          amount: String(result.receipt.total),
          expenseDate: result.receipt.date,
        }}
        receipt={{
          imagePath: result.imagePath,
          items: result.receipt.items,
          itemsMatchTotal: result.itemsMatchTotal ?? true,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {preview ? (
        <div className="rounded-2xl overflow-hidden border border-border relative max-h-96">
          {/* eslint-disable-next-line @next/next/no-img-element -- dataURL local, no optimizable */}
          <img src={preview} alt="Boleta" className="w-full object-contain max-h-96" />
          {analyzing && (
            <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm font-medium">Leyendo la boleta…</p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 hover:bg-muted/40 transition-colors"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Camera size={26} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[15px]">Sacale una foto a la boleta</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detectamos el total, el comercio y el detalle por vos
            </p>
          </div>
        </button>
      )}

      {error && (
        <div className="space-y-3">
          <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">{error}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => inputRef.current?.click()}
              disabled={analyzing}
            >
              <RotateCcw size={14} className="mr-1.5" />
              Otra foto
            </Button>
          </div>
          {/* Fallback: cargar a mano, conservando el comprobante si se subió */}
          <PurchaseForm
            categories={categories}
            members={members}
            cards={cards}
            receipt={
              result?.imagePath
                ? { imagePath: result.imagePath, items: [], itemsMatchTotal: true }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
