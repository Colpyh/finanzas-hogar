"use client";

import { HouseholdContext, type HouseholdContextValue } from "@/shared/hooks/use-household";
import { AppNav } from "@/shared/components/app-nav";
import { BottomNav } from "@/shared/components/bottom-nav";
import { UserThemeSync } from "@/shared/components/user-theme-sync";
import { ShakeListener } from "@/shared/components/shake-listener";

type Props = {
  household: HouseholdContextValue;
  userId: string;
  userEmail?: string;
  pendingCount?: number;
  children: React.ReactNode;
};

export function AppProviders({ household, userId, userEmail, pendingCount = 0, children }: Props) {
  return (
    <HouseholdContext.Provider value={household}>
      <UserThemeSync userId={userId} />
      <ShakeListener />
      <div className="flex min-h-screen">
        <AppNav pendingCount={pendingCount} userEmail={userEmail} />
        <main className="flex-1 md:pl-[252px] pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav pendingCount={pendingCount} />
    </HouseholdContext.Provider>
  );
}
