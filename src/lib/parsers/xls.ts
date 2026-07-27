export type Row = (string | number)[];

/**
 * Lee un File y devuelve las filas de la primera hoja como matriz.
 * `xlsx` se carga on-demand (dynamic import) para no inflar el bundle inicial.
 */
export async function readSheetRows(file: File): Promise<Row[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: "" });
}

/** Extrae el código entre paréntesis al final del nombre: "Materia (788)" -> "788". */
export function extraerCodigo(nombre: string): { codigo: string; nombreLimpio: string } {
  const match = nombre.match(/\(([^)]+)\)$/);
  const codigo = match ? match[1] : "";
  const nombreLimpio = nombre.replace(/\([^)]+\)$/, "").trim();
  return { codigo, nombreLimpio };
}

export const cell = (row: Row | undefined, i: number): string =>
  String(row?.[i] ?? "").trim();
