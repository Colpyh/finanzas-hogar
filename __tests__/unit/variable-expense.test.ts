import { variableMonthAmount } from "@/shared/lib/variable-expense";

/**
 * Bug B1: el monto real del mes de un gasto variable es la boleta completa
 * (fila del pagador original). Las filas de settlement (parte del deudor)
 * son fracciones de esa misma boleta — sumarlas infla el total (1.5× con
 * 2 miembros). El monto correcto es el MÁXIMO de los pagos, no la suma.
 */
describe("variableMonthAmount", () => {
  it("returns the single payment amount when only the payer registered", () => {
    expect(variableMonthAmount(["30000.00"])).toBe(30000);
  });

  it("returns the full bill (max), not the sum, after a settlement row exists", () => {
    // Pagador registró $30.000 (boleta completa); deudor saldó su mitad $15.000.
    expect(variableMonthAmount(["30000.00", "15000.00"])).toBe(30000);
  });

  it("is order-independent", () => {
    expect(variableMonthAmount(["15000.00", "30000.00"])).toBe(30000);
  });

  it("returns 0 with no payments", () => {
    expect(variableMonthAmount([])).toBe(0);
  });

  it("tolerates null/undefined amounts", () => {
    expect(variableMonthAmount([null, "20000.00", undefined])).toBe(20000);
  });

  it("accepts numbers as well as strings", () => {
    expect(variableMonthAmount([30000, "15000.00"])).toBe(30000);
  });
});
