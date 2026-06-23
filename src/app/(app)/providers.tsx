"use client";

import { HouseholdContext, type HouseholdContextValue } from "@/shared/hooks/use-household";
import { AppNav } from "@/shared/components/app-nav";
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
        <AppNav pendingCount={pendingCount} />
        <main className="flex-1 pt-14 md:pt-0 md:pl-56">{children}</main>
      </div>
    </HouseholdContext.Provider>
  );
}
