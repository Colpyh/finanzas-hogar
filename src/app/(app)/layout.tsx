import { redirect } from "next/navigation";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { HouseholdContext } from "@/shared/hooks/use-household";
import { BottomNav } from "@/shared/components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser().catch(() => null);
  if (!user) redirect("/auth/login");

  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) redirect("/onboarding");

  return (
    <HouseholdContext.Provider value={userHousehold}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 pb-16">{children}</main>
        <BottomNav />
      </div>
    </HouseholdContext.Provider>
  );
}
