import Link from "next/link";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/onboarding/queries";
import { getExpenses } from "@/compras/queries";
import { PurchaseList } from "@/compras/components/purchase-list";
import { Button } from "@/components/ui/button";

type Props = {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
};

export default async function ComprasPage({ searchParams }: Props) {
  const user = await getUser();
  const household = await getUserHousehold(user.id);
  if (!household) return null;

  const params = await searchParams;
  const typeFilter = (params.type as "one_time" | "installment" | "all") ?? "all";

  const expenses = await getExpenses(household.id, {
    type: typeFilter,
    dateFrom: params.from,
    dateTo: params.to,
  });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compras</h1>
        <Button asChild size="sm">
          <Link href="/compras/nuevo">+ Nuevo</Link>
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 text-sm">
        {[
          { label: "Todos", value: "all" },
          { label: "Compras", value: "one_time" },
          { label: "Cuotas", value: "installment" },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={`/compras?type=${opt.value}`}
            className={`px-3 py-1 rounded-full border transition-colors ${
              typeFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <PurchaseList
        expenses={expenses.map((e) => ({
          ...e,
          amount: e.amount ?? null,
          installmentAmount: e.installmentAmount ?? null,
          installmentsPaid: e.installmentsPaid ?? null,
          installmentsTotal: e.installmentsTotal ?? null,
        }))}
      />
    </div>
  );
}
