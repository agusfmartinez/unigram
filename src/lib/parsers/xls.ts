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

/**
 * Extrae el código entre paréntesis al final del nombre: "Materia (788)" -> "788".
 * El SIU a veces agrega marcadores como " (!)" al final; se descartan y se busca
 * el primer grupo que parezca un código real (alfanumérico / con guión bajo).
 * "AU_Abordaje... (AU_2) (!)" -> codigo "AU_2", nombre "AU_Abordaje...".
 */
export function extraerCodigo(nombre: string): { codigo: string; nombreLimpio: string } {
  let name = nombre.trim();
  let codigo = "";
  const re = /\s*\(([^)]*)\)\s*$/;
  let m: RegExpMatchArray | null;
  while ((m = name.match(re)) !== null) {
    const inner = m[1].trim();
    name = name.slice(0, m.index).trim();
    if (/^[A-Za-z0-9][A-Za-z0-9_]*$/.test(inner)) {
      codigo = inner;
      break;
    }
    // marcador (ej "!") -> seguir descartando
  }
  return { codigo, nombreLimpio: name };
}

export const cell = (row: Row | undefined, i: number): string =>
  String(row?.[i] ?? "").trim();
