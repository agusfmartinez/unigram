import type { Materia, PlanParseResult } from "@/types";
import { cell, extraerCodigo, readSheetRows, type Row } from "./xls";

const ANIO_MAP: Record<string, number> = {
  PRIMER: 1,
  SEGUNDO: 2,
  TERCER: 3,
  CUARTO: 4,
  QUINTO: 5,
  SEXTO: 6,
};
const ANIO_RE = /PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO/i;

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
  if (n.includes("equivalencia") || o.includes("equivalencia")) return "equivalencia";
  if (n.includes("en curso") || o.includes("en curso")) return "en_curso";
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

function esActividadCredito(nombreLimpio: string, codigo: string): boolean {
  return (
    nombreLimpio.startsWith("AU_") ||
    nombreLimpio.startsWith("CR") ||
    nombreLimpio.startsWith("Elec_") ||
    nombreLimpio.startsWith("COMP_") ||
    codigo.startsWith("CR") ||
    codigo.startsWith("AU")
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
      const anioMatch = currentModulo.match(ANIO_RE);
      if (anioMatch) currentAnio = ANIO_MAP[anioMatch[0].toUpperCase()] ?? currentAnio;
      inDataSection = false;
      continue;
    }
    if (upper.startsWith("MATERIA GEN")) {
      currentModulo = c0.replace(/MATERIA GENÉRICA:|MATERIA GENéRICA:/gi, "").trim();
      inDataSection = false;
      continue;
    }
    if (c0 === "Actividad") {
      inDataSection = true;
      continue;
    }

    if (!inDataSection || !c0 || c0.startsWith("(") || c0.startsWith("Alumno")) continue;

    const tipo = cell(row, 1);
    const anioCol = row[2] ? parseInt(String(row[2]), 10) : null;
    const periodo = cell(row, 3);
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
    });
  }

  result.carrera.materias = materias;
  return result;
}
