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
import { SEED_CARRERA } from "@/data/seedCarrera";

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

const esEquiv = (h: EntradaHistoria) =>
  /equivalencia/i.test(h.tipo) || /equivalencia/i.test(h.resultado);
const esAprobado = (h: EntradaHistoria) =>
  h.resultado === "Promocionado" || h.resultado === "Aprobado";
const esEnCurso = (h: EntradaHistoria) =>
  /en curso/i.test(h.tipo) || /en curso/i.test(h.resultado);

const masReciente = (a: EntradaHistoria, b: EntradaHistoria) =>
  fechaKey(b.fecha).localeCompare(fechaKey(a.fecha));

/**
 * Cruza la historia académica sobre las materias de un plan. Solo produce los
 * 4 estados: aprobado, equivalencia, en_curso, pendiente. Prioridad:
 * aprobado-con-nota → equivalencia → aprobado-sin-nota → en curso.
 */
function mergeEstados(materias: Materia[], historia: EntradaHistoria[]): Materia[] {
  return materias.map((m) => {
    if (!m.codigo) return m;
    const entries = historia.filter((h) => h.codigo === m.codigo);

    // La nota manda: si hay una entrada con nota numérica, la materia está
    // aprobada con esa nota (aunque el tipo diga "Equivalencia").
    const conNota = entries.filter((h) => h.notaNum != null).sort(masReciente);
    if (conNota[0])
      return { ...m, estado: "aprobado", nota: conNota[0].notaNum, fecha: conNota[0].fecha || m.fecha };

    const equiv = entries.filter(esEquiv).sort(masReciente);
    if (equiv[0])
      return { ...m, estado: "equivalencia", nota: null, fecha: equiv[0].fecha || m.fecha };

    const aprob = entries.filter(esAprobado).sort(masReciente);
    if (aprob[0])
      return { ...m, estado: "aprobado", nota: aprob[0].notaNum ?? m.nota, fecha: aprob[0].fecha || m.fecha };

    if (entries.some(esEnCurso)) return { ...m, estado: "en_curso" };

    // El import no marca esta materia como cursada/aprobada. La historia nueva
    // manda: si venía "en curso", se limpia (dejó de cursarse) junto con su
    // comisión/días/turno. Aprobadas y equivalencias previas no se tocan.
    if (m.estado === "en_curso")
      return { ...m, estado: "pendiente", comision: undefined, dias: undefined, turno: undefined };
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
  seedLoaded: boolean;
  /** Código de materia a resaltar al entrar al Plan (navegación entre páginas). */
  focusMateria: string | null;

  loadSeed: () => "loaded" | "exists";
  loadSeedPlan: (plan: Carrera) => "loaded" | "exists";
  setFocusMateria: (codigo: string | null) => void;
  setAlumno: (alumno: Alumno | null) => void;
  importPlan: (result: PlanParseResult, replace?: boolean) => ImportPlanResult;
  importHistoria: (entradas: EntradaHistoria[], alumno?: Alumno | null) => void;
  importOferta: (list: MateriaOferta[]) => void;
  setCarreraActiva: (id: string) => void;
  updateMateria: (carreraId: string, materiaId: string, patch: Partial<Materia>) => void;
  updateCorrelatividades: (carreraId: string, map: Record<string, string[]>) => void;
  removeCarrera: (id: string) => void;
  clearAll: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      carreras: [],
      carreraActivaId: null,
      historia: [],
      oferta: [],
      alumno: null,
      seedLoaded: false,
      focusMateria: null,

      setFocusMateria: (codigo) => set({ focusMateria: codigo }),

      /** Carga la plantilla de la Licenciatura (si no está ya) y la activa. */
      loadSeed: () => get().loadSeedPlan(SEED_CARRERA),

      /** Carga un plan precargado del catálogo (si no está ya) y lo activa. */
      loadSeedPlan: (plan) => {
        const { carreras, historia } = get();
        if (carreras.some((c) => c.id === plan.id)) {
          set({ carreraActivaId: plan.id, seedLoaded: true });
          return "exists";
        }
        const carrera: Carrera = {
          ...plan,
          importadaEn: new Date().toISOString(),
          // Cruzar la historia ya importada sobre el plan nuevo.
          materias: mergeEstados(plan.materias, historia),
        };
        set({
          carreras: [...carreras, carrera],
          carreraActivaId: carrera.id,
          seedLoaded: true,
        });
        return "loaded";
      },

      setAlumno: (alumno) => set({ alumno }),

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

      importHistoria: (entradas, alumno) => {
        set((s) => ({
          historia: entradas,
          alumno: alumno ?? s.alumno,
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
