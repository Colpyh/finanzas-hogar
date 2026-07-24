import "server-only";
import { callGemini } from "@/shared/lib/gemini";
import { cartolaExtractionSchema, type CartolaMovement } from "./types";

/**
 * Extrae los movimientos de una cartola bancaria vía Gemini (free tier, misma
 * API key que el OCR de boletas). Recibe el TEXTO ya extraído del PDF en el
 * cliente (el PDF cifrado se descifra en el navegador, ver extract-pdf-text).
 * Mismo patrón que insights/gemini: cambiar de proveedor = reemplazar este
 * archivo.
 */

const PROMPT = `Eres un extractor de cartolas bancarias chilenas (BCI y similares).
Te paso el TEXTO de una cartola. Devuelve TODOS los movimientos como JSON. Para cada uno:
- fecha: en formato YYYY-MM-DD
- descripcion: la glosa / comercio del movimiento
- monto: el valor en pesos chilenos como número entero POSITIVO, sin signo ni
  puntos (el signo lo indica "tipo")
- tipo: clasifícalo como
  - "gasto": cargos, compras con tarjeta, pagos automáticos (PAC/PAT), giros
  - "ingreso": abonos, sueldos, depósitos, transferencias RECIBIDAS
  - "transferencia": traspasos entre cuentas propias
  - "otro": comisiones, impuestos, intereses
Reglas: nunca inventes datos; si una línea es ilegible, omítela. No incluyas
saldos ni totales, solo movimientos.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    movimientos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fecha: { type: "STRING" },
          descripcion: { type: "STRING" },
          monto: { type: "NUMBER" },
          tipo: { type: "STRING", enum: ["gasto", "ingreso", "transferencia", "otro"] },
        },
        required: ["fecha", "descripcion", "monto", "tipo"],
      },
    },
  },
  required: ["movimientos"],
};

/**
 * Devuelve null si la cartola no se pudo leer. Lanza SOLO por config faltante.
 */
export async function extractCartolaMovements(
  cartolaText: string
): Promise<CartolaMovement[] | null> {
  const result = await callGemini({
    contents: [{ parts: [{ text: `${PROMPT}\n\nTEXTO DE LA CARTOLA:\n${cartolaText}` }] }],
    responseSchema: RESPONSE_SCHEMA,
    schema: cartolaExtractionSchema,
    logTag: "cartola",
  });
  return result?.movimientos ?? null;
}
