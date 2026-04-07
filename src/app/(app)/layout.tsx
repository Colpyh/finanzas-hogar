import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
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

  // Dev bypass activo: mostrar mock sin auth real
  if (hasDevSession) {
    return <AppProviders household={MOCK_HOUSEHOLD}>{children}</AppProviders>;
  }

  // Sin dev bypass: requerir sesión real de Supabase
  try {
    const user = await getUser();
    const userHousehold = await getUserHousehold(user.id);
    if (!userHousehold) redirect("/onboarding");
    return <AppProviders household={userHousehold}>{children}</AppProviders>;
  } catch {
    redirect("/auth/login");
  }
}
