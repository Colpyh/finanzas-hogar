import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

type Props = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { returnTo } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-background to-fuchsia-50/40">
      <LoginForm returnTo={returnTo} />
    </div>
  );
}
