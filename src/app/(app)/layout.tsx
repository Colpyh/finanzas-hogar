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
  let household: HouseholdContextValue = MOCK_HOUSEHOLD;

  try {
    const user = await getUser();
    const userHousehold = await getUserHousehold(user.id);
    if (userHousehold) household = userHousehold;
  } catch {
    // Sin sesión activa — se usa el hogar de demo
  }

  return <AppProviders household={household}>{children}</AppProviders>;
}
