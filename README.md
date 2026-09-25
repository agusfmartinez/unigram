# uniGram

Web app para que estudiantes universitarios hagan seguimiento de su carrera académica, importando datos directamente desde el **SIU Guaraní** (sistema de gestión académica usado en universidades argentinas).

Sin backend: todo vive en el cliente (`localStorage`). No hay login ni cuenta.

**Referencia actual:** UNAHUR — Tecnicatura Universitaria en Programación (TUP) / Licenciatura en Informática.

## Funcionalidades

- **Importar** plan de estudios, historia académica y oferta de materias desde archivos XLS exportados del SIU Guaraní.
- **Dashboard**: progreso general, avance por año, distribución de notas, materias en curso, próximas habilitadas.
- **Plan de estudios**: tabla con filtros por estado, búsqueda e indicador de correlativas.
- **Historia académica**: timeline de aprobaciones.
- **Correlatividades**: grafo interactivo de correlativas.
- **Oferta de materias**: selección de cursada + vista de horario semanal.
- **Calendario** de eventos académicos.
- **Créditos** extracurriculares.
- Soporte de múltiples carreras.
- Instalable como PWA (acceso directo mobile).

## Stack

- [Vite](https://vitejs.dev/) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (radix-ui, cva, lucide-react)
- [Zustand](https://github.com/pmndrs/zustand) para estado global
- [SheetJS (xlsx)](https://sheetjs.com/) para parseo de archivos del SIU
- vite-plugin-pwa

## Estructura

```
src/
├── components/    # componentes UI (layout, shadcn/ui)
├── data/          # datos estáticos (ej. correlatividades hardcodeadas)
├── lib/parsers/   # parsers de XLS (plan de estudios, historia, oferta)
├── pages/         # vistas de la app (Dashboard, PlanEstudios, Oferta, etc.)
├── store/         # estado global (zustand)
└── types/         # tipos TypeScript compartidos
```

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción (tsc -b && vite build)
npm run preview   # preview del build
npm run lint      # chequeo de tipos
```

## Cómo usar

1. Exportar desde el SIU Guaraní los XLS de plan de estudios, historia académica y/u oferta de materias.
2. Importarlos desde la sección **Importar** de la app.
3. Los datos quedan guardados en `localStorage` del navegador (no se envían a ningún servidor).
