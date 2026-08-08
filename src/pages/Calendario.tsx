import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { useActiveCarrera, useAppStore } from "@/store/useAppStore";
import type { Materia } from "@/types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Nombre de día (como se guarda en `dias`) → índice getDay() (0=Dom..6=Sáb).
const DIA_IDX: Record<string, number> = {
  Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6,
};

/** "DD/MM/YYYY" → {d,m,y} o null. */
function parseFecha(s?: string): { d: number; m: number; y: number } | null {
  if (!s) return null;
  const parts = s.split("/").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [d, m, y] = parts;
  return { d, m, y: y < 100 ? 2000 + y : y };
}

/** getDay() (0=Dom) → columna de la grilla que empieza en Lunes (0=Lun..6=Dom). */
const colLunes = (getDay: number) => (getDay + 6) % 7;

/** "DD/MM/YYYY" → clave comparable YYYYMMDD, o null. */
function fechaANum(s?: string): number | null {
  const f = parseFecha(s);
  return f ? f.y * 10000 + f.m * 100 + f.d : null;
}

export function Calendario() {
  const carrera = useActiveCarrera();
  const updateCuatrimestre = useAppStore((s) => s.updateCuatrimestre);
  const hoy = new Date();
  const [ver, setVer] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() }); // m: 0-11

  const materias = carrera?.materias ?? [];
  const cursadas = carrera?.cursadas ?? {};

  // Rango del cuatrimestre (acota las cursadas del calendario).
  const [cuatriInicio, setCuatriInicio] = useState("");
  const [cuatriFin, setCuatriFin] = useState("");
  useEffect(() => {
    setCuatriInicio(carrera?.cuatrimestreInicio ?? "");
    setCuatriFin(carrera?.cuatrimestreFin ?? "");
  }, [carrera?.cuatrimestreInicio, carrera?.cuatrimestreFin]);
  const rangoInicio = fechaANum(carrera?.cuatrimestreInicio);
  const rangoFin = fechaANum(carrera?.cuatrimestreFin);
  const dentroDelCuatri = (y: number, m: number, d: number) => {
    const n = y * 10000 + (m + 1) * 100 + d;
    if (rangoInicio != null && n < rangoInicio) return false;
    if (rangoFin != null && n > rangoFin) return false;
    return true;
  };

  // Eventos con fecha (parciales + examen final) en el mes visible.
  const eventos = useMemo(() => {
    const map: Record<number, { mat: Materia; label: string }[]> = {};
    const push = (fechaStr: string | undefined, mat: Materia, label: string) => {
      const f = parseFecha(fechaStr);
      if (!f || f.m - 1 !== ver.m || f.y !== ver.y) return;
      (map[f.d] ??= []).push({ mat, label });
    };
    for (const mat of materias) {
      const c = cursadas[mat.id];
      if (!c) continue;
      push(c.fechaParcial1, mat, "P1");
      push(c.fechaParcial2, mat, "P2");
      push(c.fechaRecuperatorio1, mat, "R1");
      push(c.fechaRecuperatorio2, mat, "R2");
      push(c.fechaExamen, mat, "Final");
    }
    return map;
  }, [materias, cursadas, ver]);

  // Cursadas en curso agrupadas por índice de día de semana (0=Dom..6=Sáb).
  const cursadasPorDow = useMemo(() => {
    const map: Record<number, Materia[]> = {};
    for (const mat of materias) {
      const c = cursadas[mat.id];
      if (mat.estado !== "en_curso" || !c?.dias) continue;
      for (const d of c.dias) {
        const idx = DIA_IDX[d];
        if (idx === undefined) continue;
        (map[idx] ??= []).push(mat);
      }
    }
    return map;
  }, [materias, cursadas]);

  if (!carrera) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Sin carrera activa"
        text="Importá el plan de estudios para ver el calendario."
      />
    );
  }

  const primerDia = new Date(ver.y, ver.m, 1);
  const diasEnMes = new Date(ver.y, ver.m + 1, 0).getDate();
  const offset = colLunes(primerDia.getDay()); // celdas vacías antes del día 1
  const celdas: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  const esHoy = (d: number) =>
    d === hoy.getDate() && ver.m === hoy.getMonth() && ver.y === hoy.getFullYear();

  const cambiarMes = (delta: number) =>
    setVer(({ y, m }) => {
      const nm = m + delta;
      return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => cambiarMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-40 text-center text-sm font-semibold sm:min-w-48 sm:text-base">
            {MESES[ver.m]} {ver.y}
          </div>
          <Button variant="outline" size="icon-sm" onClick={() => cambiarMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVer({ y: hoy.getFullYear(), m: hoy.getMonth() })}
        >
          Hoy
        </Button>
      </div>

      {/* Cuatrimestre en curso: acota las cursadas del calendario */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Inicio del cuatrimestre</Label>
            <Input
              className="w-36"
              value={cuatriInicio}
              onChange={(e) => setCuatriInicio(e.target.value)}
              placeholder="DD/MM/AAAA"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fin del cuatrimestre</Label>
            <Input
              className="w-36"
              value={cuatriFin}
              onChange={(e) => setCuatriFin(e.target.value)}
              placeholder="DD/MM/AAAA"
            />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              carrera && updateCuatrimestre(carrera.id, cuatriInicio.trim(), cuatriFin.trim())
            }
          >
            Guardar
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Las cursadas se muestran solo entre estas fechas. Sin rango, se muestran en todos los
            meses.
          </p>
        </CardContent>
      </Card>

      {/* Referencias */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded" style={{ background: "var(--warning)" }} /> Parcial / Examen
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded" style={{ background: "var(--en-curso)" }} /> Cursada
        </div>
      </div>

      <Card>
        <CardContent className="px-2 sm:px-4">
          {/* Encabezado días */}
          <div className="grid grid-cols-7 border-b pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
            {DOW.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {celdas.map((d, i) => {
              if (d === null) return <div key={i} className="min-h-20 border-b border-r" />;
              const getDay = new Date(ver.y, ver.m, d).getDay();
              const evs = eventos[d] ?? [];
              // Cursadas solo dentro del cuatrimestre (si hay rango cargado).
              const curs = dentroDelCuatri(ver.y, ver.m, d) ? cursadasPorDow[getDay] ?? [] : [];
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-20 space-y-0.5 border-b border-r p-1 align-top",
                    (i + 1) % 7 === 0 && "border-r-0",
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full text-[11px]",
                      esHoy(d)
                        ? "bg-primary font-bold text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {d}
                  </div>
                  {evs.map((ev, k) => (
                    <div
                      key={"e" + ev.mat.id + k}
                      title={`${ev.label}: ${ev.mat.nombre}`}
                      className="truncate rounded border-l-2 border-warning bg-warning/10 px-1 py-0.5 text-[9px] leading-tight text-warning sm:text-[10px]"
                    >
                      <span className="font-semibold">{ev.label}</span> {ev.mat.nombre}
                    </div>
                  ))}
                  {curs.map((m) => (
                    <div
                      key={"c" + m.id}
                      title={`Cursada: ${m.nombre}${cursadas[m.id]?.aula ? ` · Aula ${cursadas[m.id].aula}` : ""}`}
                      className="truncate rounded border-l-2 border-en-curso bg-en-curso/10 px-1 py-0.5 text-[9px] leading-tight text-en-curso sm:text-[10px]"
                    >
                      {m.nombre}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Las cursadas se muestran en sus días de la semana. Parciales y examen final aparecen en
        su fecha. Cargá días, aula, parciales y fechas desde el Dashboard (clic en una materia en
        curso).
      </p>

      {Object.keys(eventos).length === 0 && Object.keys(cursadasPorDow).length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <CalendarDays className="size-4" /> Todavía no hay exámenes ni cursadas cargadas.
        </div>
      )}
    </div>
  );
}
