import { createClient } from "@/shared/lib/supabase/server";
import { formatCurrency } from "@/shared/components/currency-display";
import type { ReceiptItem } from "@/receipts/types";

type Props = {
  items: ReceiptItem[] | null;
  imagePath: string | null;
};

/**
 * Sección "Boleta" del detalle de un gasto: líneas extraídas + link al
 * comprobante (signed URL de 1h — el bucket es privado con RLS por hogar).
 */
export async function ReceiptDetail({ items, imagePath }: Props) {
  if ((!items || items.length === 0) && !imagePath) return null;

  let signedUrl: string | null = null;
  if (imagePath) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("receipts").createSignedUrl(imagePath, 3600);
    signedUrl = data?.signedUrl ?? null;
  }

  return (
    <div
      className="bg-card border border-border rounded-[20px] overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <p className="text-[14px] font-extrabold">Boleta</p>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Ver foto original ↗
          </a>
        )}
      </div>
      {items && items.length > 0 && (
        <div className="divide-y divide-border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-4 py-2">
              <p className="text-xs text-foreground min-w-0 truncate">
                {item.description}
                {item.quantity != null && item.quantity > 1 && (
                  <span className="text-muted-foreground"> ×{item.quantity}</span>
                )}
              </p>
              <span className="text-xs font-semibold num shrink-0">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
