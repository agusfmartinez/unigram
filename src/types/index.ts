// ─── Domain types ──────────────────────────────────────────────────────────

export type EstadoMateria = "aprobado" | "en_curso" | "pendiente" | "equivalencia";
export type Turno = "manana" | "tarde" | "noche";
export type TipoMateria = "materia" | "credito";
export type Nota = number | "C" | null;

/** Materia del plan de estudios de una carrera. */
export interface Materia {
  id: string; // código SIU (ej "788") o generado si no tiene
  codigo: string; // código numérico/alfanumérico del SIU
  nombre: string; // nombre limpio, sin el código entre paréntesis
  tipo: TipoMateria; // 'credito' = actividades extracurriculares (AU_, CR_, etc.)
  anio: number | null; // 1, 2, 3 (año del plan)
  periodo: string;
  nota: Nota;
  estado: EstadoMateria;
  origen: string; // 'Promoción', 'Regularidad', etc.
  creditos: number;
  modulo: string; // nombre del módulo/sección en el plan
  esPrincipal: boolean; // true si es materia del plan principal (no crédito/genérica)
  fecha?: string; // fecha de aprobación (DD/MM/YYYY), editable a mano
  tituloIntermedio?: boolean; // true si cuenta para el título intermedio (Técnico en Programación)
}

/**
 * Datos de cursada de una materia en curso, cargados a mano. Viven aparte de la
 * Materia (en `Carrera.cursadas`, por id de materia) para no "manchar" el plan:
 * son temporales al cuatrimestre y se borran al dejar de cursar.
 */
export interface Cursada {
  comision?: string;
  dias?: string[]; // "Lunes", "Miércoles", ...
  turno?: Turno;
  aula?: string;
  profesores?: string; // texto libre
  link?: string; // link de clase virtual (Meet/Zoom) u otro recurso
  parcial1?: string; // resultado del 1er parcial ("8", "Ausente")
  parcial2?: string;
  recuperatorio1?: string; // opcional
  recuperatorio2?: string; // opcional
  final?: string; // nota del final (opcional)
  fechaParcial1?: string; // DD/MM/YYYY
  fechaParcial2?: string;
  fechaRecuperatorio1?: string;
  fechaRecuperatorio2?: string;
  fechaExamen?: string; // fecha del examen final (DD/MM/YYYY)
}

/** Entrada del historial académico (SIU la exporta sin distinción de carrera). */
export interface EntradaHistoria {
  actividad: string; // nombre completo con código entre paréntesis
  nombre: string; // nombre sin código
  codigo: string;
  fecha: string; // DD/MM/YYYY
  tipo: string; // 'Promocion', 'Regularidad', 'En curso'
  nota: string; // string crudo del SIU ("9", "C", "10", ...)
  notaNum: number | null;
  resultado: string; // 'Aprobado', 'Promocionado', etc.
}

/** Materia de la oferta académica de un cuatrimestre. */
export interface MateriaOferta {
  nombre: string;
  codigo: string;
  dia: string; // "Lunes", "Martes y Jueves", etc.
  horaInicio: string;
  horaFin: string;
  modalidad: string;
  docente: string;
  anio: string;
  cuatrimestre: string;
  raw: Record<string, string>; // fila cruda para no perder columnas desconocidas
}

/** Datos del alumno detectados en la cabecera del XLS del plan. */
export interface Alumno {
  nombre: string;
  legajo: string;
}

/** Una carrera importada, con su plan de estudios. */
export interface Carrera {
  id: string; // slug: "tup-v1", "lic-informatica-v2026"
  nombre: string; // "Tecnicatura Universitaria en Programación"
  codigo: string; // código SIU: "033"
  version: string; // versión del plan: "TUP_V1"
  universidad: string;
  materias: Materia[];
  /** Correlatividades por código de materia. Editable por el usuario. */
  correlatividades: Record<string, string[]>;
  /** Datos de cursada por id de materia (solo las que están en curso). */
  cursadas: Record<string, Cursada>;
  /** Cuatrimestre en curso (DD/MM/YYYY): acota las cursadas en el calendario. */
  cuatrimestreInicio?: string;
  cuatrimestreFin?: string;
  importadaEn: string; // ISO date string
}

/** Resultado del parseo del XLS de plan de estudios. */
export interface PlanParseResult {
  carrera: Omit<Carrera, "id" | "correlatividades" | "cursadas" | "importadaEn">;
  alumno: Alumno | null;
}
