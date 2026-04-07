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
      <div className="flex flex-col min-h-screen">
        <main className="flex-1 pb-16">{children}</main>
        <BottomNav />
      </div>
    </HouseholdContext.Provider>
  );
}
