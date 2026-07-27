import { useEffect, useMemo, useState } from "react";
import { Search, GraduationCap, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge, NotaCircle } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { estadoMeta, estaAprobada, ESTADOS } from "@/lib/estado";
import {
  useActiveCarrera,
  useAppStore,
  codigosCompartidos,
} from "@/store/useAppStore";
import type { EstadoMateria, Materia, Nota } from "@/types";

type Filtro = "todas" | EstadoMateria;

export function PlanEstudios() {
  const carrera = useActiveCarrera();
  const carreras = useAppStore((s) => s.carreras);
  const carreraActivaId = useAppStore((s) => s.carreraActivaId);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [editing, setEditing] = useState<Materia | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Ir a una materia por código: limpia filtros, scrollea y hace parpadear la fila.
  const gotoMateria = (codigo: string) => {
    setFiltro("todas");
    setBusqueda("");
    setFlash(codigo);
  };

  useEffect(() => {
    if (!flash) return;
    const el = document.getElementById(`mat-${flash}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const materias = carrera?.materias ?? [];
  const correlatividades = carrera?.correlatividades ?? {};
  const compartidas = useMemo(
    () => codigosCompartidos(carreras, carreraActivaId),
    [carreras, carreraActivaId],
  );

  const porAnio = useMemo(() => {
    const principales = materias.filter((m) => m.esPrincipal);
    const filtered = principales.filter((m) => {
      const okFiltro = filtro === "todas" || m.estado === filtro;
      const okBusqueda = !busqueda || m.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return okFiltro && okBusqueda;
    });
    const anios = [...new Set(filtered.map((m) => m.anio).filter((a): a is number => a != null))].sort(
      (a, b) => a - b,
    );
    return anios.map((anio) => ({ anio, mats: filtered.filter((m) => m.anio === anio) }));
  }, [materias, filtro, busqueda]);

  if (!carrera) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Sin carrera activa"
        text="Importá el plan de estudios de tu carrera desde el SIU Guaraní."
      />
    );
  }

  const total = porAnio.reduce((s, a) => s + a.mats.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="aprobado">Aprobadas</TabsTrigger>
            <TabsTrigger value="en_curso">En curso</TabsTrigger>
            <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
            <TabsTrigger value="equivalencia">Equiv.</TabsTrigger>
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
      </div>

      {porAnio.map(({ anio, mats }) => (
        <Card key={anio}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="text-sm font-semibold">{anio}° Año</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-aprobado/15 text-aprobado border-aprobado/20">
                {mats.filter((m) => estaAprobada(m.estado)).length} aprobadas
              </Badge>
              <Badge variant="outline" className="bg-en-curso/15 text-en-curso border-en-curso/20">
                {mats.filter((m) => m.estado === "en_curso").length} en curso
              </Badge>
              <Badge variant="outline" className="bg-pendiente/15 text-pendiente border-pendiente/20">
                {mats.filter((m) => m.estado === "pendiente").length} pendientes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead className="w-16">Nota</TableHead>
                  <TableHead className="w-28">Fecha</TableHead>
                  <TableHead className="w-44">Correlativas</TableHead>
                  <TableHead className="w-14 text-right">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mats.map((m) => {
                  const corrs = correlatividades[m.codigo] ?? [];
                  return (
                    <TableRow
                      key={m.id}
                      id={`mat-${m.codigo}`}
                      className={cn(flash === m.codigo && "flash-row")}
                    >
                      <TableCell className="font-medium align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-words whitespace-normal">{m.nombre}</span>
                          {compartidas[m.codigo] && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-chart-purple/20 bg-chart-purple/15 text-chart-purple text-[10px]"
                              title={`También en: ${compartidas[m.codigo].join(", ")}`}
                            >
                              compartida
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {m.codigo}
                        </code>
                      </TableCell>
                      <TableCell className="align-top">
                        <StatusBadge estado={m.estado} />
                      </TableCell>
                      <TableCell className="align-top">
                        <NotaCircle nota={m.nota} />
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {m.fecha || "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        {corrs.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {corrs.map((c) => {
                              const mat = materias.find((x) => x.codigo === c);
                              const ok = mat ? estaAprobada(mat.estado) : false;
                              return (
                                <button
                                  key={c}
                                  onClick={() => gotoMateria(c)}
                                  title={mat ? `Ir a ${mat.nombre}` : c}
                                  className={
                                    "rounded px-1.5 py-0.5 font-mono text-[10px] transition-transform hover:scale-110 " +
                                    (ok ? "bg-aprobado/15 text-aprobado" : "bg-warning/15 text-warning")
                                  }
                                >
                                  {c}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditing(m)}
                          title="Editar materia"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {total === 0 && (
        <EmptyState icon={Search} title="Sin resultados" text="No hay materias que coincidan con el filtro." />
      )}

      <EditMateriaDialog
        materia={editing}
        carreraId={carrera.id}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

// ─── Editor de una materia ───────────────────────────────────────────────────

function EditMateriaDialog({
  materia,
  carreraId,
  onClose,
}: {
  materia: Materia | null;
  carreraId: string;
  onClose: () => void;
}) {
  const updateMateria = useAppStore((s) => s.updateMateria);
  const [estado, setEstado] = useState<EstadoMateria>("pendiente");
  const [notaStr, setNotaStr] = useState("");
  const [fecha, setFecha] = useState("");

  // Sincroniza el form cuando cambia la materia a editar.
  const [lastId, setLastId] = useState<string | null>(null);
  if (materia && materia.id !== lastId) {
    setLastId(materia.id);
    setEstado(materia.estado);
    setNotaStr(materia.nota === null || materia.nota === undefined ? "" : String(materia.nota));
    setFecha(materia.fecha ?? "");
  }

  const notaEditable = estado === "aprobado";

  const parseNota = (): Nota => {
    if (!notaEditable) return null;
    const t = notaStr.trim().toUpperCase();
    if (t === "") return null;
    if (t === "C") return "C";
    const n = parseInt(t, 10);
    return Number.isNaN(n) ? null : Math.min(10, Math.max(1, n));
  };

  const save = () => {
    if (!materia) return;
    updateMateria(carreraId, materia.id, {
      estado,
      nota: parseNota(),
      fecha: fecha.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={!!materia} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{materia?.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as EstadoMateria)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {estadoMeta(e).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nota</Label>
            <Input
              value={notaEditable ? notaStr : ""}
              disabled={!notaEditable}
              onChange={(e) => setNotaStr(e.target.value)}
              placeholder={notaEditable ? "1–10 o C" : "solo aplica a aprobadas"}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de aprobación</Label>
            <Input
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              placeholder="DD/MM/AAAA"
            />
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
