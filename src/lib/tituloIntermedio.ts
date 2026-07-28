/**
 * Materias que componen el título intermedio "Técnico en Programación"
 * dentro del plan de la Licenciatura en Informática (UNAHUR).
 *
 * El XLS del SIU NO distingue estas materias (el módulo solo dice el año de la
 * Lic), así que se marcan por código acá. Completar con la lista oficial.
 * Mientras esté vacío, se puede marcar cada materia a mano desde el editor ✏.
 */
export const CODIGOS_TECNICO_UNAHUR = new Set<string>([
  // "789", "788", "790", ... ← completar con los códigos del Técnico
]);

/** ¿La materia (por código o módulo) pertenece al título intermedio? */
export function esTituloIntermedio(codigo: string, modulo: string): boolean {
  if (CODIGOS_TECNICO_UNAHUR.has(codigo)) return true;
  const m = modulo.toLowerCase();
  return (
    m.includes("tecnicatura") ||
    m.includes("técnico") ||
    m.includes("tecnico") ||
    m.includes("título intermedio") ||
    m.includes("titulo intermedio")
  );
}
