import { useMemo } from "react";
import { BookOpen, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export function Dashboard() {
  const carrera = useActiveCarrera();
  const historia = useAppStore((s) => s.historia);
  const alumno = useAppStore((s) => s.alumno);

  const materias = carrera?.materias ?? [];
  const correlatividades = carrera?.correlatividades ?? {};

  const stats = useMemo(() => {
    const principales = materias.filter((m) => m.esPrincipal);
    const aprobadas = principales.filter((m) => estaAprobada(m.estado));
    const enCurso = principales.filter((m) => m.estado === "en_curso");
    const pendientes = principales.filter((m) => m.estado === "pendiente");

    const notasAprobadas = historia.filter((h) => h.notaNum && h.tipo !== "En curso");
    const promedio =
      notasAprobadas.length > 0
        ? (notasAprobadas.reduce((s, h) => s + (h.notaNum ?? 0), 0) / notasAprobadas.length).toFixed(2)
        : "—";
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
      count: notasAprobadas.filter((h) => h.notaNum === n).length,
    }));

    return { principales, aprobadas, enCurso, pendientes, notasAprobadas, promedio, pct, porAnio, notasDist };
  }, [materias, historia]);

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
          title="En cursada"
          value={stats.enCurso.length}
          sub="materias este cuatrimestre"
          color="var(--en-curso)"
        />
        <StatCard
          title="Promedio general"
          value={stats.promedio}
          sub={`sobre ${stats.notasAprobadas.length} calificaciones`}
          color={notaColorVar(parseFloat(stats.promedio) || null)}
        />
        <StatCard title="Avance de carrera" value={`${stats.pct}%`}>
          <div className="mt-3">
            <Progress value={stats.pct} />
          </div>
        </StatCard>
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
                        stats.notasAprobadas.length > 0
                          ? `${(d.count / stats.notasAprobadas.length) * 100}%`
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
          <CardContent className="flex flex-wrap gap-2">
            {stats.enCurso.map((m) => (
              <Badge key={m.id} variant="outline" className="bg-en-curso/15 text-en-curso border-en-curso/20">
                {m.nombre}
              </Badge>
            ))}
          </CardContent>
        </Card>
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
