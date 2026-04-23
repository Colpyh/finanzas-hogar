"use client";

import { HouseholdContext, type HouseholdContextValue } from "@/shared/hooks/use-household";
import { BottomNav } from "@/shared/components/bottom-nav";
import { UserThemeSync } from "@/shared/components/user-theme-sync";

type Props = {
  household: HouseholdContextValue;
  userId: string;
  pendingCount?: number;
  children: React.ReactNode;
};

export function AppProviders({ household, userId, pendingCount = 0, children }: Props) {
  return (
    <HouseholdContext.Provider value={household}>
      <UserThemeSync userId={userId} />
      <div className="flex min-h-screen">
        <BottomNav pendingCount={pendingCount} />
        <main className="flex-1 pb-16 md:pb-0 md:pl-16">{children}</main>
      </div>
    </HouseholdContext.Provider>
  );
}
