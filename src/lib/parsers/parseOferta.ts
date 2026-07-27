import type { MateriaOferta } from "@/types";
import { cell, readSheetRows } from "./xls";

const pick = (obj: Record<string, string>, ...keys: string[]): string => {
  for (const k of keys) if (obj[k]) return obj[k];
  return "";
};

export async function parseOferta(file: File): Promise<MateriaOferta[]> {
  const rows = await readSheetRows(file);
  const oferta: MateriaOferta[] = [];
  let headers: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const looksLikeHeader =
      i === 0 ||
      (headers.length === 0 &&
        row.some((c) => {
          const s = String(c).toLowerCase();
          return s.includes("materia") || s.includes("dia") || s.includes("día");
        }));

    if (looksLikeHeader) {
      headers = row.map((c) => String(c).trim().toLowerCase());
      continue;
    }
    if (row.every((c) => !c)) continue;

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cell(row, idx);
    });

    const nombre =
      pick(obj, "materia", "nombre", "actividad") || cell(row, 0);
    if (!nombre) continue;

    oferta.push({
      nombre,
      codigo: pick(obj, "codigo", "cód", "cod", "código"),
      dia: pick(obj, "dia", "día", "dias", "días"),
      horaInicio: pick(obj, "hora inicio", "inicio", "hora_inicio"),
      horaFin: pick(obj, "hora fin", "fin", "hora_fin"),
      modalidad: pick(obj, "modalidad"),
      docente: pick(obj, "docente", "profesor"),
      anio: pick(obj, "año", "anio", "año "),
      cuatrimestre: pick(obj, "cuatrimestre", "cuat"),
      raw: obj,
    });
  }

  return oferta;
}
