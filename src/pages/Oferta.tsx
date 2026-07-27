import { useMemo, useState } from "react";
import { Search, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useActiveCarrera, useAppStore } from "@/store/useAppStore";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const HORAS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);
const COLORES = ["#4ade80", "#38bdf8", "#f59e0b", "#a78bfa", "#f87171", "#34d399", "#fb923c", "#818cf8"];

export function Oferta() {
  const carrera = useActiveCarrera();
  const oferta = useAppStore((s) => s.oferta);
  const [view, setView] = useState<"lista" | "horario">("lista");
  const [busqueda, setBusqueda] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const materias = carrera?.materias ?? [];

  const filtered = useMemo(
    () => oferta.filter((m) => !busqueda || m.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [oferta, busqueda],
  );

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let ci = 0;
    selected.forEach((n) => {
      map[n] = COLORES[ci++ % COLORES.length];
    });
    return map;
  }, [selected]);

  const toggle = (n: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n);
      else s.add(n);
      return s;
    });
  };

  if (oferta.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin oferta académica cargada"
        text="Importá el XLS de oferta de materias del cuatrimestre para ver los horarios y planificar tu inscripción."
      />
    );
  }

  const eventosEn = (dia: string, hora: string) =>
    oferta.filter(
      (m) =>
        selected.has(m.nombre) &&
        (m.dia || "").toLowerCase().includes(dia.toLowerCase()) &&
        (m.horaInicio || "").startsWith(hora.slice(0, 2)),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "lista" | "horario")}>
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="horario">Horario</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-60 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar materia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {selected.size > 0 && (
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
            Limpiar selección ({selected.size})
          </Button>
        )}
      </div>

      {view === "lista" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Oferta · {oferta.length} materias — seleccioná para ver en el horario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Materia</TableHead>
                  <TableHead>Día</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Docente</TableHead>
                  <TableHead>Estado en tu plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m, i) => {
                  const isSel = selected.has(m.nombre);
                  const color = colorMap[m.nombre];
                  const matPlan = materias.find(
                    (x) =>
                      x.nombre.toLowerCase() === m.nombre.toLowerCase() ||
                      (m.codigo && x.codigo === m.codigo),
                  );
                  return (
                    <TableRow key={i} data-state={isSel ? "selected" : undefined}>
                      <TableCell>
                        <button
                          onClick={() => toggle(m.nombre)}
                          className="size-4 rounded border-2"
                          style={{
                            borderColor: isSel ? color || "var(--primary)" : "var(--border)",
                            background: isSel
                              ? `color-mix(in srgb, ${color || "var(--primary)"} 20%, transparent)`
                              : "transparent",
                          }}
                        />
                      </TableCell>
                      <TableCell className={isSel ? "font-semibold" : ""}>
                        {isSel && (
                          <span
                            className="mr-1.5 inline-block size-2 rounded-full"
                            style={{ background: color }}
                          />
                        )}
                        {m.nombre}
                      </TableCell>
                      <TableCell>{m.dia || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {m.horaInicio} {m.horaFin ? `→ ${m.horaFin}` : ""}
                      </TableCell>
                      <TableCell>{m.modalidad || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.docente || "—"}</TableCell>
                      <TableCell>
                        {matPlan ? (
                          <StatusBadge estado={matPlan.estado} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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

      {view === "horario" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Horario ·{" "}
              {selected.size === 0
                ? "Seleccioná materias en la lista"
                : `${selected.size} materias seleccionadas`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected.size === 0 ? (
              <div className="rounded-lg border border-en-curso/20 bg-en-curso/10 px-4 py-3 text-sm text-en-curso">
                Seleccioná materias desde la lista para visualizar el horario semanal.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border-b bg-muted/50 px-3 py-2 text-left text-muted-foreground">Hora</th>
                      {DIAS.map((d) => (
                        <th key={d} className="border-b bg-muted/50 px-3 py-2 text-center text-muted-foreground">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS.map((hora) => (
                      <tr key={hora}>
                        <td className="border-b bg-muted/30 px-3 py-1.5 align-top font-mono text-[11px] text-muted-foreground">
                          {hora}
                        </td>
                        {DIAS.map((dia) => (
                          <td key={dia} className="min-w-28 border-b p-1 align-top">
                            {eventosEn(dia, hora).map((ev, i) => {
                              const c = colorMap[ev.nombre] || "var(--primary)";
                              return (
                                <div
                                  key={i}
                                  className="mb-0.5 rounded border-l-[3px] px-1.5 py-1 leading-tight"
                                  style={{
                                    borderLeftColor: c,
                                    background: `color-mix(in srgb, ${c} 13%, transparent)`,
                                  }}
                                >
                                  <div className="font-semibold" style={{ color: c }}>
                                    {ev.nombre.slice(0, 24)}
                                  </div>
                                  {ev.horaInicio && (
                                    <div className="text-muted-foreground">
                                      {ev.horaInicio}
                                      {ev.horaFin ? `–${ev.horaFin}` : ""}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
