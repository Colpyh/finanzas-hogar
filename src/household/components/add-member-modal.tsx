"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addMemberByEmail } from "@/household/actions";

export function AddMemberModal() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    if (!next) setError(undefined);
    setOpen(next);
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await addMemberByEmail(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="shrink-0 gap-2" />}>
        <UserPlus size={14} />
        Agregar miembro
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar miembro al hogar</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="query" className="text-sm text-muted-foreground">
              Nombre o correo del usuario
            </label>
            <Input
              id="query"
              name="query"
              placeholder="nombre o correo@ejemplo.com"
              autoComplete="off"
              disabled={isPending}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Buscando..." : "Agregar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
