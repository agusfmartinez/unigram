import type { EntradaHistoria } from "@/types";
import { cell, extraerCodigo, readSheetRows } from "./xls";

export async function parseHistoriaAcademica(file: File): Promise<EntradaHistoria[]> {
  const rows = await readSheetRows(file);
  const historia: EntradaHistoria[] = [];
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

    historia.push({
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

  return historia;
}
