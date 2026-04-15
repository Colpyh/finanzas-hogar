"use client";

import { HouseholdContext, type HouseholdContextValue } from "@/shared/hooks/use-household";
import { BottomNav } from "@/shared/components/bottom-nav";

type Props = {
  household: HouseholdContextValue;
  children: React.ReactNode;
};

export function AppProviders({ household, children }: Props) {
  return (
    <HouseholdContext.Provider value={household}>
      <div className="flex min-h-screen">
        <BottomNav />
        <main className="flex-1 pl-16">{children}</main>
      </div>
    </HouseholdContext.Provider>
  );
}
