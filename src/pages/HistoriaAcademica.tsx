import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { notaColorVar } from "@/lib/estado";
import { useAppStore } from "@/store/useAppStore";

export function HistoriaAcademica() {
  const historia = useAppStore((s) => s.historia);

  const { unicas, promedio, mejor } = useMemo(() => {
    const aprobadas = historia.filter(
      (h) =>
        h.notaNum &&
        (h.tipo === "Promocion" || h.resultado === "Aprobado" || h.resultado === "Promocionado"),
    );
    const seen = new Set<string>();
    const unicas = aprobadas.filter((h) => {
      if (seen.has(h.codigo)) return false;
      seen.add(h.codigo);
      return true;
    });
    unicas.sort((a, b) => {
      const fa = a.fecha.split("/").reverse().join("");
      const fb = b.fecha.split("/").reverse().join("");
      return fb.localeCompare(fa);
    });
    const promedio =
      unicas.length > 0
        ? (unicas.reduce((s, h) => s + (h.notaNum ?? 0), 0) / unicas.length).toFixed(2)
        : "—";
    const mejor = unicas.length > 0 ? Math.max(...unicas.map((u) => u.notaNum ?? 0)) : "—";
    return { unicas, promedio, mejor };
  }, [historia]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Materias aprobadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "var(--aprobado)" }}>
              {unicas.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: notaColorVar(parseFloat(promedio) || null) }}>
              {promedio}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mejor nota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "var(--aprobado)" }}>
              {mejor}
            </div>
          </CardContent>
        </Card>
      </div>

      {unicas.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin historial"
          text="Importá tu historia académica desde el SIU Guaraní."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline de aprobaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              {unicas.map((h, i) => {
                const color = notaColorVar(h.notaNum);
                return (
                  <div key={`${h.codigo}-${i}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      {i < unicas.length - 1 && <div className="my-1 min-h-5 w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 pb-5">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={{
                            color,
                            background: `color-mix(in srgb, ${color} 15%, transparent)`,
                          }}
                        >
                          {h.notaNum}
                        </span>
                        <div>
                          <div className="text-sm font-semibold">{h.nombre}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {h.fecha}
                            <Badge variant="secondary" className="text-[10px]">
                              {h.tipo}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
