import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getPendingCount } from "@/email-inbound/queries";
import { AppProviders } from "./providers";
import type { HouseholdContextValue } from "@/shared/hooks/use-household";

const MOCK_HOUSEHOLD: HouseholdContextValue = {
  id: "mock-1",
  name: "Hogar Demo",
  role: "owner",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const hasDevSession = cookieStore.get("dev-session")?.value === "1";

  // Dev bypass: solo cuando hay cookie de sesión local
  if (hasDevSession) {
    return (
      <AppProviders household={MOCK_HOUSEHOLD} pendingCount={0}>
        {children}
      </AppProviders>
    );
  }

  // Sin dev bypass: verificar sesión real de Supabase
  const result = await getUser()
    .then(async (u) => ({ ok: true as const, user: u, household: await getUserHousehold(u.id) }))
    .catch(() => ({ ok: false as const }));

  if (!result.ok) redirect("/auth/login");

  if (!result.household) redirect("/onboarding");

  const pendingCount = await getPendingCount(result.household.id).catch(() => 0);

  return (
    <AppProviders household={result.household} pendingCount={pendingCount}>
      {children}
    </AppProviders>
  );
}
