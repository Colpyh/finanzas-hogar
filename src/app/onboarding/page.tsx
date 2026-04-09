import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold, getInviteByToken } from "@/onboarding/queries";
import { CreateHouseholdForm } from "@/onboarding/components/create-household-form";
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
          <p className="text-sm text-destructive">
            Este enlace de invitación no es válido o ya expiró.
          </p>
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
      <CreateHouseholdForm />
    </OnboardingShell>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Configurar hogar</h1>
            <p className="text-muted-foreground text-sm">
              Creá tu hogar o unite a uno existente
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
        {children}
      </div>
    </div>
  );
}
