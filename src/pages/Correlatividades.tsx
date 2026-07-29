import { useMemo, useState, useRef, useEffect } from "react";
import { Network, Pencil, Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { estadoMeta } from "@/lib/estado";
import { useActiveCarrera, useAppStore } from "@/store/useAppStore";
import type { Materia } from "@/types";

interface Node extends Materia {
  x: number;
  y: number;
  width: number;
  height: number;
}

const COL_GAP = 300;
const COL_X0 = 120;
const colX = (idx: number) => COL_X0 + idx * COL_GAP;

/** Parte un nombre en hasta `maxLines` renglones de ~`maxChars`, con … si sobra. */
function wrapLabel(text: string, maxChars = 20, maxLines = 2): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= maxChars) cur = t;
    else {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && lines.join(" ").length < text.length) {
    let last = lines[maxLines - 1];
    if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1);
    lines[maxLines - 1] = last.replace(/\s*\S*$/, "").trim() + "…";
  }
  return lines;
}

export function Correlatividades() {
  const carrera = useActiveCarrera();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longFired = useRef(false);

  const startPress = (codigo: string) => {
    longFired.current = false;
    pressTimer.current = window.setTimeout(() => {
      longFired.current = true;
      setEditTarget(codigo);
    }, 550);
  };
  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const materias = carrera?.materias ?? [];
  const correlatividades = carrera?.correlatividades ?? {};

  const principales = useMemo(
    () => materias.filter((m) => m.esPrincipal && m.codigo && m.anio != null),
    [materias],
  );

  const anios = useMemo(
    () =>
      [...new Set(principales.map((m) => m.anio).filter((a): a is number => a != null))].sort(
        (a, b) => a - b,
      ),
    [principales],
  );

  const { nodeList, nodeMap } = useMemo(() => {
    const list: Node[] = [];
    const map: Record<string, Node> = {};
    anios.forEach((anio, idx) => {
      const x = colX(idx);
      const mats = principales.filter((m) => m.anio === anio);
      mats.forEach((m, i) => {
        const node: Node = { ...m, x, y: 60 + i * 84, width: 160, height: 56 };
        map[m.codigo] = node;
        list.push(node);
      });
    });
    return { nodeList: list, nodeMap: map };
  }, [principales, anios]);

  const edges = useMemo(() => {
    const result: { from: Node; to: Node; src: string; target: string }[] = [];
    Object.entries(correlatividades).forEach(([target, sources]) => {
      sources.forEach((src) => {
        const from = nodeMap[src];
        const to = nodeMap[target];
        if (from && to) result.push({ from, to, src, target });
      });
    });
    return result;
  }, [correlatividades, nodeMap]);

  const svgH = Math.max(400, ...nodeList.map((n) => n.y + n.height + 60));
  const svgW = Math.max(900, colX(anios.length - 1) + 180);

  const highlighted = useMemo(() => {
    if (!selectedNode) return null;
    return new Set<string>([
      selectedNode,
      ...(correlatividades[selectedNode] ?? []),
      ...Object.entries(correlatividades)
        .filter(([, srcs]) => srcs.includes(selectedNode))
        .map(([t]) => t),
    ]);
  }, [selectedNode, correlatividades]);

  if (!carrera) {
    return (
      <EmptyState
        icon={Network}
        title="Sin carrera activa"
        text="Importá el plan de estudios para ver el mapa de correlatividades."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-en-curso/20 bg-en-curso/10 px-4 py-3 text-sm text-en-curso">
        <span>💡 Hacé click en una materia para resaltar sus correlativas. Mantené presionado para ver más info de la materia.</span>
        <div className="flex gap-2">
          {selectedNode && (
            <CorrelativasEditor
              principales={principales}
              fixedTarget={selectedNode}
              label="Editar materia"
            />
          )}
          <CorrelativasEditor principales={principales} label="Editar correlativas" />
        </div>
      </div>

      {/* Editor abierto por long-press sobre un nodo del mapa (sin botón). */}
      <CorrelativasEditor
        principales={principales}
        fixedTarget={editTarget ?? undefined}
        showTrigger={false}
        controlledOpen={editTarget != null}
        onControlledOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      />

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {[
          { color: "var(--aprobado)", label: "Aprobada" },
          { color: "var(--en-curso)", label: "En curso" },
          { color: "var(--pendiente)", label: "Pendiente" },
          { color: "var(--warning)", label: "Equivalencia" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="size-3 rounded" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="overflow-auto rounded-xl border bg-background">
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="block">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" style={{ fill: "var(--aprobado)" }} opacity=".6" />
            </marker>
            <marker id="arrow-dim" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" style={{ fill: "var(--border)" }} />
            </marker>
          </defs>

          {anios.map((anio, idx) => {
            const x = colX(idx);
            return (
              <g key={anio}>
                <text
                  x={x}
                  y={28}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  style={{ fill: "var(--muted-foreground)" }}
                >
                  {anio}° Año
                </text>
                <line x1={x - 80} y1={38} x2={x + 80} y2={38} style={{ stroke: "var(--border)" }} />
              </g>
            );
          })}

          {edges.map((e, i) => {
            const isHi = highlighted && (highlighted.has(e.src) || highlighted.has(e.target));
            const isDim = highlighted && !isHi;
            return (
              <line
                key={i}
                x1={e.from.x + e.from.width / 2}
                y1={e.from.y + e.from.height / 2}
                x2={e.to.x - 8}
                y2={e.to.y + e.to.height / 2}
                style={{ stroke: isDim ? "var(--border)" : "var(--aprobado)" }}
                strokeWidth={isHi ? 2 : 1}
                strokeOpacity={isDim ? 0.3 : highlighted ? 0.9 : 0.4}
                markerEnd={isDim ? "url(#arrow-dim)" : "url(#arrow)"}
              />
            );
          })}

          {nodeList.map((n) => {
            const isDim = highlighted && !highlighted.has(n.codigo);
            const isSel = selectedNode === n.codigo;
            const stateColor = estadoMeta(n.estado).color;
            return (
              <g
                key={n.id}
                style={{ cursor: "pointer" }}
                onPointerDown={() => startPress(n.codigo)}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onClick={() => {
                  if (longFired.current) {
                    longFired.current = false;
                    return; // fue long-press: no togglear selección
                  }
                  setSelectedNode(isSel ? null : n.codigo);
                }}
              >
                <rect
                  x={n.x - n.width / 2}
                  y={n.y}
                  width={n.width}
                  height={n.height}
                  rx={8}
                  style={{
                    fill: isSel
                      ? `color-mix(in srgb, ${stateColor} 20%, transparent)`
                      : isDim
                        ? "var(--muted)"
                        : "var(--card)",
                    stroke: isDim ? "var(--muted)" : stateColor,
                  }}
                  strokeWidth={isSel ? 2 : 1}
                  opacity={isDim ? 0.35 : 1}
                />
                {(() => {
                  const lines = wrapLabel(n.nombre);
                  return (
                    <>
                      <text
                        x={n.x}
                        y={n.y + 16}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        style={{ fill: isDim ? "var(--muted-foreground)" : "var(--foreground)" }}
                      >
                        {lines.map((ln, i) => (
                          <tspan key={i} x={n.x} dy={i === 0 ? 0 : 12}>
                            {ln}
                          </tspan>
                        ))}
                      </text>
                      <text
                        x={n.x}
                        y={n.y + 16 + lines.length * 12 + 2}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                        style={{ fill: isDim ? "var(--muted-foreground)" : stateColor }}
                      >
                        ({n.codigo})
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Editor de correlativas ──────────────────────────────────────────────────

function CorrelativasEditor({
  principales,
  fixedTarget,
  label = "Editar correlativas",
  showTrigger = true,
  controlledOpen,
  onControlledOpenChange,
}: {
  principales: Materia[];
  fixedTarget?: string;
  label?: string;
  showTrigger?: boolean;
  controlledOpen?: boolean;
  onControlledOpenChange?: (o: boolean) => void;
}) {
  const carrera = useActiveCarrera();
  const updateCorrelatividades = useAppStore((s) => s.updateCorrelatividades);
  const [internalOpen, setInternalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [target, setTarget] = useState<string>("");
  const [draft, setDraft] = useState<string[]>([]);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (o: boolean) => {
    if (isControlled) onControlledOpenChange?.(o);
    else setInternalOpen(o);
  };
  const handleOpenChange = (o: boolean) => setOpen(o);

  const correlatividades = carrera?.correlatividades ?? {};

  const onPickTarget = (codigo: string) => {
    setTarget(codigo);
    setDraft(correlatividades[codigo] ?? []);
  };

  // Precarga la materia fija al abrir y limpia al cerrar (controlado o no).
  useEffect(() => {
    if (open && fixedTarget) onPickTarget(fixedTarget);
    if (!open) {
      setTarget("");
      setDraft([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fixedTarget]);

  const targetMateria = principales.find((m) => m.codigo === target);

  const toggle = (codigo: string) => {
    setDraft((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo],
    );
  };

  const save = () => {
    if (!carrera || !target) return;
    updateCorrelatividades(carrera.id, { ...correlatividades, [target]: draft });
    setOpen(false);
    setTarget("");
    setDraft([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Pencil className="size-3.5" /> {label}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {fixedTarget ? targetMateria?.nombre ?? "Editar materia" : "Editar correlativas"}
          </DialogTitle>
          <DialogDescription>
            {fixedTarget
              ? "Marcá las materias que necesita como requisito previo."
              : "Elegí una materia y marcá las que necesita como requisito previo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fixedTarget && (
            <Popover open={targetPickerOpen} onOpenChange={setTargetPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className={target ? "" : "text-muted-foreground"}>
                    {target
                      ? `${targetMateria?.nombre ?? ""} (${target})`
                      : "Elegí la materia a editar"}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nombre o código..." />
                  <CommandList>
                    <CommandEmpty>Sin resultados.</CommandEmpty>
                    <CommandGroup>
                      {principales.map((m) => (
                        <CommandItem
                          key={m.codigo}
                          value={`${m.nombre} ${m.codigo}`}
                          onSelect={() => {
                            onPickTarget(m.codigo);
                            setTargetPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn("size-4", target === m.codigo ? "opacity-100" : "opacity-0")}
                          />
                          <span className="flex-1 truncate">{m.nombre}</span>
                          <span className="font-mono text-xs text-muted-foreground">{m.codigo}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {target && (
            <div className="space-y-2">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    <span className="text-muted-foreground">
                      {draft.length > 0
                        ? `${draft.length} correlativa(s) seleccionada(s)`
                        : "Agregar correlativas..."}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o código..." />
                    <CommandList>
                      <CommandEmpty>Sin resultados.</CommandEmpty>
                      <CommandGroup>
                        {principales
                          .filter((m) => m.codigo !== target)
                          .map((m) => {
                            const on = draft.includes(m.codigo);
                            return (
                              <CommandItem
                                key={m.codigo}
                                value={`${m.nombre} ${m.codigo}`}
                                onSelect={() => toggle(m.codigo)}
                              >
                                <Check className={cn("size-4", on ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1 truncate">{m.nombre}</span>
                                <span className="font-mono text-xs text-muted-foreground">{m.codigo}</span>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {draft.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draft.map((c) => {
                    const m = principales.find((x) => x.codigo === c);
                    return (
                      <Badge key={c} variant="secondary" className="gap-1 pr-1">
                        <span className="max-w-40 truncate">{m?.nombre ?? c}</span>
                        <button
                          onClick={() => toggle(c)}
                          className="rounded-sm hover:bg-muted-foreground/20"
                          title="Quitar"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!target}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
