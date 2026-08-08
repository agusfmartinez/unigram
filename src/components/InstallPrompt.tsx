import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Aviso para instalar la PWA. Solo aparece si NO está instalada (navegador
 * mobile/desktop), una vez, y es descartable (se recuerda en localStorage).
 */
export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // ya instalada: no mostrar

    // Android/Chrome/desktop: capturamos el evento para el botón "Instalar".
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Mostrar el aviso poco después de cargar (no molesto al instante).
    const t = window.setTimeout(() => setOpen(true), 1500);

    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => setOpen(false);

  const instalar = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" /> Instalá Unigram
          </DialogTitle>
          <DialogDescription>
            Tenela como app: se abre más rápido, en pantalla completa y funciona sin conexión.
          </DialogDescription>
        </DialogHeader>

        {deferred ? (
          // Android / Chrome / desktop: instalación con un toque.
          <p className="text-sm text-muted-foreground">
            Tocá <strong className="text-foreground">Instalar</strong> y confirmá.
          </p>
        ) : isIOS() ? (
          // iOS Safari: no hay instalación automática.
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Tocá el botón <Share className="inline size-4 align-text-bottom" /> Compartir (abajo,
              en Safari).
            </li>
            <li>
              Elegí <strong className="text-foreground">"Agregar a inicio"</strong>.
            </li>
            <li>Confirmá con "Agregar".</li>
          </ol>
        ) : (
          // Otros navegadores: instrucción genérica.
          <p className="text-sm text-muted-foreground">
            En el menú del navegador (⋮) buscá{" "}
            <strong className="text-foreground">"Instalar app"</strong> o el ícono de instalar en la
            barra de direcciones.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>
            Ahora no
          </Button>
          {deferred && <Button onClick={instalar}>Instalar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
