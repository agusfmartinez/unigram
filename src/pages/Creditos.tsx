import { useMemo, useState } from "react";
import { Award, Search, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { estaAprobada } from "@/lib/estado";
import { useActiveCarrera } from "@/store/useAppStore";
import type { Materia } from "@/types";

function grupoDe(m: Materia): "ACA" | "AU" | "Otros" {
  if (m.codigo.startsWith("ACA") || m.nombre.startsWith("ACA")) return "ACA";
  if (m.codigo.startsWith("AU") || m.nombre.startsWith("AU_")) return "AU";
  return "Otros";
}

function CreditoProgreso({ titulo, obtenidos, meta }: { titulo: string; obtenidos: number; meta: number }) {
  const pct = Math.min(100, Math.round((obtenidos / meta) * 100));
  const completo = obtenidos >= meta;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Créditos · {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-1.5 flex items-end justify-between">
          <span className="text-2xl font-bold" style={{ color: completo ? "var(--aprobado)" : undefined }}>
            {obtenidos}
            <span className="text-sm text-muted-foreground"> / {meta}</span>
          </span>
          {completo && (
            <Badge variant="outline" className="bg-aprobado/15 text-aprobado border-aprobado/20">
              ✓ Completo
            </Badge>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: completo ? "var(--aprobado)" : "linear-gradient(90deg,#a78bfa,#38bdf8)",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GrupoCard({
  titulo,
  items,
  defaultOpen = true,
}: {
  titulo: string;
  items: Materia[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const obtenidas = items.filter((m) => estaAprobada(m.estado)).length;

  if (items.length === 0) return null;

  return (
    <Card className="gap-3 py-3 sm:gap-6 sm:py-6">
      <CardHeader
        className="flex cursor-pointer flex-row items-center justify-between gap-3 space-y-0 px-3 sm:px-6"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-semibold sm:text-sm">{titulo}</span>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{items.length} total</Badge>
            {obtenidas > 0 && (
              <Badge variant="outline" className="bg-aprobado/15 text-aprobado border-aprobado/20">
                {obtenidas} obtenidas
              </Badge>
            )}
          </div>
        </div>
        <button
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={open ? "Colapsar" : "Abrir"}
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-300 ease-in-out", !open && "-rotate-90")}
          />
        </button>
      </CardHeader>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="px-2 sm:px-6">
            <Table className="table-fixed min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Actividad</TableHead>
                  <TableHead className="w-28">Código</TableHead>
                  <TableHead className="w-20">Créditos</TableHead>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead className="w-16">Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="align-top font-medium">
                      <span className="break-words whitespace-normal">{m.nombre}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {m.codigo}
                      </code>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">{m.creditos || "—"}</TableCell>
                    <TableCell className="align-top">
                      <StatusBadge estado={m.estado} />
                    </TableCell>
                    <TableCell className="align-top">
                      <NotaCircle nota={m.nota} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export function Creditos() {
  const carrera = useActiveCarrera();
  const [soloAprobadas, setSoloAprobadas] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const noPrincipales = useMemo(
    () => (carrera?.materias ?? []).filter((m) => !m.esPrincipal),
    [carrera],
  );

  const obtenidos = noPrincipales
    .filter((m) => estaAprobada(m.estado))
    .reduce((s, m) => s + (m.creditos || 0), 0);

  const { au, aca, otros } = useMemo(() => {
    const base = noPrincipales.filter((m) => {
      const okAprob = !soloAprobadas || estaAprobada(m.estado);
      const okBusqueda = !busqueda || m.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return okAprob && okBusqueda;
    });
    return {
      au: base.filter((m) => grupoDe(m) === "AU"),
      aca: base.filter((m) => grupoDe(m) === "ACA"),
      otros: base.filter((m) => grupoDe(m) === "Otros"),
    };
  }, [noPrincipales, soloAprobadas, busqueda]);

  if (!carrera) {
    return (
      <EmptyState
        icon={Award}
        title="Sin carrera activa"
        text="Importá el plan de estudios para ver créditos y electivas."
      />
    );
  }

  if (noPrincipales.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="Sin créditos ni electivas"
        text="Esta carrera no tiene actividades extracurriculares ni materias genéricas en el plan."
      />
    );
  }

  const totalFiltrado = au.length + aca.length + otros.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CreditoProgreso titulo="Título intermedio" obtenidos={obtenidos} meta={12} />
        <CreditoProgreso titulo="Título de grado" obtenidos={obtenidos} meta={30} />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative order-1 w-full sm:order-none sm:max-w-60 sm:flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Button
          variant={soloAprobadas ? "default" : "outline"}
          size="sm"
          className="order-2 flex-1 sm:order-none sm:flex-none"
          onClick={() => setSoloAprobadas((v) => !v)}
        >
          {soloAprobadas ? "Solo aprobadas" : "Todas"}
        </Button>
        <Badge
          variant="outline"
          className="order-3 bg-aprobado/15 text-aprobado border-aprobado/20 sm:order-none"
        >
          {obtenidos} créditos obtenidos
        </Badge>
      </div>

      {totalFiltrado === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nada para mostrar con este filtro.
        </div>
      ) : (
        <>
          <GrupoCard titulo="Actividades de crédito (ACA)" items={aca} />
          <GrupoCard titulo="Electivas UNAHUR (AU)" items={au} defaultOpen={false} />
          <GrupoCard titulo="Otras actividades" items={otros} />
        </>
      )}
    </div>
  );
}
