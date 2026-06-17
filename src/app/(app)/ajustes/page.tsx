import type { Metadata } from "next";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers } from "@/household/queries";
import { getHouseholdCards, getCardUsageSummary, getCardExpenseCounts } from "@/tarjetas/queries";
import { getCategories } from "@/categories/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { MemberList } from "@/household/components/member-list";
import { AddMemberModal } from "@/household/components/add-member-modal";
import { CardManager } from "@/tarjetas/components/card-manager";
import { CategoryManager } from "@/categories/components/category-manager";
import { SignOutButton } from "@/auth/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Users, Home, Palette, CreditCard, Bug, ShieldAlert, Tag } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { PushNotificationToggle } from "@/shared/components/push-notification-toggle";
import { BugReportForm } from "@/bug-report/components/bug-report-form";
import { BugReportPanel } from "@/bug-report/components/bug-report-panel";
import { getAllBugReports } from "@/bug-report/queries";

export const metadata: Metadata = { title: "Ajustes" };

const MOCK_MEMBERS = [
  { id: "1", userId: "mock-1", displayName: "Matías (tú)", role: "owner" as const },
  { id: "2", userId: "mock-2", displayName: "Cónyuge", role: "member" as const },
];

export default async function AjustesPage() {
  let householdName = "Hogar Demo";
  let members: { id: string; userId: string; displayName: string; role: "owner" | "member" }[] = MOCK_MEMBERS;
  let cards: { id: string; name: string; lastFour: string | null; color: string; creditLimit: number | null; closingDay: number | null; paymentDueDay: number | null; used: number; expenseCount: number }[] = [];
  let isOwner = true;
  let isAdmin = false;
  let householdId = "";
  let bugReports: Awaited<ReturnType<typeof getAllBugReports>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];

  try {
    const user = await getUser();
    const userHousehold = await getUserHousehold(user.id);
    if (userHousehold) {
      householdName = userHousehold.name;
      householdId = userHousehold.id;
      isOwner = userHousehold.role === "owner";
      const month = currentPeriodMonth();
      const [dbMembers, dbCards, usageMap, countMap, dbCategories] = await Promise.all([
        getHouseholdMembers(userHousehold.id),
        getHouseholdCards(userHousehold.id),
        getCardUsageSummary(userHousehold.id, month),
        getCardExpenseCounts(userHousehold.id),
        getCategories(userHousehold.id),
      ]);
      categories = dbCategories;
      cards = dbCards.map((c) => ({
        id: c.id,
        name: c.name,
        lastFour: c.lastFour,
        color: c.color,
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        closingDay: c.closingDay ?? null,
        paymentDueDay: c.paymentDueDay ?? null,
        used: usageMap.get(c.id) ?? 0,
        expenseCount: countMap.get(c.id) ?? 0,
      }));
      const currentUserName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null;
      members = dbMembers.map((m) =>
        m.userId === user.id && currentUserName
          ? { ...m, displayName: currentUserName }
          : m
      );
    }
    const adminEmail = process.env.ADMIN_EMAIL;
    isAdmin = !!adminEmail && user.email === adminEmail;
    if (isAdmin) {
      bugReports = await getAllBugReports();
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

      {/* Categorías */}
      <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Categorías</span>
        </div>
        <CategoryManager categories={categories} householdId={householdId} />
      </section>

      {/* Notificaciones */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notificaciones</h2>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm mb-3">Recibí alertas cuando se detecte un nuevo gasto desde tu email.</p>
          <PushNotificationToggle />
        </div>
      </section>

      {/* Apariencia */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Palette size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Apariencia</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Reportar problema */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bug size={15} />
          <span className="text-xs font-medium uppercase tracking-wide">Soporte</span>
        </div>
        <BugReportForm />
      </div>

      {/* Panel admin — solo visible para el administrador */}
      {isAdmin && (
        <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldAlert size={15} />
            <span className="text-xs font-medium uppercase tracking-wide">Reportes de usuarios</span>
          </div>
          <BugReportPanel reports={bugReports} />
        </div>
      )}

      {/* Cerrar sesión */}
      <SignOutButton />
    </div>
  );
}
