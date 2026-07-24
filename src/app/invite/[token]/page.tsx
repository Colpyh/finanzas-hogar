import { redirect } from "next/navigation";
import { getInviteByToken } from "@/onboarding/queries";
import { getSessionUser } from "@/auth/queries";
import { InviteRedemption } from "@/onboarding/components/invite-redemption";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  // getSessionUser() valida el token contra el servidor de auth (no solo lee
  // la cookie como getSession()) — consistente con el resto de la app.
  const user = await getSessionUser();

  // If not authenticated, redirect to login with returnTo
  if (!user) {
    redirect(`/auth/login?returnTo=/invite/${token}`);
  }

  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Enlace inválido</h1>
          <p className="text-muted-foreground text-sm">
            Este enlace de invitación no existe, ya fue utilizado, o expiró.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Invitación</h1>
        </div>
        <InviteRedemption
          token={invite.token}
          householdName={invite.householdName}
        />
      </div>
    </div>
  );
}
