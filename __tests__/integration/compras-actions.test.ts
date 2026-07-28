/**
 * @jest-environment node
 *
 * Integration tests for markInstallmentPaid (atomic counter, bug B7)
 * and toggleExpensePaid validation (bug B8) from @/compras/actions.
 */
export {};

const UUID_USER = "550e8400-e29b-41d4-a716-446655440050";
const UUID_HOUSEHOLD = "550e8400-e29b-41d4-a716-446655440051";
const UUID_EXPENSE = "550e8400-e29b-41d4-a716-446655440052";

// --- Mocks ---

const mockRevalidatePath = jest.fn();
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath, updateTag: mockUpdateTag }));

jest.mock("@/auth/queries", () => ({
  getUser: jest.fn().mockResolvedValue({ id: UUID_USER, email: "user@test.com" }),
}));

jest.mock("@/household/queries", () => ({
  getUserHousehold: jest.fn().mockResolvedValue({ id: UUID_HOUSEHOLD, name: "Test" }),
  getHouseholdMembers: jest.fn().mockResolvedValue([
    { id: "m1", userId: UUID_USER, role: "owner", displayName: "User" },
  ]),
}));

jest.mock("@/balances/guards", () => ({
  pendingDebtGuard: jest.fn().mockResolvedValue(null),
}));

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockInsert = jest.fn();
jest.mock("@/shared/lib/db", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
}));

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

function updateReturningChain(rows: unknown[]) {
  return {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(rows),
    }),
  };
}

describe("markInstallmentPaid (atomic counter)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments atomically in a single UPDATE (no read-modify-write)", async () => {
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ paid: 4 }]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);

    expect(result).toEqual({});
    // Un solo UPDATE, sin SELECT previo del contador
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockSelect).not.toHaveBeenCalled();
    // Tag granular: marcar cuota escribe solo el dominio expenses del hogar
    expect(mockUpdateTag).toHaveBeenCalledWith(`${UUID_HOUSEHOLD}:expenses`);
  });

  it("returns error when expense not found (0 rows updated, no row exists)", async () => {
    mockUpdate.mockReturnValueOnce(updateReturningChain([]));
    mockSelect.mockReturnValueOnce(selectChain([]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);
    expect(result).toEqual({ error: "Gasto no encontrado" });
  });

  it("returns error when all installments already paid (0 rows updated, row exists)", async () => {
    mockUpdate.mockReturnValueOnce(updateReturningChain([]));
    mockSelect.mockReturnValueOnce(selectChain([{ paid: 12, total: 12 }]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);
    expect(result).toEqual({ error: "Todas las cuotas ya fueron pagadas" });
  });

  it("rejects shared installments — se registran desde markAsMonthlyPayer/Balances, no acá", async () => {
    // WHERE incluye isShared=false: una compartida nunca matchea el UPDATE.
    mockUpdate.mockReturnValueOnce(updateReturningChain([]));
    mockSelect.mockReturnValueOnce(selectChain([{ paid: 3, total: 12, isShared: true }]));

    const { markInstallmentPaid } = await import("@/compras/actions");
    const result = await markInstallmentPaid(UUID_EXPENSE);
    expect(result).toEqual({ error: "Las cuotas compartidas se registran desde Balances" });
  });
});

describe("updateInstallment — installmentsPaid derivado para compartidas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function updateSetCaptureChain() {
    const setCalls: Record<string, unknown>[] = [];
    const chain = {
      set: jest.fn((obj: Record<string, unknown>) => {
        setCalls.push(obj);
        return { where: jest.fn().mockResolvedValue(undefined) };
      }),
    };
    return { chain, setCalls };
  }

  it("no persiste installmentsPaid cuando el gasto YA es compartido", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ installmentsTotal: 12, isShared: true }])
    );
    const { chain, setCalls } = updateSetCaptureChain();
    mockUpdate.mockReturnValueOnce(chain);

    const { updateInstallment } = await import("@/compras/actions");
    const result = await updateInstallment(UUID_EXPENSE, {
      description: "Cuota compartida",
      installmentsPaid: 5,
      isShared: true,
    });

    expect(result).toEqual({});
    expect(setCalls[0]).not.toHaveProperty("installmentsPaid");
  });

  it("no persiste installmentsPaid al pasar de no-compartida a compartida", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ installmentsTotal: 12, isShared: false }])
    );
    const { chain, setCalls } = updateSetCaptureChain();
    mockUpdate.mockReturnValueOnce(chain);

    const { updateInstallment } = await import("@/compras/actions");
    await updateInstallment(UUID_EXPENSE, {
      description: "Ahora compartida",
      installmentsPaid: 5,
      isShared: true,
    });

    expect(setCalls[0]).not.toHaveProperty("installmentsPaid");
  });

  it("sigue persistiendo installmentsPaid para gastos NO compartidos", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ installmentsTotal: 12, isShared: false }])
    );
    const { chain, setCalls } = updateSetCaptureChain();
    mockUpdate.mockReturnValueOnce(chain);

    const { updateInstallment } = await import("@/compras/actions");
    await updateInstallment(UUID_EXPENSE, {
      description: "Cuota normal",
      installmentsPaid: 5,
      isShared: false,
    });

    expect(setCalls[0]?.installmentsPaid).toBe(5);
  });
});

describe("toggleExpensePaid (validation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ONE_TIME_WITH_CARD = {
    paidAt: null,
    type: "one_time",
    cardId: "card-1",
    cardKind: "credit",
  };

  it("toggles a one_time expense with card", async () => {
    mockSelect.mockReturnValueOnce(selectChain([ONE_TIME_WITH_CARD]));
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ id: UUID_EXPENSE }]));

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result).toEqual({});
  });

  it("rejects non one_time expenses", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_WITH_CARD, type: "installment" }])
    );

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result.error).toMatch(/puntuales/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects expenses without a card (auto-paid by definition)", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_WITH_CARD, cardId: null, cardKind: null }])
    );

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result.error).toMatch(/sin tarjeta/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects debit-card expenses (auto-paid, no statement)", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_WITH_CARD, cardKind: "debit" }])
    );

    const { toggleExpensePaid } = await import("@/compras/actions");
    const result = await toggleExpensePaid(UUID_EXPENSE);
    expect(result.error).toMatch(/débito/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("markAsMonthlyPayer / registerInstallmentShare — regularizar meses pasados", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const SHARED_INSTALLMENT = { installmentAmount: "34925.00", isShared: true };

  it("markAsMonthlyPayer registra el periodMonth explícito, no el mes actual", async () => {
    mockSelect.mockReturnValueOnce(selectChain([SHARED_INSTALLMENT]));
    const insertChain = { values: jest.fn().mockResolvedValue(undefined) };
    mockInsert.mockReturnValueOnce(insertChain);

    const { markAsMonthlyPayer } = await import("@/compras/actions");
    const result = await markAsMonthlyPayer(UUID_EXPENSE, "2026-06-01");

    expect(result).toEqual({});
    const values = insertChain.values.mock.calls[0][0];
    expect(values.periodMonth).toBe("2026-06-01");
  });

  it("registerInstallmentShare registra el periodMonth explícito, no el mes actual", async () => {
    mockSelect.mockReturnValueOnce(selectChain([SHARED_INSTALLMENT]));
    const insertChain = { values: jest.fn().mockResolvedValue(undefined) };
    mockInsert.mockReturnValueOnce(insertChain);

    const { registerInstallmentShare } = await import("@/compras/actions");
    await registerInstallmentShare(UUID_EXPENSE, "2026-06-01");

    const values = insertChain.values.mock.calls[0][0];
    expect(values.periodMonth).toBe("2026-06-01");
  });

  it("sin mes explícito, sigue usando el mes actual (compatibilidad)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([SHARED_INSTALLMENT]));
    const insertChain = { values: jest.fn().mockResolvedValue(undefined) };
    mockInsert.mockReturnValueOnce(insertChain);

    const { markAsMonthlyPayer } = await import("@/compras/actions");
    await markAsMonthlyPayer(UUID_EXPENSE);

    const { currentPeriodMonth } = await import("@/shared/lib/db/helpers");
    const values = insertChain.values.mock.calls[0][0];
    expect(values.periodMonth).toBe(currentPeriodMonth());
  });
});

describe("updateExpense — isPrivate/isShared editables después de creada", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ONE_TIME_CURRENT = {
    type: "one_time",
    isShared: false,
    amount: "10000.00",
    expenseDate: "2026-07-15",
    responsibleId: null,
  };

  it("bloquea desmarcar compartido si hay deuda sin saldar", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_CURRENT, isShared: true }])
    );
    const { pendingDebtGuard } = await import("@/balances/guards");
    (pendingDebtGuard as jest.Mock).mockResolvedValueOnce("Este gasto tiene deudas sin saldar entre miembros.");

    const { updateExpense } = await import("@/compras/actions");
    const result = await updateExpense(UUID_EXPENSE, {
      description: "Compra",
      isPrivate: false,
      isShared: false,
    });

    expect(result.error).toMatch(/deudas sin saldar/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("marcar compartido en una compra puntual siembra el pago del responsable", async () => {
    mockSelect.mockReturnValueOnce(selectChain([ONE_TIME_CURRENT]));
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ id: UUID_EXPENSE }]));
    const insertChain = { values: jest.fn().mockResolvedValue(undefined) };
    mockInsert.mockReturnValueOnce(insertChain);

    const { updateExpense } = await import("@/compras/actions");
    const result = await updateExpense(UUID_EXPENSE, {
      description: "Compra",
      isPrivate: false,
      isShared: true,
    });

    expect(result).toEqual({});
    const values = insertChain.values.mock.calls[0][0];
    expect(values.paidBy).toBe(UUID_USER); // sin responsable asignado -> quien confirma
    expect(values.periodMonth).toBe("2026-07-01");
    expect(values.status).toBe("paid");
  });

  it("responsibleId null explícito no arrastra el responsable anterior — cae a quien confirma", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_CURRENT, responsibleId: "550e8400-e29b-41d4-a716-446655440099" }])
    );
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ id: UUID_EXPENSE }]));
    const insertChain = { values: jest.fn().mockResolvedValue(undefined) };
    mockInsert.mockReturnValueOnce(insertChain);

    const { updateExpense } = await import("@/compras/actions");
    await updateExpense(UUID_EXPENSE, {
      description: "Compra",
      isPrivate: false,
      isShared: true,
      responsibleId: null,
    });

    const values = insertChain.values.mock.calls[0][0];
    expect(values.paidBy).toBe(UUID_USER);
  });

  it("ya compartida: guardar de nuevo isShared=true no vuelve a sembrar el pago", async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ ...ONE_TIME_CURRENT, isShared: true }])
    );
    mockUpdate.mockReturnValueOnce(updateReturningChain([{ id: UUID_EXPENSE }]));

    const { updateExpense } = await import("@/compras/actions");
    const result = await updateExpense(UUID_EXPENSE, {
      description: "Compra",
      isPrivate: false,
      isShared: true,
    });

    expect(result).toEqual({});
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rechaza privado y compartido a la vez (validación de schema)", async () => {
    const { updateExpense } = await import("@/compras/actions");
    const result = await updateExpense(UUID_EXPENSE, {
      description: "Compra",
      isPrivate: true,
      isShared: true,
    });
    expect(result.error).toBeTruthy();
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
