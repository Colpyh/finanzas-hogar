import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/auth/queries";
import { getUserHousehold } from "@/household/queries";
import { getExpenses } from "@/compras/queries";
import { parseMonthParam } from "@/shared/lib/db/helpers";

function escapeCsvField(value: string | null | undefined): string {
  if (value == null) return "";
  let str = String(value);
  // CSV/fórmula injection: un valor que empieza con = + - @ se interpreta
  // como fórmula al abrir el CSV en Excel/Sheets (ej. una descripción
  // "=HYPERLINK(...)"). Prefijar comilla simple neutraliza la fórmula.
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  let user: Awaited<ReturnType<typeof getUser>>;
  try {
    user = await getUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const household = await getUserHousehold(user.id);
  if (!household) {
    return NextResponse.json({ error: "no_household" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const typeFilter = (searchParams.get("type") as "one_time" | "installment" | "all") ?? "all";
  const cardFilter = searchParams.get("card");
  const month = parseMonthParam(searchParams.get("month") ?? undefined);
  const q = searchParams.get("q")?.trim() ?? "";

  const mParts = month.split("-").map(Number);
  const mYear = mParts[0] ?? new Date().getFullYear();
  const mMonth = mParts[1] ?? new Date().getMonth() + 1;
  const lastDay = new Date(mYear, mMonth, 0).toISOString().slice(0, 10);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const dateFrom = dateRegex.test(fromParam) ? fromParam : month;
  const dateTo = dateRegex.test(toParam) ? toParam : lastDay;

  const rows = await getExpenses(
    household.id,
    {
      type: typeFilter,
      dateFrom,
      dateTo,
      cardId: cardFilter ?? undefined,
      search: q || undefined,
      // No limit/offset — export all
    },
    user.id
  );

  const header = ["Fecha", "Descripción", "Tipo", "Monto", "Moneda", "Categoría ID", "Tarjeta"];
  const lines: string[] = [header.join(",")];

  for (const e of rows) {
    const fecha = e.type === "one_time" ? (e.expenseDate ?? "") : (e.expenseDate ?? "");
    const tipo = e.type === "one_time" ? "Compra" : "Cuota";
    const monto = e.type === "installment" ? (e.installmentAmount ?? "") : (e.amount ?? "");
    const tarjeta = e.cardName ? `${e.cardName}${e.cardLastFour ? ` ****${e.cardLastFour}` : ""}` : "";

    lines.push(
      [
        escapeCsvField(fecha),
        escapeCsvField(e.description),
        escapeCsvField(tipo),
        escapeCsvField(String(monto)),
        escapeCsvField("CLP"),
        escapeCsvField(null), // categoryId not joined in getExpenses
        escapeCsvField(tarjeta),
      ].join(",")
    );
  }

  const csv = lines.join("\r\n");
  const filename = `gastos-${month.slice(0, 7)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
