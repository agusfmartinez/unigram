import { useMemo, useState } from "react";
import { Award, Search } from "lucide-react";
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
import { estaAprobada } from "@/lib/estado";
import { useActiveCarrera } from "@/store/useAppStore";

export function Creditos() {
  const carrera = useActiveCarrera();
  const [soloHechas, setSoloHechas] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const noPrincipales = useMemo(
    () => (carrera?.materias ?? []).filter((m) => !m.esPrincipal),
    [carrera],
  );

  const hechas = noPrincipales.filter((m) => m.estado !== "pendiente");

  const filtered = useMemo(() => {
    const base = soloHechas ? hechas : noPrincipales;
    return base.filter((m) => !busqueda || m.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [soloHechas, hechas, noPrincipales, busqueda]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={soloHechas ? "default" : "outline"}
          size="sm"
          onClick={() => setSoloHechas((v) => !v)}
        >
          {soloHechas ? "Mostrando cursadas/aprobadas" : "Mostrando todo el catálogo"}
        </Button>
        <div className="relative max-w-60 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="bg-aprobado/15 text-aprobado border-aprobado/20">
          {noPrincipales.filter((m) => estaAprobada(m.estado)).length} obtenidas
        </Badge>
        <Badge variant="secondary">{noPrincipales.length} en catálogo</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {soloHechas ? "Créditos y electivas cursadas" : "Catálogo completo"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Actividad</TableHead>
                <TableHead className="w-28">Código</TableHead>
                <TableHead className="w-36">Estado</TableHead>
                <TableHead className="w-16">Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="align-top font-medium">
                    <span className="break-words whitespace-normal">{m.nombre}</span>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nada para mostrar con este filtro.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
