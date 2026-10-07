/**
 * @jest-environment node
 *
 * Seudónimos del chat: los nombres reales de los miembros nunca viajan a la IA.
 */
import { buildMemberAliases } from "@/chat/aliases";

const ME = "u-me";
const OTHER = "u-other";
const MEMBERS = [
  { userId: ME, displayName: "Matías" },
  { userId: OTHER, displayName: "Camila Pérez" },
];

describe("buildMemberAliases", () => {
  const aliases = buildMemberAliases(MEMBERS, ME);

  it("asigna 'Tú' al usuario actual y 'Persona N' al resto", () => {
    expect(aliases.aliasOf(ME)).toBe("Tú");
    expect(aliases.aliasOf(OTHER)).toBe("Persona 1");
  });

  it("reemplaza nombre completo y primer nombre, sin importar tildes ni mayúsculas", () => {
    expect(aliases.toAlias("¿Cuánto le debo a Camila Pérez?")).toBe("¿Cuánto le debo a Persona 1?");
    expect(aliases.toAlias("y camila me debe algo?")).toBe("y Persona 1 me debe algo?");
    expect(aliases.toAlias("lo pagó CAMILA PEREZ")).toBe("lo pagó Persona 1");
  });

  it("no reemplaza dentro de otras palabras", () => {
    expect(aliases.toAlias("Camilaaa")).toBe("Camilaaa");
  });

  it("traduce los alias de la respuesta de vuelta a nombres reales", () => {
    expect(aliases.toReal("Persona 1 te debe $20.000.")).toBe("Camila Pérez te debe $20.000.");
  });

  it("ida y vuelta no filtra el nombre hacia la IA", () => {
    const sent = aliases.toAlias("Camila pagó la luz");
    expect(sent).not.toMatch(/camila/i);
    expect(aliases.toReal(sent)).toBe("Camila Pérez pagó la luz");
  });

  it("no confunde Persona 1 con Persona 10", () => {
    const many = buildMemberAliases(
      [{ userId: ME, displayName: "Yo" }, ...Array.from({ length: 10 }, (_, i) => ({
        userId: `u-${String(i).padStart(2, "0")}`,
        displayName: `Nombre${i}`,
      }))],
      ME
    );
    expect(many.toReal("Persona 10 y Persona 1")).toBe("Nombre9 y Nombre0");
  });
});
