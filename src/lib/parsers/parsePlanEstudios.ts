import type { Materia, PlanParseResult } from "@/types";
import { cell, extraerCodigo, readSheetRows, type Row } from "./xls";
import { esTituloIntermedio } from "@/lib/tituloIntermedio";

const ANIO_MAP: Record<string, number> = {
  PRIMER: 1,
  SEGUNDO: 2,
  TERCER: 3,
  CUARTO: 4,
  QUINTO: 5,
  SEXTO: 6,
};

/**
 * Detecta el año en el texto de un módulo/sección. Soporta dos formatos del SIU:
 *  - palabra: "PRIMER AÑO", "SEGUNDO AÑO"...
 *  - ordinal numérico: "1er año", "2do año", "3er año"...
 */
function detectarAnio(text: string): number | null {
  const t = text.toLowerCase();
  const word = t.match(/primer|segundo|tercer|cuarto|quinto|sexto/);
  if (word) return ANIO_MAP[word[0].toUpperCase()] ?? null;
  const num = t.match(/(\d+)\s*[°º]?\s*(er|do|to|mo|no|ro)?\s*a[ñn]o/);
  if (num) return parseInt(num[1], 10);
  return null;
}

/** Detecta datos del alumno + carrera en la cabecera libre del XLS. */
function parseCabecera(rows: Row[]): PlanParseResult {
  let nombre = "";
  let legajo = "";
  let propuestaNombre = "";
  let codigo = "";
  let version = "";
  let universidad = "";

  for (const row of rows.slice(0, 15)) {
    const c0 = cell(row, 0);
    if (c0.startsWith("Alumno:")) nombre = c0.replace("Alumno:", "").trim();
    else if (c0.startsWith("Legajo:")) legajo = c0.replace("Legajo:", "").trim();
    else if (c0.startsWith("Propuesta:")) {
      const raw = c0.replace("Propuesta:", "").trim();
      const m = raw.match(/^\((\d+)\)\s*(.*)$/);
      if (m) {
        codigo = m[1];
        propuestaNombre = m[2].trim();
      } else {
        propuestaNombre = raw;
      }
    } else if (c0.startsWith("Plan:") || c0.startsWith("Versión:") || c0.startsWith("Version:")) {
      version = c0.replace(/^(Plan:|Versión:|Version:)/, "").trim();
    } else if (/universidad/i.test(c0)) {
      universidad = c0.trim();
    }
  }

  return {
    alumno: nombre ? { nombre, legajo } : null,
    carrera: {
      nombre: propuestaNombre || "Carrera sin nombre",
      codigo,
      version,
      universidad: universidad || "Universidad Nacional de Hurlingham",
      materias: [],
    },
  };
}

function detectarEstado(notaStr: string, origen: string): Materia["estado"] {
  const n = notaStr.toLowerCase();
  const o = origen.toLowerCase();
  if (n.includes("en curso") || o.includes("en curso")) return "en_curso";
  if (/\d/.test(notaStr)) return "aprobado"; // la nota manda, aunque diga equivalencia
  if (n.includes("equivalencia") || o.includes("equivalencia")) return "equivalencia";
  if (notaStr.includes("Promocionado") || origen === "Promoción") return "aprobado";
  if (notaStr === "C (Aprobado)" || origen === "Regularidad") return "aprobado";
  if (notaStr) return "aprobado";
  return "pendiente";
}

function extraerNota(notaStr: string): Materia["nota"] {
  const num = notaStr.match(/^(\d+)/);
  if (num) return parseInt(num[1], 10);
  return notaStr.includes("C") ? "C" : null;
}

/** Prefijos de actividades de crédito / electivas (no son materias del plan). */
const CREDITO_PREFIJOS = ["AU_", "ACA", "CR", "Elec_", "COMP_"];

/**
 * Secciones "ASIGNATURA UNAHUR_n" que SÍ son un slot de electiva que cuenta como
 * materia del plan. Regla del plan Lic Informática UNAHUR: solo la de 2do año
 * (UNAHUR_1). La UNAHUR_2 (5to año) aparece en el XLS pero NO corresponde.
 */
const SLOTS_UNAHUR_VALIDOS = new Set(["UNAHUR_1"]);

function esActividadCredito(nombreLimpio: string, codigo: string): boolean {
  return CREDITO_PREFIJOS.some(
    (p) => nombreLimpio.startsWith(p) || codigo.startsWith(p),
  );
}

export async function parsePlanEstudios(file: File): Promise<PlanParseResult> {
  const rows = await readSheetRows(file);
  const result = parseCabecera(rows);
  const materias: Materia[] = [];

  let currentModulo = "";
  let currentAnio: number | null = null;
  let inDataSection = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const c0 = cell(row, 0);
    const upper = c0.toUpperCase();

    if (upper.startsWith("MÓD") || upper.includes("MÓDULO:")) {
      currentModulo = c0.replace(/MÓDULO:/gi, "").replace(/^[/\s-]+/, "").trim();
      currentAnio = detectarAnio(currentModulo) ?? currentAnio;
      inDataSection = false;
      continue;
    }
    if (upper.startsWith("MATERIA GEN")) {
      currentModulo = c0.replace(/MATERIA GENÉRICA:|MATERIA GENéRICA:/gi, "").replace(/^[/\s-]+/, "").trim();
      inDataSection = false;

      // "ASIGNATURA UNAHUR" = slot de electiva: cuenta como UNA materia del plan.
      // El catálogo de opciones (filas AU_*) NO se lista (se descarta abajo).
      if (/asignatura\s+unahur/i.test(c0)) {
        const anioGen = detectarAnio(c0) ?? currentAnio;
        const slotMatch = c0.match(/UNAHUR[_\s]*(\d+)/i);
        const slot = slotMatch?.[1] ?? String(anioGen ?? materias.length);
        const codigo = `UNAHUR_${slot}`;
        if (SLOTS_UNAHUR_VALIDOS.has(codigo) && !materias.some((m) => m.codigo === codigo)) {
          materias.push({
            id: codigo,
            codigo,
            nombre: "Asignatura UNAHUR",
            tipo: "materia",
            anio: anioGen,
            periodo: "",
            nota: null,
            estado: "pendiente",
            origen: "",
            creditos: 0,
            modulo: currentModulo,
            esPrincipal: true,
            tituloIntermedio: false,
          });
        }
      }
      continue;
    }
    if (c0 === "Actividad") {
      inDataSection = true;
      continue;
    }

    if (!inDataSection || !c0 || c0.startsWith("(") || c0.startsWith("Alumno")) continue;

    const tipo = cell(row, 1);
    const anioCol = row[2] ? parseInt(String(row[2]), 10) : null;
    const periodo = cell(row, 3).replace(/^[-\s]+/, "");
    const notaStr = cell(row, 4);
    const origen = cell(row, 5);
    const creditos = parseFloat(String(row[6])) || 0;

    const { codigo, nombreLimpio } = extraerCodigo(c0);
    const estado = detectarEstado(notaStr, origen);
    const nota = estado === "equivalencia" ? null : extraerNota(notaStr);
    const esCredito = esActividadCredito(nombreLimpio, codigo);
    const anio = anioCol ?? currentAnio;
    const esPrincipal =
      !esCredito && tipo === "Materia" && anio != null && !codigo.startsWith("INF");

    materias.push({
      id: codigo || `row-${i}`,
      codigo,
      nombre: nombreLimpio,
      tipo: esCredito ? "credito" : "materia",
      anio,
      periodo,
      nota,
      estado,
      origen,
      creditos,
      modulo: currentModulo,
      esPrincipal,
      tituloIntermedio: esTituloIntermedio(codigo, currentModulo),
    });
  }

  // Dedup por código: el catálogo AU aparece en varias secciones (2do y 5to año)
  // con los mismos códigos. Se conserva la primera aparición.
  const vistos = new Set<string>();
  result.carrera.materias = materias.filter((m) => {
    if (!m.codigo) return true;
    if (vistos.has(m.codigo)) return false;
    vistos.add(m.codigo);
    return true;
  });
  return result;
}
