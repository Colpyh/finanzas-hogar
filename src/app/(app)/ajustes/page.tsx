import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers, getActiveInvites } from "@/household/queries";
import { createInvite, revokeInvite } from "@/household/actions";
import { signOut } from "@/auth/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Home, Link2, LogOut, Palette } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";

export const metadata: Metadata = { title: "Ajustes" };

const MOCK_MEMBERS = [
  { id: "1", userId: "Matías (tú)", role: "owner" as const },
  { id: "2", userId: "Cónyuge", role: "member" as const },
];

export default async function AjustesPage() {
  let householdName = "Hogar Demo";
  let members: { id: string; userId: string; role: "owner" | "member" }[] = MOCK_MEMBERS;
  let invites: { id: string; token: string }[] = [];
  let isOwner = true;
  let canInvite = false;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const user = await getUser();
    const userHousehold = await getUserHousehold(user.id);
    if (userHousehold) {
      householdName = userHousehold.name;
      isOwner = userHousehold.role === "owner";
      const [dbMembers, dbInvites] = await Promise.all([
        getHouseholdMembers(userHousehold.id),
        getActiveInvites(userHousehold.id),
      ]);
      members = dbMembers;
      invites = dbInvites;
      canInvite = isOwner && dbMembers.length < 2;
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  async function handleCreateInvite() {
    "use server";
    await createInvite();
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
      </div>

      {/* Hogar */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Home size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Tu hogar</span>
        </div>
        <p className="text-base font-semibold text-foreground">{householdName}</p>
        <p className="text-sm text-muted-foreground">
          {members.length} miembro{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Miembros */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Miembros</span>
        </div>
        <ul className="space-y-2.5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{m.userId}</span>
              <Badge variant={m.role === "owner" ? "default" : "secondary"} className="text-xs">
                {m.role === "owner" ? "Propietario" : "Miembro"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* Invitaciones */}
      {isOwner && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 size={15} />
            <span className="text-xs font-medium uppercase tracking-wide">Invitar miembro</span>
          </div>

          {invites.map((inv) => (
            <div key={inv.id} className="space-y-2">
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3 break-all font-mono">
                {siteUrl}/invite/{inv.token}
              </p>
              <form action={revokeInvite.bind(null, inv.id)}>
                <Button variant="ghost" size="sm" className="text-destructive w-full">
                  Revocar enlace
                </Button>
              </form>
            </div>
          ))}

          {canInvite && (
            <form action={handleCreateInvite}>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Link2 size={14} />
                Generar enlace de invitación
              </Button>
            </form>
          )}

          {!canInvite && invites.length === 0 && (
            <p className="text-sm text-muted-foreground">
              El hogar ya tiene el máximo de miembros.
            </p>
          )}
        </div>
      )}

      {/* Apariencia */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Palette size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Apariencia</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Cerrar sesión */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors py-3.5 text-sm font-medium"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
