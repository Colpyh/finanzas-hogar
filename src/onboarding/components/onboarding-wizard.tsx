"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle } from "lucide-react";
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
        const result = await createInvite();
        if (result.token) setInviteToken(result.token);
        // Non-blocking — el usuario puede omitir el paso si falla.
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
      {/* Step indicators */}
      <div className="flex gap-1.5 mb-6">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              s === step
                ? "w-8 bg-primary"
                : s < step
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Crear hogar */}
      {step === 1 && (
        <form onSubmit={handleCreateHousehold} className="space-y-5">
          <div className="space-y-1">
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              🏠 ¿Cómo se llama tu hogar?
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Dale un nombre que identifique a tu familia o grupo.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wizard-household-name" className="text-[13px] font-medium">
              Nombre del hogar
            </Label>
            <Input
              id="wizard-household-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Casa Matías y Sol"
              maxLength={50}
              minLength={2}
              required
              disabled={isPending}
              className="h-11 rounded-xl"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/8 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-semibold"
            disabled={isPending || name.trim().length < 2}
          >
            {isPending ? "Creando..." : "Continuar"}
          </Button>
        </form>
      )}

      {/* Step 2 — Invitar */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              👥 Invitá a tu hogar
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Compartí este enlace para que se unan al hogar.
            </p>
          </div>

          {isPending && !inviteLink && (
            <p className="text-[13px] text-muted-foreground">Generando enlace...</p>
          )}

          {inviteLink && (
            <div className="space-y-2">
              <div className="bg-muted rounded-xl px-4 py-3 font-mono text-[13px] text-foreground break-all">
                {inviteLink}
              </div>
              <Button
                type="button"
                className="w-full h-11 rounded-xl font-semibold gap-2"
                onClick={handleCopyLink}
              >
                <Copy size={15} />
                {copied ? "¡Copiado!" : "Copiar enlace"}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep(3)}
            >
              Omitir por ahora
            </button>
            <Button
              type="button"
              className="h-10 rounded-xl font-semibold px-5"
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
        <div className="space-y-5 text-center">
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--success-bg, #dcfce7)" }}
            >
              <CheckCircle
                size={32}
                style={{ color: "var(--success-line, #22c55e)" }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <h2
              className="text-[20px] font-semibold text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              ¡Hogar listo!
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Ya podés empezar a registrar tus gastos compartidos.
            </p>
          </div>

          <Button
            type="button"
            className="w-full h-11 rounded-xl font-semibold"
            onClick={() => router.push("/dashboard")}
          >
            Ir al dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
