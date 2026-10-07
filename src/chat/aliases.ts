/**
 * Seudónimos de miembros para el chat con IA.
 *
 * Mismo criterio de privacidad que insights: los nombres de los miembros
 * NUNCA viajan a Gemini. La IA ve "Tú" (quien pregunta) y "Persona 1",
 * "Persona 2"… para el resto; el server traduce en ambos sentidos:
 * - toAlias: nombres reales que el usuario escribe → alias (antes de enviar)
 * - toReal: alias en la respuesta de la IA → nombres reales (antes de mostrar)
 */

export const SELF_ALIAS = "Tú";

type Member = { userId: string; displayName: string };

export type MemberAliases = {
  aliasOf: (userId: string) => string;
  toAlias: (text: string) => string;
  toReal: (text: string) => string;
};

const VOWEL_CLASS: Record<string, string> = {
  a: "[aáàä]",
  e: "[eéèë]",
  i: "[iíìï]",
  o: "[oóòö]",
  u: "[uúùü]",
  n: "[nñ]",
};

/** Regex que matchea la palabra completa, sin importar mayúsculas ni tildes. */
function namePattern(name: string): RegExp {
  const body = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split("")
    .map((ch) => VOWEL_CLASS[ch] ?? ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

export function buildMemberAliases(members: Member[], currentUserId: string): MemberAliases {
  // Orden estable por userId para que el alias de cada miembro no cambie entre turnos.
  const others = members
    .filter((m) => m.userId !== currentUserId)
    .sort((a, b) => a.userId.localeCompare(b.userId));

  const aliasById = new Map<string, string>([[currentUserId, SELF_ALIAS]]);
  others.forEach((m, i) => aliasById.set(m.userId, `Persona ${i + 1}`));

  // Nombre completo primero (más largo gana), luego el primer nombre suelto.
  const toAliasRules: { pattern: RegExp; alias: string }[] = [];
  for (const m of others) {
    const alias = aliasById.get(m.userId)!;
    const full = m.displayName.trim();
    const first = full.split(/\s+/)[0] ?? "";
    if (full.length >= 2) toAliasRules.push({ pattern: namePattern(full), alias });
    if (first.length >= 3 && first !== full) toAliasRules.push({ pattern: namePattern(first), alias });
  }

  const toRealRules = others.map((m, i) => ({
    pattern: new RegExp(`(?<![\\p{L}\\p{N}])Persona ${i + 1}(?![\\p{N}])`, "giu"),
    name: m.displayName,
  }));

  return {
    aliasOf: (userId) => aliasById.get(userId) ?? "Otro miembro",
    toAlias: (text) => toAliasRules.reduce((t, r) => t.replace(r.pattern, r.alias), text),
    toReal: (text) => toRealRules.reduce((t, r) => t.replace(r.pattern, r.name), text),
  };
}
