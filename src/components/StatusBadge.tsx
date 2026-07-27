import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { estadoMeta, notaColorVar } from "@/lib/estado";
import type { EstadoMateria, Nota } from "@/types";

export function StatusBadge({ estado, className }: { estado: EstadoMateria; className?: string }) {
  const meta = estadoMeta(estado);
  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

/** Círculo con la nota, coloreado según el valor. */
export function NotaCircle({ nota, size = 28 }: { nota: Nota; size?: number }) {
  if (nota === null || nota === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  const color = notaColorVar(nota);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-xs font-bold"
      style={{
        width: size,
        height: size,
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {nota}
    </span>
  );
}
