import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/household/queries";
import { getPendingCount } from "@/email-inbound/queries";
import { UnauthorizedError } from "@/auth/types";
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
  const hasDevSession =
    process.env.NODE_ENV === "development" &&
    cookieStore.get("dev-session")?.value === "1";

  // Dev bypass: solo cuando hay cookie de sesión local
  if (hasDevSession) {
    return (
      <AppProviders household={MOCK_HOUSEHOLD} userId="dev" pendingCount={0}>
        {children}
      </AppProviders>
    );
  }

  // Sin dev bypass: verificar sesión real de Supabase
  const result = await getUser()
    .then(async (u) => {
      const household = await getUserHousehold(u.id);
      return { ok: true as const, user: u, household };
    })
    .catch((err: unknown) => {
      if (err instanceof UnauthorizedError) {
        return { ok: false as const, reason: "unauthorized" as const };
      }
      // Real server error — rethrow so Next.js error boundary catches it
      throw err;
    });

  if (!result.ok) redirect("/auth/login");

  if (!result.household) redirect("/onboarding");

  const pendingCount = await getPendingCount(result.household.id).catch(() => 0);

  return (
    <AppProviders
      household={result.household}
      userId={result.user.id}
      userEmail={result.user.email ?? undefined}
      pendingCount={pendingCount}
    >
      {children}
    </AppProviders>
  );
}
