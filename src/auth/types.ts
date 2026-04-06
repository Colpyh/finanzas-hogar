import type { User, Session } from "@supabase/supabase-js";

export type AppUser = User;
export type AppSession = Session;

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}
