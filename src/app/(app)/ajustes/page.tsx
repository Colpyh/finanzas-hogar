import type { Metadata } from "next";
import { getSessionUser } from "@/auth/queries";
import { getHouseholdMembers, getUserHousehold } from "@/household/queries";
import { getHouseholdCards, getCardUsageSummary, getCardLinkedExpenses } from "@/tarjetas/queries";
import type { CardLinkedExpense } from "@/tarjetas/queries";
import { getCategories } from "@/categories/queries";
import { currentPeriodMonth } from "@/shared/lib/db/helpers";
import { MemberList } from "@/household/components/member-list";
import { AddMemberModal } from "@/household/components/add-member-modal";
import { CardManager } from "@/tarjetas/components/card-manager";
import { CategoryManager } from "@/categories/components/category-manager";
import { SignOutButton } from "@/auth/components/sign-out-button";
import { Bug, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { PushNotificationToggle } from "@/shared/components/push-notification-toggle";
import { ShakeToggle } from "@/shared/components/shake-toggle";
import { BugReportForm } from "@/bug-report/components/bug-report-form";
import { BugReportPanel } from "@/bug-report/components/bug-report-panel";
import { getAllBugReports } from "@/bug-report/queries";

export const metadata: Metadata = { title: "Ajustes" };

const MOCK_MEMBERS = [
  { id: "1", userId: "mock-1", displayName: "Matías (tú)", role: "owner" as const },
  { id: "2", userId: "mock-2", displayName: "Cónyuge", role: "member" as const },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] font-bold text-muted-foreground uppercase mb-[9px]" style={{ letterSpacing: "0.04em" }}>
      {children}
    </p>
  );
}

export default async function AjustesPage() {
  let householdName = "Hogar Demo";
  let members: { id: string; userId: string; displayName: string; role: "owner" | "member" }[] = MOCK_MEMBERS;
  let cards: { id: string; name: string; lastFour: string | null; kind: string; color: string; creditLimit: number | null; closingDay: number | null; paymentDueDay: number | null; used: number; expenseCount: number; linkedExpenses: CardLinkedExpense[] }[] = [];
  let isOwner = true;
  let isAdmin = false;
  let householdId = "";
  let bugReports: Awaited<ReturnType<typeof getAllBugReports>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];

  // Mocks solo sin sesión; un error real de queries con usuario logueado DEBE
  // propagar al error boundary (mismo patrón que dashboard/compras/resumen) —
  // mostrar mocks ahí sería mostrar miembros/tarjetas falsos como reales.
  const user = await getSessionUser();
  if (user) {
    const userHousehold = await getUserHousehold(user.id);
    if (userHousehold) {
      householdName = userHousehold.name;
      householdId = userHousehold.id;
      isOwner = userHousehold.role === "owner";
      const month = currentPeriodMonth();
      const [dbMembers, dbCards, usageMap, linkedExpenses, dbCategories] = await Promise.all([
        getHouseholdMembers(userHousehold.id),
        getHouseholdCards(userHousehold.id),
        getCardUsageSummary(userHousehold.id, month),
        getCardLinkedExpenses(userHousehold.id),
        getCategories(userHousehold.id),
      ]);
      categories = dbCategories;
      const linkedByCard = new Map<string, CardLinkedExpense[]>();
      for (const e of linkedExpenses) {
        const list = linkedByCard.get(e.cardId) ?? [];
        list.push(e);
        linkedByCard.set(e.cardId, list);
      }
      cards = dbCards.map((c) => ({
        id: c.id,
        name: c.name,
        lastFour: c.lastFour,
        kind: c.kind,
        color: c.color,
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        closingDay: c.closingDay ?? null,
        paymentDueDay: c.paymentDueDay ?? null,
        used: usageMap.get(c.id) ?? 0,
        expenseCount: linkedByCard.get(c.id)?.length ?? 0,
        linkedExpenses: linkedByCard.get(c.id) ?? [],
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
  }

  const cardStyle = {
    boxShadow: "var(--shadow-sm)",
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-8 space-y-4">
      <h1
        className="text-[23px] font-semibold text-foreground mb-2"
        style={{ letterSpacing: "-0.02em" }}
      >
        Ajustes
      </h1>

      {/* Nombre del hogar */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <SectionLabel>Nombre del hogar</SectionLabel>
        <p className="text-[15px] font-bold text-foreground">{householdName}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {members.length} miembro{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Miembros */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-[11px]">
          <SectionLabel>Miembros</SectionLabel>
          {isOwner && <AddMemberModal />}
        </div>
        <MemberList members={members} isOwner={isOwner} />
      </div>

      {/* Tarjetas */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <SectionLabel>Tarjetas</SectionLabel>
        <CardManager cards={cards} />
      </div>

      {/* Categorías */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <SectionLabel>Categorías</SectionLabel>
        <CategoryManager categories={categories} householdId={householdId} />
      </div>

      {/* Notificaciones */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <SectionLabel>Notificaciones push</SectionLabel>
        <p className="text-[13px] text-muted-foreground mb-3 leading-snug">
          Recibí alertas cuando se detecte un nuevo gasto desde tu email.
        </p>
        <PushNotificationToggle />
      </div>

      {/* Apariencia */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <SectionLabel>Apariencia</SectionLabel>
        <ThemeToggle />
      </div>

      {/* Gestos */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <SectionLabel>Gestos</SectionLabel>
        <p className="text-[13px] text-muted-foreground mb-3 leading-snug">
          Con la app abierta, sacudí el celu para saltar directo a registrar un gasto.
        </p>
        <ShakeToggle />
      </div>

      {/* Soporte */}
      <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Bug size={14} className="text-muted-foreground" />
          <SectionLabel>Soporte</SectionLabel>
        </div>
        <BugReportForm />
      </div>

      {/* Panel admin */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-[18px] p-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={14} className="text-muted-foreground" />
            <SectionLabel>Reportes de usuarios</SectionLabel>
          </div>
          <BugReportPanel reports={bugReports} />
        </div>
      )}

      <SignOutButton />
    </div>
  );
}
