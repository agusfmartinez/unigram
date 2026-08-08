import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Alumno,
  Carrera,
  Cursada,
  EntradaHistoria,
  Materia,
  MateriaOferta,
  PlanParseResult,
} from "@/types";
import { seedCorrelatividades } from "@/lib/correlatividades";
import { SEED_CARRERA, SEED_PLANES } from "@/data/seedCarrera";

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
 * Descarta datos de cursada de materias que ya no están en curso. Las cursadas
 * viven aparte del plan y solo tienen sentido mientras estado === "en_curso".
 */
function prunearCursadas(
  materias: Materia[],
  cursadas: Record<string, Cursada>,
): Record<string, Cursada> {
  const enCurso = new Set(materias.filter((m) => m.estado === "en_curso").map((m) => m.id));
  const out: Record<string, Cursada> = {};
  for (const [id, c] of Object.entries(cursadas)) {
    if (enCurso.has(id)) out[id] = c;
  }
  return out;
}

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
    // manda: si venía "en curso", vuelve a pendiente. Su cursada (aparte) se
    // limpia con prunearCursadas. Aprobadas y equivalencias previas no se tocan.
    if (m.estado === "en_curso") return { ...m, estado: "pendiente" };
    return m;
  });
}

const CURSADA_KEYS = [
  "comision", "dias", "turno", "aula", "profesores",
  "parcial1", "parcial2", "fechaParcial1", "fechaParcial2", "fechaExamen",
] as const;

/**
 * Normaliza una carrera al modelo con `cursadas` aparte. Migra el modelo viejo
 * (campos de cursada dentro de cada materia) moviéndolos a `carrera.cursadas`
 * por id de materia, y los quita de la materia. Idempotente.
 */
function migrarCarrera(c: Carrera): Carrera {
  if (c.cursadas && typeof c.cursadas === "object") return c;
  const cursadas: Record<string, Cursada> = {};
  const materias = (c.materias ?? []).map((m) => {
    const mm = m as Materia & Record<string, unknown>;
    const cur: Cursada = {};
    let hasAny = false;
    for (const k of CURSADA_KEYS) {
      if (mm[k] !== undefined) {
        (cur as Record<string, unknown>)[k] = mm[k];
        delete mm[k];
        hasAny = true;
      }
    }
    if (hasAny && m.estado === "en_curso") cursadas[m.id] = cur;
    return mm as Materia;
  });
  return { ...c, materias, cursadas };
}

/**
 * Rellena `nombreAnterior` en las materias de una carrera desde la plantilla
 * del catálogo (por id de carrera + código de materia). Solo completa las que
 * están vacías: nunca pisa un valor cargado por el usuario. Idempotente.
 */
function aplicarNombresAnteriores(c: Carrera): Carrera {
  const plan = SEED_PLANES.find((p) => p.id === c.id);
  if (!plan) return c;
  const mapa = new Map(
    plan.materias.filter((m) => m.nombreAnterior).map((m) => [m.codigo, m.nombreAnterior!]),
  );
  if (mapa.size === 0) return c;
  let changed = false;
  const materias = c.materias.map((m) => {
    if (!m.nombreAnterior && mapa.has(m.codigo)) {
      changed = true;
      return { ...m, nombreAnterior: mapa.get(m.codigo) };
    }
    return m;
  });
  return changed ? { ...c, materias } : c;
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
  /** Última modificación de datos (ISO). Para sincronizar con Drive por fecha. */
  updatedAt: string;

  loadSeed: () => "loaded" | "exists";
  loadSeedPlan: (plan: Carrera) => "loaded" | "exists";
  setFocusMateria: (codigo: string | null) => void;
  setAlumno: (alumno: Alumno | null) => void;
  importPlan: (result: PlanParseResult, replace?: boolean) => ImportPlanResult;
  importHistoria: (entradas: EntradaHistoria[], alumno?: Alumno | null) => void;
  importOferta: (list: MateriaOferta[]) => void;
  setCarreraActiva: (id: string) => void;
  updateMateria: (carreraId: string, materiaId: string, patch: Partial<Materia>) => void;
  updateCursada: (carreraId: string, materiaId: string, patch: Partial<Cursada>) => void;
  updateCuatrimestre: (carreraId: string, inicio?: string, fin?: string) => void;
  updateCorrelatividades: (carreraId: string, map: Record<string, string[]>) => void;
  removeCarrera: (id: string) => void;
  clearAll: () => void;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
}

// Rename de clave de storage (tup-tracker-state → unigram-state) sin perder datos.
// Copia la clave vieja una única vez y luego la elimina para no dejar basura.
try {
  if (typeof localStorage !== "undefined") {
    const viejo = localStorage.getItem("tup-tracker-state");
    if (viejo) {
      if (!localStorage.getItem("unigram-state")) {
        localStorage.setItem("unigram-state", viejo);
      }
      localStorage.removeItem("tup-tracker-state");
    }
  }
} catch {
  /* storage no disponible */
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
      updatedAt: "",

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
        const materias = mergeEstados(plan.materias, historia);
        const carrera: Carrera = {
          ...plan,
          importadaEn: new Date().toISOString(),
          // Cruzar la historia ya importada sobre el plan nuevo.
          materias,
          cursadas: prunearCursadas(materias, plan.cursadas ?? {}),
        };
        // Cargar la plantilla NO cuenta como cambio de datos del usuario: no toca
        // `updatedAt`. Así un dispositivo recién abierto (solo seed) no "gana" la
        // sincronización y trae el backup real de Drive.
        set({
          carreras: [...carreras, carrera],
          carreraActivaId: carrera.id,
          seedLoaded: true,
        });
        return "loaded";
      },

      setAlumno: (alumno) => set({ alumno, updatedAt: new Date().toISOString() }),

      importPlan: (result, replace = false) => {
        const { carrera: base, alumno } = result;
        const id = carreraId(base.nombre, base.version);
        const { carreras, historia } = get();
        const existe = carreras.find((c) => c.id === id);

        if (existe && !replace) {
          return { status: "conflict", id, nombre: base.nombre };
        }

        const materias = mergeEstados(base.materias, historia);
        const nueva: Carrera = {
          ...base,
          id,
          correlatividades: existe
            ? existe.correlatividades
            : seedCorrelatividades(base.nombre, base.codigo),
          cursadas: prunearCursadas(materias, existe?.cursadas ?? {}),
          importadaEn: new Date().toISOString(),
          materias,
        };

        set({
          carreras: existe
            ? carreras.map((c) => (c.id === id ? nueva : c))
            : [...carreras, nueva],
          carreraActivaId: id,
          alumno: alumno ?? get().alumno,
          updatedAt: new Date().toISOString(),
        });

        return { status: existe ? "replaced" : "imported", id };
      },

      importHistoria: (entradas, alumno) => {
        set((s) => ({
          historia: entradas,
          alumno: alumno ?? s.alumno,
          carreras: s.carreras.map((c) => {
            const materias = mergeEstados(c.materias, entradas);
            return { ...c, materias, cursadas: prunearCursadas(materias, c.cursadas) };
          }),
          updatedAt: new Date().toISOString(),
        }));
      },

      importOferta: (list) => set({ oferta: list, updatedAt: new Date().toISOString() }),

      setCarreraActiva: (id) => set({ carreraActivaId: id }),

      updateMateria: (cid, materiaId, patch) =>
        set((s) => ({
          carreras: s.carreras.map((c) => {
            if (c.id !== cid) return c;
            const materias = c.materias.map((m) =>
              m.id === materiaId ? { ...m, ...patch } : m,
            );
            // Si la materia dejó de estar en curso, se borra su cursada.
            const cursadas =
              patch.estado && patch.estado !== "en_curso"
                ? prunearCursadas(materias, c.cursadas)
                : c.cursadas;
            return { ...c, materias, cursadas };
          }),
          updatedAt: new Date().toISOString(),
        })),

      updateCursada: (cid, materiaId, patch) =>
        set((s) => ({
          carreras: s.carreras.map((c) =>
            c.id === cid
              ? {
                  ...c,
                  cursadas: {
                    ...c.cursadas,
                    [materiaId]: { ...c.cursadas[materiaId], ...patch },
                  },
                }
              : c,
          ),
          updatedAt: new Date().toISOString(),
        })),

      updateCuatrimestre: (cid, inicio, fin) =>
        set((s) => ({
          carreras: s.carreras.map((c) =>
            c.id === cid
              ? { ...c, cuatrimestreInicio: inicio || undefined, cuatrimestreFin: fin || undefined }
              : c,
          ),
          updatedAt: new Date().toISOString(),
        })),

      updateCorrelatividades: (cid, map) =>
        set((s) => ({
          carreras: s.carreras.map((c) =>
            c.id === cid ? { ...c, correlatividades: map } : c,
          ),
          updatedAt: new Date().toISOString(),
        })),

      removeCarrera: (id) =>
        set((s) => {
          const carreras = s.carreras.filter((c) => c.id !== id);
          return {
            carreras,
            carreraActivaId:
              s.carreraActivaId === id ? (carreras[0]?.id ?? null) : s.carreraActivaId,
            updatedAt: new Date().toISOString(),
          };
        }),

      clearAll: () =>
        // updatedAt vacío: borrar datos deja el dispositivo "fresco". Así el
        // próximo sync trae de Drive en vez de pisar la nube con el vacío.
        set({
          carreras: [],
          carreraActivaId: null,
          historia: [],
          oferta: [],
          alumno: null,
          seedLoaded: false,
          updatedAt: "",
        }),

      exportBackup: () => {
        const { carreras, carreraActivaId, historia, oferta, alumno, updatedAt } = get();
        return JSON.stringify(
          { version: 2, updatedAt, carreras, carreraActivaId, historia, oferta, alumno },
          null,
          2,
        );
      },

      importBackup: (json) => {
        try {
          const data = JSON.parse(json);
          if (!Array.isArray(data.carreras)) return false;
          set({
            carreras: (data.carreras as Carrera[]).map(migrarCarrera).map(aplicarNombresAnteriores),
            carreraActivaId: data.carreraActivaId ?? data.carreras[0]?.id ?? null,
            historia: data.historia ?? [],
            oferta: data.oferta ?? [],
            alumno: data.alumno ?? null,
            // Conserva la fecha del backup (para comparar en la sincronización).
            updatedAt: data.updatedAt ?? new Date().toISOString(),
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "unigram-state",
      version: 3,
      // v1→v2: cursada aparte del plan. v2→v3: rellenar `nombreAnterior` desde
      // la plantilla sin perder datos del usuario.
      migrate: (persisted) => {
        const s = persisted as { carreras?: Carrera[] } | undefined;
        if (s && Array.isArray(s.carreras)) {
          s.carreras = s.carreras.map(migrarCarrera).map(aplicarNombresAnteriores);
        }
        return s as AppState;
      },
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
