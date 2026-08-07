import { useEffect, useRef, useState } from "react";
import {
  FileText,
  BarChart3,
  CalendarDays,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  Loader2,
  Plus,
  Cloud,
  CloudUpload,
  CloudDownload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { parsePlanEstudios } from "@/lib/parsers/parsePlanEstudios";
import { parseHistoriaAcademica } from "@/lib/parsers/parseHistoriaAcademica";
import { parseOferta } from "@/lib/parsers/parseOferta";
import { useAppStore, useHasData } from "@/store/useAppStore";
import { SEED_PLANES } from "@/data/seedCarrera";
import {
  isDriveConfigured,
  connectDrive,
  saveToDrive,
  loadFromDrive,
} from "@/lib/googleDrive";
import type { PageId } from "@/components/layout/nav";

type Tipo = "plan" | "historia" | "oferta";

export function Importar({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const importPlan = useAppStore((s) => s.importPlan);
  const importHistoria = useAppStore((s) => s.importHistoria);
  const importOferta = useAppStore((s) => s.importOferta);
  const carreras = useAppStore((s) => s.carreras);
  const removeCarrera = useAppStore((s) => s.removeCarrera);
  const clearAll = useAppStore((s) => s.clearAll);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const loadSeedPlan = useAppStore((s) => s.loadSeedPlan);
  const alumno = useAppStore((s) => s.alumno);
  const setAlumno = useAppStore((s) => s.setAlumno);
  const hasData = useHasData();

  const [nombre, setNombre] = useState("");
  const [legajo, setLegajo] = useState("");
  useEffect(() => {
    setNombre(alumno?.nombre ?? "");
    setLegajo(alumno?.legajo ?? "");
  }, [alumno]);

  const saveAlumno = () => {
    setAlumno(nombre.trim() ? { nombre: nombre.trim(), legajo: legajo.trim() } : null);
  };

  // Agregar carrera: desplegable (planes precargados + importar XLS).
  const [agregando, setAgregando] = useState(false);
  const [showPlanImport, setShowPlanImport] = useState(false);
  const planesDisponibles = SEED_PLANES.filter(
    (p) => !carreras.some((c) => c.id === p.id),
  );

  const elegirPlan = (value: string) => {
    if (value === "__xls__") {
      setShowPlanImport(true);
      setAgregando(false);
      return;
    }
    const plan = SEED_PLANES.find((p) => p.id === value);
    if (plan) {
      loadSeedPlan(plan);
      setAgregando(false);
      setShowPlanImport(false);
    }
  };

  const [loading, setLoading] = useState<Record<Tipo, boolean>>({
    plan: false,
    historia: false,
    oferta: false,
  });
  const [done, setDone] = useState<Record<Tipo, boolean>>({
    plan: false,
    historia: false,
    oferta: false,
  });

  const handleFile = async (file: File, tipo: Tipo) => {
    setLoading((p) => ({ ...p, [tipo]: true }));
    try {
      if (tipo === "plan") {
        const result = await parsePlanEstudios(file);
        const pareceHistoria = result.carrera.materias.every((m) => m.anio == null);
        if (result.carrera.materias.length > 0 && pareceHistoria) {
          const seguir = window.confirm(
            "Este archivo no parece un Plan de estudios (ninguna materia tiene año/módulo). " +
              "¿Seguro que no es la Historia académica? Aceptar para importar igual, Cancelar para abortar.",
          );
          if (!seguir) return;
        }
        let res = importPlan(result);
        if (res.status === "conflict") {
          const ok = window.confirm(
            `La carrera "${res.nombre}" ya está importada. ¿Reemplazar sus datos?`,
          );
          if (!ok) return;
          res = importPlan(result, true);
        }
        setShowPlanImport(false);
        setAgregando(false);
        onNavigate("dashboard");
      } else if (tipo === "historia") {
        const { entradas, alumno } = await parseHistoriaAcademica(file);
        importHistoria(entradas, alumno);
      } else {
        importOferta(await parseOferta(file));
      }
      setDone((p) => ({ ...p, [tipo]: true }));
    } catch (err) {
      window.alert("Error al leer el archivo: " + (err as Error).message);
    } finally {
      setLoading((p) => ({ ...p, [tipo]: false }));
    }
  };

  const downloadBackup = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tup-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const backupRef = useRef<HTMLInputElement>(null);
  const handleBackupFile = async (file: File) => {
    const ok = importBackup(await file.text());
    if (ok) onNavigate("dashboard");
    else window.alert("El archivo de backup no es válido.");
  };

  const handleClear = () => {
    if (window.confirm("¿Borrar TODOS los datos guardados? Esta acción no se puede deshacer.")) {
      clearAll();
      setDone({ plan: false, historia: false, oferta: false });
    }
  };

  // ─── Google Drive (backup en la cuenta personal) ──────────────────────────
  const driveOn = isDriveConfigured();
  const [driveBusy, setDriveBusy] = useState<null | "connect" | "save" | "load">(null);
  const [driveConectado, setDriveConectado] = useState(false);

  const conectarDrive = async () => {
    try {
      setDriveBusy("connect");
      await connectDrive();
      setDriveConectado(true);
    } catch (e) {
      window.alert("No se pudo conectar con Google Drive: " + (e as Error).message);
    } finally {
      setDriveBusy(null);
    }
  };

  const guardarEnDrive = async () => {
    try {
      setDriveBusy("save");
      await saveToDrive(exportBackup());
      setDriveConectado(true);
      window.alert("Backup guardado en tu Google Drive.");
    } catch (e) {
      window.alert("No se pudo guardar en Drive: " + (e as Error).message);
    } finally {
      setDriveBusy(null);
    }
  };

  const restaurarDeDrive = async () => {
    try {
      setDriveBusy("load");
      const res = await loadFromDrive();
      setDriveConectado(true);
      if (!res) {
        window.alert("Todavía no hay ningún backup en tu Drive.");
        return;
      }
      if (importBackup(res.json)) onNavigate("dashboard");
      else window.alert("El backup de Drive no es válido.");
    } catch (e) {
      window.alert("No se pudo restaurar desde Drive: " + (e as Error).message);
    } finally {
      setDriveBusy(null);
    }
  };

  const planImportDropzone = (
    <DropZone
      tipo="plan"
      label="Plan de estudios"
      desc="Reportes → Plan de estudios → XLS"
      icon={FileText}
      loading={loading.plan}
      done={done.plan}
      onFile={handleFile}
    />
  );

  const mostrarSelector = carreras.length === 0 || agregando;

  return (
    <div className="space-y-6">
      {/* 1) Datos del alumno (el XLS de historia no los trae) */}
      <Card>
        <CardContent className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Datos del alumno
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 space-y-1.5" style={{ minWidth: 200 }}>
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
            </div>
            <div className="w-40 space-y-1.5">
              <Label>Legajo</Label>
              <Input value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Legajo" />
            </div>
            <Button variant="outline" onClick={saveAlumno}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2) Carrera en curso */}
      <Card>
        <CardContent className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Carrera en curso
          </div>

          {carreras.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
            >
              <div>
                <div className="text-sm font-medium">{c.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {c.codigo && <>({c.codigo}) · </>}
                  {c.materias.filter((m) => m.esPrincipal).length} materias
                  {(() => {
                    const cred = c.materias.filter((m) => !m.esPrincipal).length;
                    return cred > 0 ? ` · ${cred} créditos/electivas` : "";
                  })()}
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => removeCarrera(c.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}

          {mostrarSelector ? (
            <div className="space-y-2">
              <Select value="" onValueChange={elegirPlan}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un plan de estudios…" />
                </SelectTrigger>
                <SelectContent>
                  {planesDisponibles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} · {p.version}
                    </SelectItem>
                  ))}
                  <SelectItem value="__xls__">Importar plan de estudio (XLS)…</SelectItem>
                </SelectContent>
              </Select>
              {carreras.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAgregando(false);
                    setShowPlanImport(false);
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAgregando(true)}>
              <Plus className="size-4" /> Agregar carrera
            </Button>
          )}

          
        </CardContent>
      </Card>

      {/* 3) Importadores */}
      <div className="grid gap-4 md:grid-cols-2">
        {showPlanImport && <div className="pt-1">{planImportDropzone}</div>}
        <DropZone
          tipo="historia"
          label="Historia académica"
          desc="Reportes → Historia académica → XLS"
          icon={BarChart3}
          loading={loading.historia}
          done={done.historia}
          onFile={handleFile}
        />
        {import.meta.env.DEV && (
          <DropZone
            tipo="oferta"
            label="Oferta de materias"
            desc="XLS con la oferta del cuatrimestre"
            icon={CalendarDays}
            loading={loading.oferta}
            done={done.oferta}
            onFile={handleFile}
          />
        )}
      </div>

      {/* 4) Cómo exportar del SIU */}
      <div className="rounded-lg border border-en-curso/20 bg-en-curso/10 px-4 py-3 text-sm">
        <strong className="text-en-curso">¿Cómo exportar desde SIU Guaraní?</strong>
        <ol className="mt-1 list-inside list-decimal text-muted-foreground">
          <li>Ingresá a tu SIU Guaraní → Reportes / Mis datos académicos</li>
          <li>Plan de estudios → Exportar a Excel (XLS)</li>
          <li>Historia académica → Exportar a Excel (XLS)</li>
          <li>(Opcional) Pedí a tu facultad el XLS de oferta del cuatrimestre</li>
        </ol>
      </div>

      {/* 5) Sincronizar con Google Drive */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Cloud className="size-4" /> Sincronizar con Google Drive
          </div>
          {driveOn ? (
            <>
              <p className="text-xs text-muted-foreground">
                Guardá un backup en tu cuenta de Google y restauralo en cualquier dispositivo.
                {driveConectado && (
                  <span className="ml-1 text-aprobado">· Conectado ✓</span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={guardarEnDrive}
                  disabled={driveBusy !== null || !hasData}
                >
                  {driveBusy === "save" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CloudUpload className="size-4" />
                  )}
                  Guardar en Drive
                </Button>
                <Button
                  variant="outline"
                  onClick={restaurarDeDrive}
                  disabled={driveBusy !== null}
                >
                  {driveBusy === "load" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CloudDownload className="size-4" />
                  )}
                  Restaurar de Drive
                </Button>
                {!driveConectado && (
                  <Button variant="ghost" onClick={conectarDrive} disabled={driveBusy !== null}>
                    {driveBusy === "connect" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Conectar cuenta
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Función no configurada. Falta la variable{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">VITE_GOOGLE_CLIENT_ID</code>{" "}
              con el OAuth Client ID de Google.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 6) Backup + borrar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={downloadBackup} disabled={!hasData}>
          <Download className="size-4" /> Exportar backup (JSON)
        </Button>
        <Button variant="outline" onClick={() => backupRef.current?.click()}>
          <Upload className="size-4" /> Importar backup
        </Button>
        <input
          ref={backupRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleBackupFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
        {hasData && (
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 className="size-4" /> Borrar todos los datos
          </Button>
        )}
      </div>
    </div>
  );
}

interface DropZoneProps {
  tipo: Tipo;
  label: string;
  desc: string;
  icon: typeof FileText;
  loading: boolean;
  done: boolean;
  onFile: (file: File, tipo: Tipo) => void;
}

function DropZone({ tipo, label, desc, icon: Icon, loading, done, onFile }: DropZoneProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f, tipo);
      }}
      className={cn(
        "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        done
          ? "border-aprobado/40 bg-aprobado/5"
          : dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary hover:bg-primary/5",
      )}
    >
      <div className="mb-3 flex justify-center">
        {done ? (
          <CheckCircle2 className="size-9 text-aprobado" />
        ) : loading ? (
          <Loader2 className="size-9 animate-spin text-primary" />
        ) : (
          <Icon className="size-9 text-muted-foreground" />
        )}
      </div>
      <div className="text-sm font-semibold">{done ? `${label} cargado` : label}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {done ? "Procesado · Clic para reemplazar" : desc}
      </div>
      {!done && !loading && (
        <Badge variant="secondary" className="mt-3">
          Seleccionar archivo
        </Badge>
      )}
      <input
        ref={ref}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0], tipo);
          e.target.value = "";
        }}
      />
    </div>
  );
}
