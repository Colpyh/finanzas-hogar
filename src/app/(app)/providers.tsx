"use client";

import { HouseholdContext, type HouseholdContextValue } from "@/shared/hooks/use-household";
import { BottomNav } from "@/shared/components/bottom-nav";

type Props = {
  household: HouseholdContextValue;
  pendingCount?: number;
  children: React.ReactNode;
};

export function AppProviders({ household, pendingCount = 0, children }: Props) {
  return (
    <HouseholdContext.Provider value={household}>
      <div className="flex min-h-screen">
        <BottomNav pendingCount={pendingCount} />
        <main className="flex-1 pb-16 md:pb-0 md:pl-16">{children}</main>
      </div>
    </HouseholdContext.Provider>
  );
}
