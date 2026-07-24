import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getInviteByToken } from "@/onboarding/queries";
import { getUserHousehold } from "@/household/queries";
import { OnboardingWizard } from "@/onboarding/components/onboarding-wizard";
import { InviteRedemption } from "@/onboarding/components/invite-redemption";
import { signOut } from "@/auth/actions";
import { LogOut } from "lucide-react";

type Props = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  let user;
  try {
    user = await getUser();
  } catch {
    redirect("/auth/login");
  }
  const params = await searchParams;

  // If user already has a household, send to dashboard
  const existing = await getUserHousehold(user.id);
  if (existing) redirect("/dashboard");

  // Path B: invite token in query string
  if (params.invite) {
    const invite = await getInviteByToken(params.invite);

    if (!invite) {
      return (
        <OnboardingShell>
          <div className="space-y-1">
            <p className="text-[20px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Enlace inválido
            </p>
            <p className="text-[13px] text-destructive">
              Este enlace de invitación no es válido o ya expiró.
            </p>
          </div>
        </OnboardingShell>
      );
    }

    return (
      <OnboardingShell>
        <InviteRedemption
          token={invite.token}
          householdName={invite.householdName}
        />
      </OnboardingShell>
    );
  }

  // Path A: create household
  return (
    <OnboardingShell>
      <OnboardingWizard />
    </OnboardingShell>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
      {/* Gradient decorator */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 to-transparent" />
      </div>

      <div className="relative w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between px-1">
          <div className="space-y-0.5">
            <h1
              className="text-[23px] font-semibold text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              Finanzas Hogar
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Configurá tu espacio compartido
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <LogOut size={13} />
              Salir
            </button>
          </form>
        </div>

        {/* Card */}
        <div
          className="w-full bg-card border border-border rounded-[20px] p-6"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
