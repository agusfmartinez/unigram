import type { Alumno, EntradaHistoria } from "@/types";
import { cell, extraerCodigo, readSheetRows, type Row } from "./xls";

export interface HistoriaParseResult {
  entradas: EntradaHistoria[];
  alumno: Alumno | null;
}

/**
 * Detecta alumno/legajo en la cabecera libre del XLS. Tolerante: busca en
 * cualquier celda de las primeras filas, con el valor pegado ("Alumno: NAME")
 * o en la celda siguiente.
 */
function parseAlumno(rows: Row[]): Alumno | null {
  let nombre = "";
  let legajo = "";
  for (const row of rows.slice(0, 20)) {
    for (let i = 0; i < row.length; i++) {
      const s = cell(row, i);
      if (!s) continue;
      if (/^alumno\b/i.test(s)) {
        const rest = s.replace(/^alumno\s*:?/i, "").trim();
        nombre = rest || cell(row, i + 1);
      } else if (/^legajo\b/i.test(s)) {
        const rest = s.replace(/^legajo\s*:?/i, "").trim();
        legajo = rest || cell(row, i + 1);
      }
    }
    if (nombre && legajo) break;
  }
  return nombre ? { nombre, legajo } : null;
}

export async function parseHistoriaAcademica(file: File): Promise<HistoriaParseResult> {
  const rows = await readSheetRows(file);
  const entradas: EntradaHistoria[] = [];
  const alumno = parseAlumno(rows);
  let started = false;

  for (const row of rows) {
    const c0 = cell(row, 0);
    if (c0 === "Actividad") {
      started = true;
      continue;
    }
    if (!started || !c0) continue;

    const { codigo, nombreLimpio } = extraerCodigo(c0);
    const nota = cell(row, 3);
    const num = nota.match(/^(\d+)/);

    entradas.push({
      actividad: c0,
      nombre: nombreLimpio,
      codigo,
      fecha: cell(row, 1),
      tipo: cell(row, 2),
      nota,
      notaNum: num ? parseInt(num[1], 10) : null,
      resultado: cell(row, 4),
    });
  }

  return { entradas, alumno };
}
