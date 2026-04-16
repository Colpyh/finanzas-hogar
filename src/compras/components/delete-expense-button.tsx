"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { deleteExpense } from "@/compras/actions";

type Props = { expenseId: string; description: string };

export function DeleteExpenseButton({ expenseId, description }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const result = await deleteExpense(expenseId);
    if (result?.error) {
      setLoading(false);
      setOpen(false);
    } else {
      router.push("/compras");
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" className="w-full" onClick={() => setOpen(true)}>
        Eliminar gasto
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Eliminar este gasto?"
        description={`"${description}" será eliminado permanentemente.`}
        confirmText="Sí, eliminar"
        variant="destructive"
        loading={loading}
        onConfirm={handleDelete}
      />
    </>
  );
}
