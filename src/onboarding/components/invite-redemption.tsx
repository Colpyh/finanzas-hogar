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
    <div className="space-y-5">
      <div className="space-y-1">
        <h2
          className="text-[20px] font-semibold text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          🏠 Unirte a un hogar
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Fuiste invitado a unirte a{" "}
          <strong className="text-foreground font-semibold">{householdName}</strong>
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-xl font-semibold"
      >
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
