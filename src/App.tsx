import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PAGE_META, type PageId } from "@/components/layout/nav";
import { Dashboard } from "@/pages/Dashboard";
import { PlanEstudios } from "@/pages/PlanEstudios";
import { Creditos } from "@/pages/Creditos";
import { HistoriaAcademica } from "@/pages/HistoriaAcademica";
import { Correlatividades } from "@/pages/Correlatividades";
import { Oferta } from "@/pages/Oferta";
import { Importar } from "@/pages/Importar";
import { useAppStore, useHasData } from "@/store/useAppStore";

export default function App() {
  const hasData = useHasData();
  const seedLoaded = useAppStore((s) => s.seedLoaded);
  const loadSeed = useAppStore((s) => s.loadSeed);
  const carrerasCount = useAppStore((s) => s.carreras.length);
  const [page, setPage] = useState<PageId>("importar");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [booted, setBooted] = useState(false);

  // Al abrir por primera vez: si el store está vacío, cargar la plantilla por
  // default (Licenciatura). Luego ir al dashboard si hay datos.
  useEffect(() => {
    if (booted) return;
    if (!seedLoaded && carrerasCount === 0) {
      loadSeed();
      setPage("dashboard");
    } else if (hasData) {
      setPage("dashboard");
    }
    setBooted(true);
  }, [booted, hasData, seedLoaded, carrerasCount, loadSeed]);

  // Resetear scroll al cambiar de página.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [page]);

  const navigate = (id: PageId) => {
    setPage(id);
    setMobileOpen(false);
  };

  const meta = PAGE_META[page];

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "plan":
        return <PlanEstudios />;
      case "creditos":
        return <Creditos />;
      case "historia":
        return <HistoriaAcademica />;
      case "correlatividades":
        return <Correlatividades />;
      case "oferta":
        return import.meta.env.DEV ? <Oferta /> : <Dashboard />;
      case "importar":
        return <Importar onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border transition-all lg:block",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="fixed top-0 bottom-0 h-screen" style={{ width: collapsed ? 64 : 240 }}>
          <Sidebar
            page={page}
            onNavigate={navigate}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <Sidebar page={page} onNavigate={navigate} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.sub}</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">
          {!hasData && page !== "importar" && (
            <div className="mb-6 rounded-lg border border-en-curso/20 bg-en-curso/10 px-4 py-3 text-sm">
              📂 Todavía no cargaste datos.{" "}
              <button
                onClick={() => navigate("importar")}
                className="font-medium text-primary underline"
              >
                Importar ahora →
              </button>
            </div>
          )}
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
