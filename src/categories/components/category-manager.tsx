"use client";

import { useState, useTransition } from "react";
import { createCategory, updateCategory, deleteCategory } from "@/categories/actions";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Category = {
  id: string;
  householdId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  monthlyBudget: string | null;
  createdAt: Date;
};

type Props = {
  categories: Category[];
  householdId: string;
};

function CategoryAvatar({ icon, color, name }: { icon: string | null; color: string | null; name: string }) {
  if (icon) {
    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
        style={{ backgroundColor: color ? color + "20" : "var(--muted)" }}
      >
        {icon}
      </div>
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-lg shrink-0"
      style={{ backgroundColor: color ?? "var(--muted)", opacity: color ? 1 : 0.4 }}
      aria-label={name}
    />
  );
}

function CategoryFields({
  name, setName,
  icon, setIcon,
  color, setColor,
  budget, setBudget,
}: {
  name: string; setName: (v: string) => void;
  icon: string; setIcon: (v: string) => void;
  color: string; setColor: (v: string) => void;
  budget: string; setBudget: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Supermercado, Salud..."
          className="h-10"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cat-icon">Ícono</Label>
          <Input
            id="cat-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Ej: 🛒"
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-color">Color</Label>
          <Input
            id="cat-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#6366f1"
            className="h-10"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-budget">Presupuesto mensual (opcional)</Label>
        <Input
          id="cat-budget"
          type="number"
          min="0"
          step="1000"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="Ej: 50000"
          className="h-10"
        />
      </div>
    </>
  );
}

function EditCategoryInline({ cat, onClose }: { cat: Category; onClose: () => void }) {
  const [name, setName] = useState(cat.name);
  const [icon, setIcon] = useState(cat.icon ?? "");
  const [color, setColor] = useState(cat.color ?? "");
  const [budget, setBudget] = useState(cat.monthlyBudget ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCategory(cat.id, {
        name,
        icon: icon || undefined,
        color: color || undefined,
        monthlyBudget: Number(budget) || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Categoría actualizada");
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="py-3 space-y-3 border-l-2 border-primary pl-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Editando</p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancelar"
        >
          <X size={14} />
        </button>
      </div>
      <CategoryFields
        name={name} setName={setName}
        icon={icon} setIcon={setIcon}
        color={color} setColor={setColor}
        budget={budget} setBudget={setBudget}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          {isPending && <Loader2 size={13} className="mr-1.5 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function CategoryItem({ cat, householdId }: { cat: Category; householdId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSystem = cat.householdId === null;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(cat.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Categoría eliminada");
      }
      setConfirmOpen(false);
    });
  }

  if (editing) {
    return <EditCategoryInline cat={cat} onClose={() => setEditing(false)} />;
  }

  return (
    <>
      <div className="py-3 flex items-center gap-3">
        <CategoryAvatar icon={cat.icon} color={cat.color} name={cat.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
          {isSystem && (
            <Badge variant="secondary" className="text-[10px] h-4 mt-0.5">
              Sistema
            </Badge>
          )}
          {cat.monthlyBudget && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Presupuesto: ${Number(cat.monthlyBudget).toLocaleString("es-CL")}
            </p>
          )}
        </div>
        {!isSystem && (
          <>
            <button
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Editar categoría"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={isPending}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Eliminar categoría"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar categoría?"
        description={`"${cat.name}" se eliminará permanentemente. Los gastos que ya usan esta categoría no se verán afectados.`}
        confirmText="Eliminar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}

function AddCategoryForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCategory({
        name,
        icon: icon || undefined,
        color: color || undefined,
        monthlyBudget: Number(budget) || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success("Categoría creada");
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-border">
      <CategoryFields
        name={name} setName={setName}
        icon={icon} setIcon={setIcon}
        color={color} setColor={setColor}
        budget={budget} setBudget={setBudget}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          {isPending && <Loader2 size={13} className="mr-1.5 animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}

const INITIAL_VISIBLE = 5;

export function CategoryManager({ categories, householdId }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? categories : categories.slice(0, INITIAL_VISIBLE);
  const hidden = categories.length - INITIAL_VISIBLE;

  return (
    <div className="space-y-0">
      {categories.length > 0 ? (
        <div className="divide-y divide-border">
          {visible.map((cat) => (
            <CategoryItem key={cat.id} cat={cat} householdId={householdId} />
          ))}
        </div>
      ) : (
        !showForm && (
          <p className="text-sm text-muted-foreground py-2">
            No hay categorías registradas.
          </p>
        )
      )}
      {categories.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>Ver menos <span className="text-[10px]">↑</span></>
          ) : (
            <>Ver todas ({categories.length}) <span className="text-[10px]">↓</span></>
          )}
        </button>
      )}
      {showForm ? (
        <AddCategoryForm onClose={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 mt-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <Plus size={15} />
          Nueva categoría
        </button>
      )}
    </div>
  );
}
