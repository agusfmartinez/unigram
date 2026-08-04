import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, type PageId } from "./nav";
import { CarreraSelector } from "./CarreraSelector";
import { useAppStore, useActiveCarrera } from "@/store/useAppStore";

interface SidebarProps {
  page: PageId;
  onNavigate: (id: PageId) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SECTION_LABEL: Record<string, string> = {
  carrera: "Carrera",
  herramientas: "Herramientas",
};

export function Sidebar({ page, onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const alumno = useAppStore((s) => s.alumno);
  const carreraActiva = useActiveCarrera();
  const sections = [...new Set(NAV.map((n) => n.section))];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          Uni
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="truncate text-sm font-bold leading-tight">Unigram</div>
            <div className="truncate text-xs text-muted-foreground">
              {alumno ? alumno.nombre.split(" ")[0] : carreraActiva?.nombre ?? "Sin datos"}
            </div>
          </div>
        )}
      </div>

      {/* Carrera selector */}
      {!collapsed && (
        <div className="border-b border-sidebar-border px-3 py-3">
          <CarreraSelector />
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((sec) => (
          <div key={sec} className="mb-1">
            {!collapsed && (
              <div className="px-2.5 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {SECTION_LABEL[sec]}
              </div>
            )}
            {NAV.filter((n) => n.section === sec).map((item) => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer collapse (desktop only) */}
      {onToggleCollapse && (
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <ChevronLeft className="size-4" />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
