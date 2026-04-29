"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { redeemInvite } from "@/onboarding/actions";

type Props = {
  token: string;
  householdName: string;
};

export function InviteRedemption({ token, householdName }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await redeemInvite({ token });
      if (result?.error) {
        setError(result.error);
        setOpen(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Fuiste invitado a unirte a{" "}
        <strong className="text-foreground">{householdName}</strong>
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={() => setOpen(true)} className="w-full">
        Unirse al hogar
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`¿Unirte a "${householdName}"?`}
        description="Pasarás a ser miembro de este hogar y tendrás acceso a todos sus gastos compartidos."
        confirmText="Sí, unirme"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
