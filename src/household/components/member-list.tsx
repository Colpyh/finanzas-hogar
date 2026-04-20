"use client";

import { useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { removeMember } from "@/household/actions";

type Member = {
  id: string;
  userId: string;
  displayName: string;
  role: "owner" | "member";
};

export function MemberList({
  members,
  isOwner,
}: {
  members: Member[];
  isOwner: boolean;
}) {
  return (
    <ul className="space-y-2.5">
      {members.map((m) => (
        <MemberRow key={m.id} member={m} isOwner={isOwner} />
      ))}
    </ul>
  );
}

function MemberRow({ member: m, isOwner }: { member: Member; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await removeMember(m.id);
      setOpen(false);
    });
  }

  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-sm text-foreground flex-1 min-w-0 truncate">{m.displayName}</span>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={m.role === "owner" ? "default" : "secondary"} className="text-xs">
          {m.role === "owner" ? "Propietario" : "Miembro"}
        </Badge>
        {isOwner && m.role !== "owner" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              title="Eliminar miembro"
              className="text-destructive hover:text-destructive/80 transition-colors"
            >
              <UserMinus size={15} />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar miembro?</DialogTitle>
                <DialogDescription>
                  Esto eliminará a <strong>{m.displayName}</strong> del hogar. Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
                  {pending ? "Eliminando..." : "Eliminar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </li>
  );
}
