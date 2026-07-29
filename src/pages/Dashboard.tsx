import { useMemo, useState } from "react";
import { BookOpen, Clock } from "lucide-react";
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
import type { Materia, Turno } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { notaColorVar, estaAprobada } from "@/lib/estado";
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {value !== undefined && (
          <div className="text-3xl font-bold leading-none" style={color ? { color } : undefined}>
            {value}
          </div>
        )}
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
        {children}
      </CardContent>
    </Card>
  );
}

function AvanceCard({ titulo, pct, gradient }: { titulo: string; pct: number; gradient: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-end justify-between">
          <div className="text-3xl font-bold leading-none">
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

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const TURNOS: { id: Turno; label: string; horas: string }[] = [
  { id: "manana", label: "Mañana", horas: "08–12 hs" },
  { id: "tarde", label: "Tarde", horas: "14–18 hs" },
  { id: "noche", label: "Noche", horas: "18–22 hs" },
];
export function Dashboard() {
  const carrera = useActiveCarrera();
  const alumno = useAppStore((s) => s.alumno);
  const [editCursada, setEditCursada] = useState<Materia | null>(null);

  const materias = carrera?.materias ?? [];
  const correlatividades = carrera?.correlatividades ?? {};

  const stats = useMemo(() => {
    const principales = materias.filter((m) => m.esPrincipal);
    const aprobadas = principales.filter((m) => estaAprobada(m.estado));
    const enCurso = principales.filter((m) => m.estado === "en_curso");
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
          color={notaColorVar(parseFloat(stats.promedio) || null)}
        />
      </div>

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
                    {m.comision ? ` · Com ${m.comision}` : ""}
                  </Badge>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clic en una materia para cargar comisión, días y turno.
            </p>
            <WeeklyGrid materias={stats.enCurso} />
          </CardContent>
        </Card>
      )}

      {carrera && (
        <EnCursoModal
          materia={editCursada}
          carreraId={carrera.id}
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
                  const corrsOk = corrs.every((c) => {
                    const mat = materias.find((x) => x.codigo === c);
                    return mat ? estaAprobada(mat.estado) : false;
                  });
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.nombre}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {m.codigo}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.anio}°</TableCell>
                      <TableCell>
                        {corrs.length === 0 ? (
                          <Badge variant="outline" className="bg-aprobado/15 text-aprobado border-aprobado/20">
                            Sin correlativas
                          </Badge>
                        ) : corrsOk ? (
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

function WeeklyGrid({ materias }: { materias: Materia[] }) {
  const conHorario = materias.filter((m) => m.turno && m.dias && m.dias.length > 0);
  if (conHorario.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        Todavía no cargaste días/turno de ninguna materia en curso.
      </div>
    );
  }
  const enCelda = (dia: string, t: Turno) =>
    conHorario.filter((m) => m.turno === t && m.dias!.includes(dia));

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
          {TURNOS.map((t) => (
            <tr key={t.id}>
              <td className="border-b bg-muted/20 px-2 py-2 align-top">
                <div className="font-semibold">{t.label}</div>
                <div className="text-[10px] text-muted-foreground">{t.horas}</div>
              </td>
              {DIAS.map((d) => (
                <td key={d} className="min-w-24 border-b p-1 align-top">
                  {enCelda(d, t.id).map((m) => (
                    <div
                      key={m.id}
                      className="mb-1 rounded border-l-2 border-en-curso bg-en-curso/10 px-1.5 py-1 leading-tight"
                    >
                      <div className="font-medium text-en-curso">{m.nombre}</div>
                      {m.comision && (
                        <div className="text-[10px] text-muted-foreground">Com {m.comision}</div>
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

// ─── Modal de cursada (comisión / días / turno) ──────────────────────────────

function EnCursoModal({
  materia,
  carreraId,
  onClose,
}: {
  materia: Materia | null;
  carreraId: string;
  onClose: () => void;
}) {
  const updateMateria = useAppStore((s) => s.updateMateria);
  const [comision, setComision] = useState("");
  const [dias, setDias] = useState<string[]>([]);
  const [turno, setTurno] = useState<Turno | undefined>(undefined);
  const [lastId, setLastId] = useState<string | null>(null);

  if (materia && materia.id !== lastId) {
    setLastId(materia.id);
    setComision(materia.comision ?? "");
    setDias(materia.dias ?? []);
    setTurno(materia.turno);
  }

  const toggleDia = (d: string) =>
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = () => {
    if (!materia) return;
    updateMateria(carreraId, materia.id, {
      comision: comision.trim() || undefined,
      dias: dias.length ? dias : undefined,
      turno,
    });
    onClose();
  };

  return (
    <Dialog open={!!materia} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">{materia?.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Comisión</Label>
            <Input value={comision} onChange={(e) => setComision(e.target.value)} placeholder="ej: 1" />
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
