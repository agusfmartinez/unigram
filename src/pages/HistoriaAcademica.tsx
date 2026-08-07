import { useMemo, useState } from "react";
import { ClipboardList, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { notaColorVar, estaAprobada, colorPromedio } from "@/lib/estado";
import { useActiveCarrera } from "@/store/useAppStore";
import type { EstadoMateria, Nota } from "@/types";

interface Logro {
  id: string;
  nombre: string;
  fecha: string;
  estado: EstadoMateria;
  nota: Nota;
}

const fechaKey = (f: string) => f.split("/").reverse().join("");
const mesDe = (f: string) => parseInt(f.split("/")[1] ?? "0", 10);
// 1er cuatrimestre: abril–julio (4-7). 2do: agosto–diciembre (8-12).
const cuatriDe = (f: string) => (mesDe(f) >= 8 ? "2do cuatrimestre" : "1er cuatrimestre");

function resumen(items: Logro[]) {
  const notas = items.map((i) => i.nota).filter((n): n is number => typeof n === "number");
  const prom = notas.length > 0 ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2) : "—";
  return { count: items.length, prom };
}

export function HistoriaAcademica() {
  const carrera = useActiveCarrera();
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  const principalesTotal = (carrera?.materias ?? []).filter((m) => m.esPrincipal).length;

  const logros = useMemo<Logro[]>(() => {
    return (carrera?.materias ?? [])
      .filter((m) => m.esPrincipal && estaAprobada(m.estado))
      .map((m) => ({ id: m.id, nombre: m.nombre, fecha: m.fecha ?? "", estado: m.estado, nota: m.nota }));
  }, [carrera]);

  const { porAnio, promedio, pct, calificaciones } = useMemo(() => {
    const map = new Map<string, Logro[]>();
    for (const l of logros) {
      const y = l.fecha?.split("/")[2] || "Sin fecha";
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(l);
    }
    const years = [...map.keys()].sort((a, b) => {
      if (a === "Sin fecha") return 1;
      if (b === "Sin fecha") return -1;
      return b.localeCompare(a);
    });
    const porAnio = years.map((year) => {
      const items = map.get(year)!.sort((a, b) => fechaKey(b.fecha).localeCompare(fechaKey(a.fecha)));
      const c1 = items.filter((l) => l.fecha && cuatriDe(l.fecha) === "1er cuatrimestre");
      const c2 = items.filter((l) => l.fecha && cuatriDe(l.fecha) === "2do cuatrimestre");
      const sinFecha = items.filter((l) => !l.fecha);
      return { year, items, c1, c2, sinFecha };
    });

    const notas = logros.map((l) => l.nota).filter((n): n is number => typeof n === "number");
    const promedio =
      notas.length > 0 ? (notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2) : "—";
    const pct = principalesTotal > 0 ? Math.round((logros.length / principalesTotal) * 100) : 0;
    return { porAnio, promedio, pct, calificaciones: notas.length };
  }, [logros, principalesTotal]);

  const toggle = (y: string) =>
    setColapsados((prev) => {
      const s = new Set(prev);
      if (s.has(y)) s.delete(y);
      else s.add(y);
      return s;
    });

  if (!carrera) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sin carrera activa"
        text="Importá el plan de estudios y la historia académica desde el SIU Guaraní."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Materias aprobadas"
          value={logros.length}
          sub={`de ${principalesTotal} del plan`}
          color="var(--aprobado)"
        />
        <StatCard
          title="Promedio general"
          value={promedio}
          sub={`sobre ${calificaciones} calificaciones`}
          color={calificaciones > 0 ? colorPromedio(parseFloat(promedio)) : undefined}
        />
        <StatCard title="Avance de carrera" value={`${pct}%`}>
          <div className="mt-3">
            <Progress value={pct} />
          </div>
        </StatCard>
      </div>

      {logros.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin materias completadas"
          text="Importá tu historia académica desde el SIU Guaraní para completar notas y fechas."
        />
      ) : (
        porAnio.map(({ year, items, c1, c2, sinFecha }) => {
          const colapsado = colapsados.has(year);
          const rAnio = resumen(items);
          const rC1 = resumen(c1);
          const rC2 = resumen(c2);
          return (
            <Card key={year}>
              <CardHeader
                className="flex cursor-pointer flex-row items-center justify-between gap-3 space-y-0"
                onClick={() => toggle(year)}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold">
                    {year === "Sin fecha" ? "Sin fecha" : `Año ${year}`}
                  </span>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <button
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title={colapsado ? "Abrir" : "Colapsar"}
                >
                  <ChevronDown
                    className={cn("size-4 transition-transform duration-300 ease-in-out", colapsado && "-rotate-90")}
                  />
                </button>
              </CardHeader>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  colapsado ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                )}
              >
                <div className="overflow-hidden">
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
                      {/* Timeline por cuatrimestre */}
                      <div className="space-y-4">
                        {[
                          { label: "2do cuatrimestre", data: c2 },
                          { label: "1er cuatrimestre", data: c1 },
                          { label: "Sin fecha", data: sinFecha },
                        ]
                          .filter((g) => g.data.length > 0)
                          .map((g) => (
                            <div key={g.label}>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {g.label}
                              </div>
                              <Timeline items={g.data} />
                            </div>
                          ))}
                      </div>

                      {/* Métricas por año / cuatrimestre */}
                      <div className="space-y-3">
                        <MetricBox titulo={`Año ${year}`} count={rAnio.count} prom={rAnio.prom} destacado />
                        {c2.length > 0 && (
                          <MetricBox titulo="2do cuatrimestre" count={rC2.count} prom={rC2.prom} />
                        )}
                        {c1.length > 0 && (
                          <MetricBox titulo="1er cuatrimestre" count={rC1.count} prom={rC1.prom} />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function Timeline({ items }: { items: Logro[] }) {
  return (
    <div className="flex flex-col">
      {items.map((l, i) => {
        const color = l.estado === "equivalencia" ? "var(--warning)" : notaColorVar(l.nota);
        return (
          <div key={`${l.id}-${i}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
              {i < items.length - 1 && <div className="my-1 min-h-5 w-0.5 flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                >
                  {l.nota ?? "≈"}
                </span>
                <div>
                  <div className="text-sm font-semibold">{l.nombre}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {l.fecha || "sin fecha"}
                    <StatusBadge estado={l.estado} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricBox({
  titulo,
  count,
  prom,
  destacado = false,
}: {
  titulo: string;
  count: number;
  prom: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        destacado ? "border-primary/20 bg-primary/5" : "bg-muted/30",
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-sm">
          <strong className="text-lg">{count}</strong> materias
        </span>
        <span className="text-sm text-muted-foreground">
          prom{" "}
          <strong style={{ color: prom === "—" ? undefined : colorPromedio(parseFloat(prom)) }}>
            {prom}
          </strong>
        </span>
      </div>
    </div>
  );
}

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
