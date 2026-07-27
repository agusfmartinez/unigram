import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Alumno,
  Carrera,
  EntradaHistoria,
  Materia,
  MateriaOferta,
  PlanParseResult,
} from "@/types";
import { seedCorrelatividades } from "@/lib/correlatividades";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function carreraId(nombre: string, version: string): string {
  return slugify(`${nombre}-${version}`) || slugify(nombre) || "carrera";
}

/** Ordena fechas DD/MM/YYYY -> clave comparable YYYYMMDD. */
function fechaKey(f: string): string {
  return f.split("/").reverse().join("");
}

/** Cruza la historia académica sobre las materias de un plan. */
function mergeEstados(materias: Materia[], historia: EntradaHistoria[]): Materia[] {
  return materias.map((m) => {
    if (!m.codigo) return m;
    const aprobs = historia
      .filter(
        (h) =>
          h.codigo === m.codigo &&
          (h.resultado === "Promocionado" || h.resultado === "Aprobado"),
      )
      .sort((a, b) => fechaKey(b.fecha).localeCompare(fechaKey(a.fecha)));
    const aprob = aprobs[0];
    if (aprob)
      return {
        ...m,
        estado: "aprobado",
        nota: aprob.notaNum ?? m.nota,
        fecha: aprob.fecha || m.fecha,
      };
    const enCurso = historia.find((h) => h.codigo === m.codigo && h.tipo === "En curso");
    if (enCurso) return { ...m, estado: "en_curso" };
    return m;
  });
}

export type ImportPlanResult =
  | { status: "imported"; id: string }
  | { status: "replaced"; id: string }
  | { status: "conflict"; id: string; nombre: string };

// ─── Store ───────────────────────────────────────────────────────────────────

interface AppState {
  carreras: Carrera[];
  carreraActivaId: string | null;
  historia: EntradaHistoria[];
  oferta: MateriaOferta[];
  alumno: Alumno | null;

  importPlan: (result: PlanParseResult, replace?: boolean) => ImportPlanResult;
  importHistoria: (entradas: EntradaHistoria[]) => void;
  importOferta: (list: MateriaOferta[]) => void;
  setCarreraActiva: (id: string) => void;
  updateMateria: (carreraId: string, materiaId: string, patch: Partial<Materia>) => void;
  updateCorrelatividades: (carreraId: string, map: Record<string, string[]>) => void;
  removeCarrera: (id: string) => void;
  clearAll: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
  migrateLegacy: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      carreras: [],
      carreraActivaId: null,
      historia: [],
      oferta: [],
      alumno: null,

      importPlan: (result, replace = false) => {
        const { carrera: base, alumno } = result;
        const id = carreraId(base.nombre, base.version);
        const { carreras, historia } = get();
        const existe = carreras.find((c) => c.id === id);

        if (existe && !replace) {
          return { status: "conflict", id, nombre: base.nombre };
        }

        const nueva: Carrera = {
          ...base,
          id,
          correlatividades: existe
            ? existe.correlatividades
            : seedCorrelatividades(base.nombre, base.codigo),
          importadaEn: new Date().toISOString(),
          materias: mergeEstados(base.materias, historia),
        };

        set({
          carreras: existe
            ? carreras.map((c) => (c.id === id ? nueva : c))
            : [...carreras, nueva],
          carreraActivaId: id,
          alumno: alumno ?? get().alumno,
        });

        return { status: existe ? "replaced" : "imported", id };
      },

      importHistoria: (entradas) => {
        set((s) => ({
          historia: entradas,
          carreras: s.carreras.map((c) => ({
            ...c,
            materias: mergeEstados(c.materias, entradas),
          })),
        }));
      },

      importOferta: (list) => set({ oferta: list }),

      setCarreraActiva: (id) => set({ carreraActivaId: id }),

      updateMateria: (cid, materiaId, patch) =>
        set((s) => ({
          carreras: s.carreras.map((c) =>
            c.id === cid
              ? {
                  ...c,
                  materias: c.materias.map((m) =>
                    m.id === materiaId ? { ...m, ...patch } : m,
                  ),
                }
              : c,
          ),
        })),

      updateCorrelatividades: (cid, map) =>
        set((s) => ({
          carreras: s.carreras.map((c) =>
            c.id === cid ? { ...c, correlatividades: map } : c,
          ),
        })),

      removeCarrera: (id) =>
        set((s) => {
          const carreras = s.carreras.filter((c) => c.id !== id);
          return {
            carreras,
            carreraActivaId:
              s.carreraActivaId === id ? (carreras[0]?.id ?? null) : s.carreraActivaId,
          };
        }),

      clearAll: () =>
        set({
          carreras: [],
          carreraActivaId: null,
          historia: [],
          oferta: [],
          alumno: null,
        }),

      exportBackup: () => {
        const { carreras, carreraActivaId, historia, oferta, alumno } = get();
        return JSON.stringify(
          { version: 1, carreras, carreraActivaId, historia, oferta, alumno },
          null,
          2,
        );
      },

      /**
       * Importa datos del prototipo HTML (claves localStorage `tup_*`) como una
       * carrera única, si el store actual está vacío. Devuelve true si migró algo.
       */
      migrateLegacy: () => {
        if (get().carreras.length > 0) return false;
        try {
          const rawMaterias = localStorage.getItem("tup_materias");
          if (!rawMaterias) return false;
          const materias = JSON.parse(rawMaterias) as Materia[];
          if (!Array.isArray(materias) || materias.length === 0) return false;

          const legacyAlumno = localStorage.getItem("tup_alumno");
          const parsedAlumno = legacyAlumno ? JSON.parse(legacyAlumno) : null;
          const nombreCarrera: string = parsedAlumno?.propuesta || "Carrera importada";
          const historia = JSON.parse(localStorage.getItem("tup_historia") || "[]");
          const oferta = JSON.parse(localStorage.getItem("tup_oferta") || "[]");

          const id = carreraId(nombreCarrera, "");
          const carrera: Carrera = {
            id,
            nombre: nombreCarrera,
            codigo: "",
            version: "",
            universidad: "Universidad Nacional de Hurlingham",
            correlatividades: seedCorrelatividades(nombreCarrera, ""),
            importadaEn: new Date().toISOString(),
            materias,
          };

          set({
            carreras: [carrera],
            carreraActivaId: id,
            historia: Array.isArray(historia) ? historia : [],
            oferta: Array.isArray(oferta) ? oferta : [],
            alumno: parsedAlumno
              ? { nombre: parsedAlumno.nombre ?? "", legajo: parsedAlumno.legajo ?? "" }
              : null,
          });
          return true;
        } catch {
          return false;
        }
      },

      importBackup: (json) => {
        try {
          const data = JSON.parse(json);
          if (!Array.isArray(data.carreras)) return false;
          set({
            carreras: data.carreras,
            carreraActivaId: data.carreraActivaId ?? data.carreras[0]?.id ?? null,
            historia: data.historia ?? [],
            oferta: data.oferta ?? [],
            alumno: data.alumno ?? null,
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "tup-tracker-state",
      version: 1,
    },
  ),
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const useActiveCarrera = (): Carrera | null =>
  useAppStore((s) => s.carreras.find((c) => c.id === s.carreraActivaId) ?? null);

export const useHasData = (): boolean =>
  useAppStore((s) => s.carreras.length > 0 || s.historia.length > 0);

/**
 * Para las materias de la carrera activa, devuelve qué otras carreras comparten
 * ese código (misma materia / equivalencia por código SIU).
 * codigo -> nombres de otras carreras que también la incluyen.
 */
export function codigosCompartidos(
  carreras: Carrera[],
  activaId: string | null,
): Record<string, string[]> {
  const activa = carreras.find((c) => c.id === activaId);
  if (!activa) return {};
  const map: Record<string, string[]> = {};
  for (const m of activa.materias) {
    if (!m.codigo) continue;
    const otras = carreras
      .filter((c) => c.id !== activa.id && c.materias.some((x) => x.codigo === m.codigo))
      .map((c) => c.nombre);
    if (otras.length) map[m.codigo] = otras;
  }
  return map;
}
