import type { EstadoMateria, Nota } from "@/types";

/** Color (CSS var) para una nota, para usar en style inline / SVG. */
export function notaColorVar(nota: Nota | number | null | undefined): string {
  if (nota === null || nota === undefined) return "var(--pendiente)";
  if (typeof nota === "string") return "var(--warning)"; // "C"
  if (nota >= 9) return "var(--aprobado)";
  if (nota >= 7) return "var(--en-curso)";
  if (nota >= 6) return "var(--warning)";
  return "var(--chart-red)";
}

export interface EstadoMeta {
  label: string;
  /** clases tailwind para el <Badge> */
  className: string;
  /** color CSS var (para SVG / gráficos) */
  color: string;
}

export function estadoMeta(estado: EstadoMateria): EstadoMeta {
  switch (estado) {
    case "aprobado":
      return {
        label: "✓ Aprobado",
        className: "bg-aprobado/15 text-aprobado border-aprobado/20",
        color: "var(--aprobado)",
      };
    case "en_curso":
      return {
        label: "● En curso",
        className: "bg-en-curso/15 text-en-curso border-en-curso/20",
        color: "var(--en-curso)",
      };
    case "equivalencia":
      return {
        label: "≈ Equivalencia",
        className: "bg-warning/15 text-warning border-warning/20",
        color: "var(--warning)",
      };
    default:
      return {
        label: "○ Pendiente",
        className: "bg-pendiente/15 text-pendiente border-pendiente/20",
        color: "var(--pendiente)",
      };
  }
}

/** Una materia cuenta como cumplida si está aprobada o dada por equivalencia. */
export function estaAprobada(estado: EstadoMateria): boolean {
  return estado === "aprobado" || estado === "equivalencia";
}

export const ESTADOS: EstadoMateria[] = ["pendiente", "en_curso", "aprobado", "equivalencia"];
