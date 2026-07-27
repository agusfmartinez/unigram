import {
  LayoutDashboard,
  ListChecks,
  History,
  Network,
  CalendarDays,
  Upload,
  Award,
  type LucideIcon,
} from "lucide-react";

export type PageId =
  | "dashboard"
  | "plan"
  | "creditos"
  | "historia"
  | "correlatividades"
  | "oferta"
  | "importar";

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  section: "carrera" | "herramientas";
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "carrera" },
  { id: "plan", label: "Plan de Estudios", icon: ListChecks, section: "carrera" },
  { id: "creditos", label: "Créditos y electivas", icon: Award, section: "carrera" },
  { id: "historia", label: "Historia Académica", icon: History, section: "carrera" },
  { id: "correlatividades", label: "Correlatividades", icon: Network, section: "carrera" },
  { id: "oferta", label: "Oferta de Materias", icon: CalendarDays, section: "herramientas" },
  { id: "importar", label: "Importar datos", icon: Upload, section: "herramientas" },
];

export const PAGE_META: Record<PageId, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Resumen general de tu carrera" },
  plan: { title: "Plan de Estudios", sub: "Todas las materias del plan" },
  creditos: { title: "Créditos y electivas", sub: "Actividades extracurriculares y materias genéricas" },
  historia: { title: "Historia Académica", sub: "Tus aprobaciones y notas" },
  correlatividades: { title: "Correlatividades", sub: "Mapa de dependencias entre materias" },
  oferta: { title: "Oferta de Materias", sub: "Materias disponibles este cuatrimestre" },
  importar: { title: "Importar Datos", sub: "Cargá tus archivos del SIU Guaraní" },
};
