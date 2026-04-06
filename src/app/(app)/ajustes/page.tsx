import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getHouseholdMembers, getActiveInvites } from "@/household/queries";
import { createInvite, revokeInvite } from "@/household/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AjustesPage() {
  const user = await getUser();
  const userHousehold = await getUserHousehold(user.id);
  if (!userHousehold) return null;

  const [members, invites] = await Promise.all([
    getHouseholdMembers(userHousehold.id),
    getActiveInvites(userHousehold.id),
  ]);

  const isOwner = userHousehold.role === "owner";
  const canInvite = isOwner && members.length < 2;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hogar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{userHousehold.name}</p>
          <p className="text-sm text-muted-foreground">
            {members.length} miembro{members.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Miembros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <span className="text-sm">{m.userId}</span>
              <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                {m.role === "owner" ? "Propietario" : "Miembro"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="space-y-1">
                <p className="text-xs font-mono break-all bg-muted p-2 rounded">
                  {siteUrl}/invite/{inv.token}
                </p>
                <form action={revokeInvite.bind(null, inv.id)}>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Revocar
                  </Button>
                </form>
              </div>
            ))}

            {canInvite && (
              <form action={createInvite}>
                <Button variant="outline" size="sm" className="w-full">
                  Generar enlace de invitación
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
