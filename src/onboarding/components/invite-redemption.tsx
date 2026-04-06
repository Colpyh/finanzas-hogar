"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { redeemInvite } from "@/onboarding/actions";

type Props = {
  token: string;
  householdName: string;
};

export function InviteRedemption({ token, householdName }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setLoading(true);
    setError(null);

    const result = await redeemInvite({ token });
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Fuiste invitado a unirte a{" "}
        <strong className="text-foreground">{householdName}</strong>
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleJoin} className="w-full" disabled={loading}>
        {loading ? "Uniéndose..." : "Unirse al hogar"}
      </Button>
    </div>
  );
}
