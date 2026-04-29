"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { signOut } from "@/auth/actions";

export function SignOutButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors py-3.5 text-sm font-medium"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Cerrar sesión?"
        description="Tendrás que volver a iniciar sesión para acceder a la app."
        confirmText="Sí, cerrar sesión"
        variant="destructive"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
