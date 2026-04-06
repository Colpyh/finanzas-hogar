"use client";

import { createContext, useContext } from "react";

export type HouseholdContextValue = {
  id: string;
  name: string;
  role: "owner" | "member";
};

export const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error("useHousehold must be used within HouseholdProvider");
  }
  return ctx;
}
