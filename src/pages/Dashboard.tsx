import { useMemo, useState } from "react";
import { BookOpen, Clock, ChevronDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Cursada, Materia, Turno } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { notaColorVar, estaAprobada, redondearPromedio, colorPromedio } from "@/lib/estado";
import { useActiveCarrera, useAppStore } from "@/store/useAppStore";
import { GraduationCap } from "lucide-react";

const GRADS = [
  "linear-gradient(90deg,#4ade80,#22d3ee)",
  "linear-gradient(90deg,#38bdf8,#818cf8)",
  "linear-gradient(90deg,#f59e0b,#f87171)",
  "linear-gradient(90deg,#a78bfa,#f472b6)",
  "linear-gradient(90deg,#34d399,#60a5fa)",
  "linear-gradient(90deg,#fb923c,#facc15)",
];
const gradFor = (anio: number) => GRADS[(anio - 1) % GRADS.length];

function StatCard({
  title,
  value,
  sub,
  color,
  children,
}: {
  title: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-3 py-4 sm:gap-6 sm:py-6">
      <CardHeader className="pb-1 sm:pb-2">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {value !== undefined && (
          <div
            className="text-2xl font-bold leading-none sm:text-3xl"
            style={color ? { color } : undefined}
          >
            {value}
          </div>
        )}
        {sub && <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{sub}</div>}
        {children}
      </CardContent>
    </Card>
  );
}

function AvanceCard({ titulo, pct, gradient }: { titulo: string; pct: number; gradient: string }) {
  return (
    <Card className="gap-3 py-4 sm:gap-6 sm:py-6">
      <CardHeader className="pb-1 sm:pb-2">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-end justify-between">
          <div className="text-2xl font-bold leading-none sm:text-3xl">
            {pct}%
            <span className="ml-1 text-sm font-normal text-muted-foreground">logrado</span>
          </div>
          <div className="text-sm text-muted-foreground">{100 - pct}% pendiente</div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: gradient }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TURNOS: { id: Turno; label: string; horas: string }[] = [
  { id: "manana", label: "Mañana", horas: "08–12 hs" },
  { id: "tarde", label: "Tarde", horas: "14–18 hs" },
  { id: "noche", label: "Noche", horas: "18–22 hs" },
];
export function Dashboard({ onNavigate }: { onNavigate?: (p: "plan") => void }) {
  const carrera = useActiveCarrera();
  const alumno = useAppStore((s) => s.alumno);
  const setFocusMateria = useAppStore((s) => s.setFocusMateria);
  const [editCursada, setEditCursada] = useState<Materia | null>(null);

  // Ir al Plan de Estudios y resaltar la materia.
  const irAPlan = (codigo: string) => {
    setFocusMateria(codigo);
    onNavigate?.("plan");
  };

  const materias = carrera?.materias ?? [];
  const correlatividades = carrera?.correlatividades ?? {};
  const cursadas = carrera?.cursadas ?? {};

  const stats = useMemo(() => {
    const principales = materias.filter((m) => m.esPrincipal);
    const aprobadas = principales.filter((m) => estaAprobada(m.estado));
    // En curso incluye ACA/AU: son materias que se cursan y ocupan un día.
    const enCurso = materias.filter((m) => m.estado === "en_curso");
    const pendientes = principales.filter((m) => m.estado === "pendiente");

    // Notas del plan (solo materias con nota numérica). Consistente con el resto.
    const notas = principales
      .map((m) => m.nota)
      .filter((n): n is number => typeof n === "number");
    const promedio =
      notas.length > 0 ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2) : "—";
    const pct = principales.length > 0 ? Math.round((aprobadas.length / principales.length) * 100) : 0;

    const anios = [
      ...new Set(principales.map((m) => m.anio).filter((a): a is number => a != null)),
    ].sort((a, b) => a - b);
    const porAnio = anios.map((a) => {
      const m = principales.filter((x) => x.anio === a);
      return { anio: a, total: m.length, aprobadas: m.filter((x) => estaAprobada(x.estado)).length };
    });

    const notasDist = [10, 9, 8, 7, 6].map((n) => ({
      nota: n,
      count: notas.filter((x) => x === n).length,
    }));

    const tecnico = principales.filter((m) => m.tituloIntermedio);
    const tecnicoAprob = tecnico.filter((m) => estaAprobada(m.estado));
    const tecnicoPct = tecnico.length > 0 ? Math.round((tecnicoAprob.length / tecnico.length) * 100) : 0;

    return {
      principales,
      aprobadas,
      enCurso,
      pendientes,
      notas,
      promedio,
      pct,
      porAnio,
      notasDist,
      tecnico,
      tecnicoAprob,
      tecnicoPct,
    };
  }, [materias]);

  if (!carrera) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Sin carrera activa"
        text="Importá el plan de estudios de tu carrera desde el SIU Guaraní para ver tu progreso."
      />
    );
  }

  return (
    <div className="space-y-6">
      {alumno && (
        <div className="rounded-lg border border-en-curso/20 bg-en-curso/10 px-4 py-3 text-sm text-en-curso">
          👤 <strong>{alumno.nombre}</strong>
          {alumno.legajo && <> — Legajo: {alumno.legajo}</>} — {carrera.nombre}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Materias aprobadas"
          value={stats.aprobadas.length}
          sub={`de ${stats.principales.length} del plan`}
          color="var(--aprobado)"
        />
        <StatCard
          title="Materias restantes"
          value={stats.pendientes.length}
          sub="por cursar"
          color="var(--pendiente)"
        />
        <StatCard
          title="Materias en curso"
          value={stats.enCurso.length}
          sub="este cuatrimestre"
          color="var(--en-curso)"
        />
        <StatCard
          title="Promedio general"
          value={stats.promedio}
          sub={`sobre ${stats.notas.length} calificaciones`}
          color={stats.notas.length > 0 ? colorPromedio(parseFloat(stats.promedio)) : undefined}
        />
      </div>

      {stats.enCurso.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="size-4" /> Materias en curso este cuatrimestre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {stats.enCurso.map((m) => (
                <button key={m.id} onClick={() => setEditCursada(m)}>
                  <Badge
                    variant="outline"
                    className="cursor-pointer bg-en-curso/15 text-en-curso border-en-curso/20 hover:bg-en-curso/25"
                  >
                    {m.nombre}
                    {cursadas[m.id]?.comision ? ` · Com ${cursadas[m.id].comision}` : ""}
                  </Badge>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clic en una materia para cargar comisión, días y turno.
            </p>
            <WeeklyGrid materias={stats.enCurso} cursadas={cursadas} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AvanceCard
          titulo="Avance Licenciatura"
          pct={stats.pct}
          gradient="linear-gradient(90deg,#4ade80,#38bdf8)"
        />
        <AvanceCard
          titulo="Avance título intermedio"
          pct={stats.tecnicoPct}
          gradient="linear-gradient(90deg,#a78bfa,#f472b6)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avance por año
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.porAnio.map((a) => (
              <div key={a.anio}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <strong>{a.anio}° año</strong>
                  <span className="text-muted-foreground">
                    {a.aprobadas}/{a.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: a.total > 0 ? `${(a.aprobadas / a.total) * 100}%` : "0%",
                      background: gradFor(a.anio),
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Distribución de notas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.notasDist.map((d) => (
              <div key={d.nota} className="flex items-center gap-2">
                <div
                  className="w-5 text-right text-sm font-semibold"
                  style={{ color: notaColorVar(d.nota) }}
                >
                  {d.nota}
                </div>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded opacity-80 transition-all"
                    style={{
                      width:
                        stats.notas.length > 0
                          ? `${(d.count / stats.notas.length) * 100}%`
                          : "0%",
                      background: notaColorVar(d.nota),
                    }}
                  />
                </div>
                <div className="w-6 text-xs text-muted-foreground">{d.count}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {carrera && (
        <EnCursoModal
          materia={editCursada}
          carreraId={carrera.id}
          cursada={editCursada ? cursadas[editCursada.id] : undefined}
          onClose={() => setEditCursada(null)}
        />
      )}

      {stats.pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="size-4" /> Próximas materias a cursar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Correlativas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.pendientes.slice(0, 8).map((m) => {
                  const corrs = correlatividades[m.codigo] ?? [];
                  const habilitada = corrs.every((c) => {
                    const mat = materias.find((x) => x.codigo === c);
                    return mat ? estaAprobada(mat.estado) : false;
                  });
                  return (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer"
                      onClick={() => irAPlan(m.codigo)}
                      title={`Ver ${m.nombre} en el Plan`}
                    >
                      <TableCell className="font-medium">{m.nombre}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {m.codigo}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.anio}°</TableCell>
                      <TableCell>
                        {habilitada ? (
                          <Badge variant="outline" className="bg-aprobado/15 text-aprobado border-aprobado/20">
                            ✓ Habilitada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning/15 text-warning border-warning/20">
                            Correlativas pendientes
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Cuadrícula semanal de materias en curso ─────────────────────────────────

function WeeklyGrid({
  materias,
  cursadas,
}: {
  materias: Materia[];
  cursadas: Record<string, Cursada>;
}) {
  const conHorario = materias
    .map((m) => ({ m, c: cursadas[m.id] }))
    .filter((x) => x.c?.turno && x.c.dias && x.c.dias.length > 0);
  if (conHorario.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        Todavía no cargaste días/turno de ninguna materia en curso.
      </div>
    );
  }
  const enCelda = (dia: string, t: Turno) =>
    conHorario.filter((x) => x.c.turno === t && x.c.dias!.includes(dia));

  // Solo mostrar los turnos que tienen alguna materia en curso.
  const turnosUsados = TURNOS.filter((t) => conHorario.some((x) => x.c.turno === t.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-24 border-b bg-muted/40 px-2 py-2 text-left text-muted-foreground">Turno</th>
            {DIAS.map((d) => (
              <th key={d} className="border-b bg-muted/40 px-2 py-2 text-center text-muted-foreground">
                {d.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {turnosUsados.map((t) => (
            <tr key={t.id}>
              <td className="border-b bg-muted/20 px-2 py-2 align-top">
                <div className="font-semibold">{t.label}</div>
                <div className="text-[10px] text-muted-foreground">{t.horas}</div>
              </td>
              {DIAS.map((d) => (
                <td key={d} className="min-w-24 border-b p-1 align-top">
                  {enCelda(d, t.id).map(({ m, c }) => (
                    <div
                      key={m.id}
                      className="mb-1 rounded border-l-2 border-en-curso bg-en-curso/10 px-1.5 py-1 leading-tight"
                    >
                      <div className="font-medium text-en-curso">{m.nombre}</div>
                      {(c.comision || c.aula) && (
                        <div className="text-[10px] text-muted-foreground">
                          {c.comision && <>Com {c.comision}</>}
                          {c.comision && c.aula && " · "}
                          {c.aula && <>Aula {c.aula}</>}
                        </div>
                      )}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </button>
  );
}

function Acordeon({
  titulo,
  open,
  onToggle,
  children,
}: {
  titulo: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
      >
        {titulo}
        <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 px-3 pb-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Fila nota + fecha (parcial/recuperatorio/final), con opción de quitar. */
function ExamRow({
  label,
  nota,
  setNota,
  fecha,
  setFecha,
  onRemove,
}: {
  label: string;
  nota: string;
  setNota: (v: string) => void;
  fecha: string;
  setFecha: (v: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Quitar"
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          className="flex-1"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="nota / resultado"
        />
        <Input
          className="w-32"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          placeholder="DD/MM/AAAA"
        />
      </div>
    </div>
  );
}

// ─── Modal de cursada (comisión / días / turno) ──────────────────────────────

function EnCursoModal({
  materia,
  carreraId,
  cursada,
  onClose,
}: {
  materia: Materia | null;
  carreraId: string;
  cursada: Cursada | undefined;
  onClose: () => void;
}) {
  const updateCursada = useAppStore((s) => s.updateCursada);
  const [comision, setComision] = useState("");
  const [dias, setDias] = useState<string[]>([]);
  const [turno, setTurno] = useState<Turno | undefined>(undefined);
  const [aula, setAula] = useState("");
  const [profesores, setProfesores] = useState("");
  const [parcial1, setParcial1] = useState("");
  const [parcial2, setParcial2] = useState("");
  const [recuperatorio1, setRecuperatorio1] = useState("");
  const [recuperatorio2, setRecuperatorio2] = useState("");
  const [final, setFinal] = useState("");
  const [fechaParcial1, setFechaParcial1] = useState("");
  const [fechaParcial2, setFechaParcial2] = useState("");
  const [fechaRec1, setFechaRec1] = useState("");
  const [fechaRec2, setFechaRec2] = useState("");
  const [fechaExamen, setFechaExamen] = useState("");
  // Campos opcionales visibles (recuperatorios / final): ocultos salvo que tengan valor.
  const [showRec1, setShowRec1] = useState(false);
  const [showRec2, setShowRec2] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  // Acordeón: solo una sección abierta a la vez.
  const [seccion, setSeccion] = useState<"info" | "examenes">("info");
  const [lastId, setLastId] = useState<string | null>(null);

  if (materia && materia.id !== lastId) {
    setLastId(materia.id);
    setSeccion("info");
    setComision(cursada?.comision ?? "");
    setDias(cursada?.dias ?? []);
    setTurno(cursada?.turno);
    setAula(cursada?.aula ?? "");
    setProfesores(cursada?.profesores ?? "");
    setParcial1(cursada?.parcial1 ?? "");
    setParcial2(cursada?.parcial2 ?? "");
    setRecuperatorio1(cursada?.recuperatorio1 ?? "");
    setRecuperatorio2(cursada?.recuperatorio2 ?? "");
    setFinal(cursada?.final ?? "");
    setFechaParcial1(cursada?.fechaParcial1 ?? "");
    setFechaParcial2(cursada?.fechaParcial2 ?? "");
    setFechaRec1(cursada?.fechaRecuperatorio1 ?? "");
    setFechaRec2(cursada?.fechaRecuperatorio2 ?? "");
    setFechaExamen(cursada?.fechaExamen ?? "");
    setShowRec1(!!cursada?.recuperatorio1 || !!cursada?.fechaRecuperatorio1);
    setShowRec2(!!cursada?.recuperatorio2 || !!cursada?.fechaRecuperatorio2);
    setShowFinal(!!cursada?.final || !!cursada?.fechaExamen);
  }

  const quitarRec1 = () => {
    setShowRec1(false);
    setRecuperatorio1("");
    setFechaRec1("");
  };
  const quitarRec2 = () => {
    setShowRec2(false);
    setRecuperatorio2("");
    setFechaRec2("");
  };
  const quitarFinal = () => {
    setShowFinal(false);
    setFinal("");
    setFechaExamen("");
  };

  // Promedio de los dos parciales (redondeado: ≥.5 sube, ≤.4 baja).
  const promedio = (() => {
    const nums = [parcial1, parcial2]
      .map((x) => parseFloat(x.replace(",", ".")))
      .filter((n) => !Number.isNaN(n));
    if (nums.length === 0) return null;
    return redondearPromedio(nums.reduce((a, b) => a + b, 0) / nums.length);
  })();

  const toggleDia = (d: string) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = () => {
    if (!materia) return;
    updateCursada(carreraId, materia.id, {
      comision: comision.trim() || undefined,
      dias: dias.length ? dias : undefined,
      turno,
      aula: aula.trim() || undefined,
      profesores: profesores.trim() || undefined,
      parcial1: parcial1.trim() || undefined,
      parcial2: parcial2.trim() || undefined,
      recuperatorio1: recuperatorio1.trim() || undefined,
      recuperatorio2: recuperatorio2.trim() || undefined,
      final: final.trim() || undefined,
      fechaParcial1: fechaParcial1.trim() || undefined,
      fechaParcial2: fechaParcial2.trim() || undefined,
      fechaRecuperatorio1: fechaRec1.trim() || undefined,
      fechaRecuperatorio2: fechaRec2.trim() || undefined,
      fechaExamen: fechaExamen.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={!!materia} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">{materia?.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {/* Acordeón 1: info de la materia */}
          <Acordeon
            titulo="Información de la materia"
            open={seccion === "info"}
            onToggle={() => setSeccion("info")}
          >
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label>Comisión</Label>
                <Input value={comision} onChange={(e) => setComision(e.target.value)} placeholder="ej: 1" />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Aula</Label>
                <Input value={aula} onChange={(e) => setAula(e.target.value)} placeholder="ej: 12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profesores</Label>
              <Input
                value={profesores}
                onChange={(e) => setProfesores(e.target.value)}
                placeholder="Nombres, separados por coma"
              />
            </div>

            <div className="space-y-2">
              <Label>Días</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((d) => {
                  const on = dias.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDia(d)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs transition-colors",
                        on
                          ? "border-en-curso bg-en-curso/15 text-en-curso"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={turno ?? ""} onValueChange={(v) => setTurno(v as Turno)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí turno" />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label} ({t.horas})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Acordeon>

          {/* Acordeón 2: exámenes */}
          <Acordeon
            titulo="Exámenes"
            open={seccion === "examenes"}
            onToggle={() => setSeccion("examenes")}
          >
            <ExamRow label="Parcial 1" nota={parcial1} setNota={setParcial1} fecha={fechaParcial1} setFecha={setFechaParcial1} />
            <ExamRow label="Parcial 2" nota={parcial2} setNota={setParcial2} fecha={fechaParcial2} setFecha={setFechaParcial2} />

            {promedio !== null && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Promedio de parciales</span>
                <span className="font-bold" style={{ color: colorPromedio(promedio) }}>
                  {promedio}
                </span>
              </div>
            )}

            {showRec1 && (
              <ExamRow label="Recuperatorio 1" nota={recuperatorio1} setNota={setRecuperatorio1} fecha={fechaRec1} setFecha={setFechaRec1} onRemove={quitarRec1} />
            )}
            {showRec2 && (
              <ExamRow label="Recuperatorio 2" nota={recuperatorio2} setNota={setRecuperatorio2} fecha={fechaRec2} setFecha={setFechaRec2} onRemove={quitarRec2} />
            )}
            {showFinal && (
              <ExamRow label="Final" nota={final} setNota={setFinal} fecha={fechaExamen} setFecha={setFechaExamen} onRemove={quitarFinal} />
            )}

            {(!showRec1 || !showRec2 || !showFinal) && (
              <div className="flex flex-wrap gap-1.5">
                {!showRec1 && <AddChip label="+ Recuperatorio 1" onClick={() => setShowRec1(true)} />}
                {!showRec2 && <AddChip label="+ Recuperatorio 2" onClick={() => setShowRec2(true)} />}
                {!showFinal && <AddChip label="+ Final" onClick={() => setShowFinal(true)} />}
              </div>
            )}
          </Acordeon>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
