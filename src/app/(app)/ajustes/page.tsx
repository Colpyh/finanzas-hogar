import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import { getHouseholdCards } from "@/tarjetas/queries";
import { MemberList } from "@/household/components/member-list";
import { AddMemberModal } from "@/household/components/add-member-modal";
import { CardManager } from "@/tarjetas/components/card-manager";
import { signOut } from "@/auth/actions";
import { Button } from "@/components/ui/button";
import { Users, Home, LogOut, Palette, CreditCard } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";

export const metadata: Metadata = { title: "Ajustes" };

const MOCK_MEMBERS = [
  { id: "1", userId: "mock-1", displayName: "Matías (tú)", role: "owner" as const },
  { id: "2", userId: "mock-2", displayName: "Cónyuge", role: "member" as const },
];

export default async function AjustesPage() {
  let householdName = "Hogar Demo";
  let members: { id: string; userId: string; displayName: string; role: "owner" | "member" }[] = MOCK_MEMBERS;
  let cards: { id: string; name: string; lastFour: string | null; color: string }[] = [];
  let isOwner = true;

  try {
    const user = await getUser();
    const userHousehold = await getUserHousehold(user.id);
    if (userHousehold) {
      householdName = userHousehold.name;
      isOwner = userHousehold.role === "owner";
      const [dbMembers, dbCards] = await Promise.all([
        getHouseholdMembers(userHousehold.id),
        getHouseholdCards(userHousehold.id),
      ]);
      cards = dbCards.map((c) => ({
        id: c.id,
        name: c.name,
        lastFour: c.lastFour,
        color: c.color,
      }));
      const currentUserName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null;
      members = dbMembers.map((m) =>
        m.userId === user.id && currentUserName
          ? { ...m, displayName: currentUserName }
          : m
      );
    }
  } catch {
    // Sin sesión — datos de ejemplo
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-8">
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
        <MemberList members={members} isOwner={isOwner} />
        {isOwner && <AddMemberModal />}
      </div>

      {/* Tarjetas */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Tarjetas de pago</span>
        </div>
        <CardManager cards={cards} />
      </div>

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
