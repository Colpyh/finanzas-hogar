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

  // Dev bypass: solo cuando hay cookie de sesión local
  if (hasDevSession) {
    return <AppProviders household={MOCK_HOUSEHOLD}>{children}</AppProviders>;
  }

  // Sin dev bypass: verificar sesión real de Supabase
  // Nota: redirect() no va dentro de try/catch — lanza NEXT_REDIRECT que no debe ser atrapado
  let user;
  try {
    user = await getUser();
  } catch {
    redirect("/auth/login");
  }

  let userHousehold;
  try {
    userHousehold = await getUserHousehold(user.id);
  } catch {
    redirect("/auth/login");
  }

  if (!userHousehold) redirect("/onboarding");

  return <AppProviders household={userHousehold}>{children}</AppProviders>;
}
