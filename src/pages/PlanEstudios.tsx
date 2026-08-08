import { useEffect, useMemo, useState } from "react";
import { Search, GraduationCap, Pencil, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
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
  const focusMateria = useAppStore((s) => s.focusMateria);
  const setFocusMateria = useAppStore((s) => s.setFocusMateria);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [soloTecnico, setSoloTecnico] = useState(false);
  const [editing, setEditing] = useState<Materia | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [colapsados, setColapsados] = useState<Set<number>>(new Set());

  const toggleAnio = (a: number) =>
    setColapsados((prev) => {
      const s = new Set(prev);
      if (s.has(a)) s.delete(a);
      else s.add(a);
      return s;
    });

  // Ir a una materia por código: limpia filtros, scrollea y hace parpadear la fila.
  const gotoMateria = (codigo: string) => {
    setFiltro("todas");
    setBusqueda("");
    setColapsados(new Set()); // abrir todo para que la materia sea visible
    setFlash(codigo);
  };

  // Foco pedido desde otra página (ej. Dashboard → "Próximas materias").
  useEffect(() => {
    if (!focusMateria) return;
    gotoMateria(focusMateria);
    setFocusMateria(null);
  }, [focusMateria, setFocusMateria]);

  useEffect(() => {
    if (!flash) return;
    // Elegir la fila/tarjeta visible (mobile o desktop según breakpoint).
    const el =
      [`mat-${flash}`, `mat-m-${flash}`]
        .map((id) => document.getElementById(id))
        .find((e) => e && e.offsetParent !== null) ?? document.getElementById(`mat-${flash}`);
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
      const okTecnico = !soloTecnico || m.tituloIntermedio;
      return okFiltro && okBusqueda && okTecnico;
    });
    const anios = [...new Set(filtered.map((m) => m.anio).filter((a): a is number => a != null))].sort(
      (a, b) => a - b,
    );
    return anios.map((anio) => ({ anio, mats: filtered.filter((m) => m.anio === anio) }));
  }, [materias, filtro, busqueda, soloTecnico]);

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
      <div className="space-y-3">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList className="w-full sm:w-max">
            <TabsTrigger className="px-1.5 text-xs sm:px-2 sm:text-sm" value="todas">
              Todas
            </TabsTrigger>
            <TabsTrigger className="px-1.5 text-xs sm:px-2 sm:text-sm" value="aprobado">
              <span className="sm:hidden">Aprob.</span>
              <span className="hidden sm:inline">Aprobadas</span>
            </TabsTrigger>
            <TabsTrigger className="px-1.5 text-xs sm:px-2 sm:text-sm" value="en_curso">
              <span className="sm:hidden">Curso</span>
              <span className="hidden sm:inline">En curso</span>
            </TabsTrigger>
            <TabsTrigger className="px-1.5 text-xs sm:px-2 sm:text-sm" value="pendiente">
              <span className="sm:hidden">Pend.</span>
              <span className="hidden sm:inline">Pendientes</span>
            </TabsTrigger>
            <TabsTrigger className="px-1.5 text-xs sm:px-2 sm:text-sm" value="equivalencia">
              <span className="sm:hidden">Equiv.</span>
              <span className="hidden sm:inline">Equivalencias</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full sm:max-w-60 sm:flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar materia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button
            variant={soloTecnico ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloTecnico((v) => !v)}
            className={cn(
              "flex-1 sm:flex-none",
              soloTecnico && "bg-chart-purple hover:bg-chart-purple/90 text-white",
            )}
          >
            <span className="sm:hidden">Tít. Intermedio</span>
            <span className="hidden sm:inline">Título Intermedio - Técnico</span>
          </Button>
          {porAnio.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => {
                const anios = porAnio.map((a) => a.anio);
                const todosColapsados = anios.every((a) => colapsados.has(a));
                setColapsados(todosColapsados ? new Set() : new Set(anios));
              }}
            >
              {porAnio.every((a) => colapsados.has(a.anio)) ? "Abrir todo" : "Colapsar todo"}
            </Button>
          )}
        </div>
      </div>

      {porAnio.map(({ anio, mats }) => (
        <Card key={anio} className="gap-3 py-3 sm:gap-6 sm:py-6">
          <CardHeader
            className="flex cursor-pointer flex-row items-center justify-between gap-3 space-y-0 px-3 sm:px-6"
            onClick={() => toggleAnio(anio)}
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs font-semibold sm:text-sm">{anio}° Año</span>
              <div className="flex flex-wrap gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
                <Badge variant="secondary">{mats.length} total</Badge>
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
            </div>
            <button
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={colapsados.has(anio) ? "Abrir" : "Colapsar"}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-300 ease-in-out",
                  colapsados.has(anio) && "-rotate-90",
                )}
              />
            </button>
          </CardHeader>
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              colapsados.has(anio) ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
            )}
          >
            <div className="overflow-hidden">
          <CardContent className="px-2 sm:px-6">
            <Table className="table-fixed min-w-[820px]">
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
                          <span className="whitespace-normal break-words text-[11px] leading-snug sm:text-sm">
                            {m.nombre}
                          </span>
                          {m.tituloIntermedio && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-chart-purple/30 bg-chart-purple/15 text-chart-purple text-[10px]"
                              title="Cuenta para el título intermedio"
                            >
                              Tít. int.
                            </Badge>
                          )}
                          {compartidas[m.codigo] && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-en-curso/20 bg-en-curso/15 text-en-curso text-[10px]"
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
                                    (ok ? "bg-aprobado/15 text-aprobado" : "bg-gray-700 text-gray-400")
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
            </div>
          </div>
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
  const [tituloInt, setTituloInt] = useState(false);
  const [nombreAnterior, setNombreAnterior] = useState("");

  // Sincroniza el form cuando cambia la materia a editar.
  const [lastId, setLastId] = useState<string | null>(null);
  if (materia && materia.id !== lastId) {
    setLastId(materia.id);
    setEstado(materia.estado);
    setNotaStr(materia.nota === null || materia.nota === undefined ? "" : String(materia.nota));
    setFecha(materia.fecha ?? "");
    setTituloInt(!!materia.tituloIntermedio);
    setNombreAnterior(materia.nombreAnterior ?? "");
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
      tituloIntermedio: tituloInt,
      nombreAnterior: nombreAnterior.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={!!materia} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="break-words pr-6">{materia?.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre anterior</Label>
            <Input
              value={nombreAnterior}
              onChange={(e) => setNombreAnterior(e.target.value)}
              placeholder=""
            />
          </div>

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
            <DateInput value={fecha} onChange={setFecha} />
          </div>

          <button
            type="button"
            onClick={() => setTituloInt((v) => !v)}
            className={
              "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors " +
              (tituloInt
                ? "border-chart-purple/40 bg-chart-purple/10 text-chart-purple"
                : "border-border text-muted-foreground hover:bg-accent")
            }
          >
            <span>Cuenta para el título intermedio</span>
            <span className="font-mono text-xs">{tituloInt ? "SÍ" : "no"}</span>
          </button>
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
