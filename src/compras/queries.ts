import { db } from "@/shared/lib/db";
import { expense, card } from "@/shared/lib/db/schema";
import { eq, and, isNull, gte, lte, or, desc } from "drizzle-orm";

export type ExpenseFilters = {
  type?: "one_time" | "installment" | "all";
  dateFrom?: string;
  dateTo?: string;
  cardId?: string | null;
};

export async function getExpenses(householdId: string, filters: ExpenseFilters = {}) {
  const conditions = [
    eq(expense.householdId, householdId),
    isNull(expense.deletedAt),
    or(eq(expense.type, "one_time"), eq(expense.type, "installment")),
  ];

  if (filters.type && filters.type !== "all") {
    conditions.push(eq(expense.type, filters.type));
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateCond = filters.dateFrom && filters.dateTo
      ? and(gte(expense.expenseDate, filters.dateFrom), lte(expense.expenseDate, filters.dateTo))
      : filters.dateFrom
        ? gte(expense.expenseDate, filters.dateFrom)
        : lte(expense.expenseDate, filters.dateTo!);

    // Cuotas: mostrar si empezaron antes o durante el mes seleccionado
    const installmentCond = filters.dateTo
      ? lte(expense.startMonth, filters.dateTo)
      : undefined;

    conditions.push(
      or(
        and(eq(expense.type, "one_time"), dateCond),
        installmentCond
          ? and(eq(expense.type, "installment"), installmentCond)
          : eq(expense.type, "installment")
      )
    );
  }

  if (filters.cardId) {
    conditions.push(eq(expense.cardId, filters.cardId));
  }

  return db
    .select({
      id: expense.id,
      type: expense.type,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      installmentAmount: expense.installmentAmount,
      installmentsPaid: expense.installmentsPaid,
      installmentsTotal: expense.installmentsTotal,
      responsibleId: expense.responsibleId,
      cardId: expense.cardId,
      cardName: card.name,
      cardColor: card.color,
      cardLastFour: card.lastFour,
      createdAt: expense.createdAt,
    })
    .from(expense)
    .leftJoin(card, eq(expense.cardId, card.id))
    .where(and(...conditions))
    .orderBy(desc(expense.createdAt));
}

export async function getExpenseById(id: string, householdId: string) {
  const [row] = await db
    .select()
    .from(expense)
    .where(
      and(eq(expense.id, id), eq(expense.householdId, householdId), isNull(expense.deletedAt))
    )
    .limit(1);
  return row ?? null;
}
