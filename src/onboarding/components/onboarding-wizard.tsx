"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHouseholdAndReturn } from "@/onboarding/actions";
import { createInvite } from "@/household/actions";

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Step 2: auto-generate invite when householdId is set
  useEffect(() => {
    if (step === 2 && householdId && !inviteToken) {
      startTransition(async () => {
        try {
          const invite = await createInvite();
          if (invite) setInviteToken(invite.token);
        } catch {
          // Non-blocking — user can still skip
        }
      });
    }
  }, [step, householdId, inviteToken]);

  function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createHouseholdAndReturn({ name });
      if (result.error) {
        setError(result.error);
      } else if (result.householdId) {
        setHouseholdId(result.householdId);
        setStep(2);
      }
    });
  }

  function handleCopyLink() {
    if (!inviteToken) return;
    const link = `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inviteLink = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`
    : null;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s === step
                ? "w-6 bg-primary"
                : s < step
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Crear hogar */}
      {step === 1 && (
        <form onSubmit={handleCreateHousehold} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="wizard-household-name">Nombre del hogar</Label>
            <Input
              id="wizard-household-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Casa Matías y Sol"
              maxLength={50}
              minLength={2}
              required
              disabled={isPending}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isPending || name.trim().length < 2}>
            {isPending ? "Creando..." : "Continuar"}
          </Button>
        </form>
      )}

      {/* Step 2 — Invitar a tu pareja */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Invitá a tu pareja</p>
            <p className="text-sm text-muted-foreground">
              Compartí este enlace para que se una al hogar.
            </p>
          </div>

          {isPending && !inviteLink && (
            <p className="text-sm text-muted-foreground">Generando enlace...</p>
          )}

          {inviteLink && (
            <div className="space-y-2">
              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
                <p className="break-all text-xs text-muted-foreground">{inviteLink}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCopyLink}
              >
                {copied ? "¡Copiado!" : "Copiar enlace"}
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setStep(3)}
            >
              Omitir
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => setStep(3)}
              disabled={isPending && !inviteLink}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — ¡Todo listo! */}
      {step === 3 && (
        <div className="space-y-4 text-center">
          <div className="space-y-1">
            <p className="text-xl font-semibold">¡Hogar creado!</p>
            <p className="text-sm text-muted-foreground">
              Ya podés empezar a registrar tus gastos compartidos.
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => router.push("/dashboard")}
          >
            Ir al dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
