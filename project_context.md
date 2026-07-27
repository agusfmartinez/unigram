# TUP Tracker — Contexto del Proyecto

## Descripción general

Aplicación web para que estudiantes universitarios hagan seguimiento de su carrera académica. El usuario importa sus datos directamente desde el **SIU Guaraní** (sistema de gestión académica usado en universidades argentinas) mediante archivos XLS exportados desde ese sistema.

La app muestra: progreso de la carrera, historial de notas, materias en curso, materias pendientes, diagrama de correlatividades, y oferta académica del cuatrimestre para planificar inscripciones.

**Universidad de referencia actual:** UNAHUR (Universidad Nacional de Hurlingham)  
**Carrera de referencia actual:** Tecnicatura Universitaria en Programación (TUP) / Licenciatura en Informática

---

## Stack objetivo

- **Framework:** React (Vite) o Next.js — a definir en la refactorización. Next.js es preferido si se va a deployar en Vercel para aprovechar el ecosistema.
- **Deploy:** Vercel (producción)
- **Estilos:** El diseño actual usa variables CSS custom con paleta oscura, pero usemos Tailwind CSS o shadcn/ui. Establecer modo claro y modo oscuro.
- **Sin backend:** No hay servidor, no hay base de datos remota, no hay autenticación.

### Origen del proyecto

El proyecto comenzó como un único archivo HTML (~1400 líneas) con React via CDN + SheetJS para parsear XLS. La tarea de Claude Code es refactorizarlo a una estructura de proyecto React/Next.js real, manteniendo toda la funcionalidad existente y aplicando las mejoras descritas en este documento.

---

## Almacenamiento de datos (sin backend)

**Decisión de diseño:** Toda la información del usuario vive en el cliente. No hay login, no hay cuenta, no hay base de datos remota.

### Estrategia de persistencia
- **`localStorage`** es la opción principal para persistencia entre sesiones en el mismo dispositivo/navegador.
- Los datos se guardan serializados como JSON bajo claves con prefijo `tup_`.
- Claves actuales: `tup_materias`, `tup_historia`, `tup_oferta`, `tup_alumno`.

### Consideraciones importantes
- Al deployar en Vercel como sitio estático o app Next.js, **no se usan cookies de sesión ni server-side storage**.
- El `localStorage` es por origen (dominio), por lo que todos los datos del usuario persisten mientras no limpien el navegador.
- **Mobile PWA:** La app debe poder instalarse como acceso directo en iOS y Android (modo standalone). Para esto se necesita:
  - Un `manifest.json` con `display: "standalone"` y los íconos correspondientes.
  - Meta tags de Apple (`apple-mobile-web-app-capable`, etc.).
  - No es necesario un Service Worker completo para esta etapa, pero sería deseable para funcionamiento offline.
- **Exportar/importar backup:** Como el `localStorage` no se sincroniza entre dispositivos, sería útil agregar la opción de exportar todos los datos como JSON y volver a importarlos. Esto permite cambiar de dispositivo sin perder información.

### Migración futura posible
El diseño de datos debe facilitar una futura migración a una base de datos (Supabase o MongoDB Atlas Free Tier son las candidatas). Para eso:
- Los datos deben estar bien tipados y estructurados (no mezclar strings con nulls sin control).
- Cada carrera debe tener un identificador único claro.
- Los IDs de materias deben ser estables (el código del SIU Guaraní, ej: `"788"`, `"753"`).

Tambien se me ocurre que podriamos sincronizar con Google Drive, y que el usuario guarde ahi un JSON con toda la información.

---

## Estructura de datos actual

### Materia (del plan de estudios)
```typescript
interface Materia {
  id: string;           // código SIU (ej: "788") o generado si no tiene
  codigo: string;       // código numérico o alfanumérico del SIU
  nombre: string;       // nombre limpio sin el código entre paréntesis
  tipo: 'materia' | 'credito';  // 'credito' = actividades extracurriculares, AU_, CR_, etc.
  anio: number | null;  // 1, 2 o 3 (año del plan)
  periodo: string;      // cuatrimestre u otro período
  nota: number | 'C' | null;
  estado: 'aprobado' | 'en_curso' | 'pendiente';
  origen: string;       // 'Promoción', 'Regularidad', etc.
  creditos: number;
  modulo: string;       // nombre del módulo/sección en el plan
  esPrincipal: boolean; // true si es materia del plan principal (no crédito/genérica)
}
```

### Entrada de historia académica
```typescript
interface EntradaHistoria {
  actividad: string;    // nombre completo con código entre paréntesis
  nombre: string;       // nombre sin código
  codigo: string;
  fecha: string;        // formato DD/MM/YYYY
  tipo: string;         // 'Promocion', 'Regularidad', 'En curso'
  nota: string;         // string crudo del SIU ("9", "C", "10", etc.)
  notaNum: number | null;
  resultado: string;    // 'Aprobado', 'Promocionado', etc.
}
```

### Materia de oferta académica
```typescript
interface MateriaOferta {
  nombre: string;
  codigo: string;
  dia: string;          // puede ser "Lunes", "Martes y Jueves", etc.
  horaInicio: string;
  horaFin: string;
  modalidad: string;    // "Presencial", "Virtual", etc.
  docente: string;
  anio: string;
  cuatrimestre: string;
  raw: Record<string, string>; // fila original cruda para no perder columnas desconocidas
}
```

---

## Soporte de múltiples carreras

### El problema
Un usuario puede estar cursando más de una carrera (o una carrera con título intermedio). Desde el SIU Guaraní se puede seleccionar la carrera y exportar el plan de estudios de cada una por separado.

### Implementación esperada
- El importador debe detectar a qué carrera pertenece cada archivo importado (el XLS incluye el nombre de la propuesta en la cabecera).
- Nunca duplicar una carrera ya importada. Criterio de unicidad: `(nombre_propuesta, version_plan)`. Si ya existe, preguntar al usuario si quiere reemplazarla o cancelar.
- Nunca duplicar materias dentro de una carrera. Criterio: código de materia. Si una materia del mismo código ya existe en esa carrera, no importarla de nuevo (o actualizar su estado si cambió).
- La UI debe tener un **selector de carrera activa** visible (dropdown o tabs) para cambiar entre carreras.
- Las secciones de Dashboard, Plan de Estudios, Historia Académica y Correlatividades deben mostrarse **filtradas por la carrera activa**.
- La Historia Académica puede ser compartida entre carreras (el SIU la exporta sin distinción de carrera), pero el cruce con el plan de estudios debe hacerse por carrera.

### Estructura de datos sugerida para múltiples carreras
```typescript
interface Carrera {
  id: string;              // slug generado: ej "tup-v1", "lic-informatica-v2026"
  nombre: string;          // "Tecnicatura Universitaria en Programación"
  codigo: string;          // código SIU: "033"
  version: string;         // versión del plan: "TUP_V1"
  universidad: string;     // "Universidad Nacional de Hurlingham"
  materias: Materia[];
  importadaEn: string;     // ISO date string
}

interface AppState {
  carreras: Carrera[];
  carreraActivaId: string | null;
  historia: EntradaHistoria[];   // compartida entre carreras
  oferta: MateriaOferta[];       // oferta del cuatrimestre (puede variar por carrera)
  alumno: {
    nombre: string;
    legajo: string;
  } | null;
}
```

---

## Títulos intermedios y equivalencias entre carreras

### Contexto UNAHUR (caso real)
- Actualmente existen **dos carreras separadas** en el SIU: 
  - `(033) Tecnicatura Universitaria en Programación`
  - `(034) Licenciatura en Informática` (o similar)
- A partir de 2026, el plan se unifica: habrá una **Licenciatura en Informática** con **Tecnico en Programación** como título intermedio.
- Las materias de la tecnicatura son un subconjunto de las de la licenciatura (hay equivalencias).

### Lo que hace el SIU
El SIU sigue mostrando las carreras como entidades separadas. El usuario puede exportar el plan de cada una. No cambia nada en el proceso de importación de nuestra app.

### Lo que debe mostrar la app
- Cuando el usuario tiene importadas **dos carreras con materias en común** (mismos códigos), la app debe poder marcar esas materias como **compartidas/equivalentes**.
- En la vista del plan de estudios, mostrar una distinción visual: qué materias son solo de la tecnicatura, cuáles solo de la licenciatura, y cuáles son compartidas.
- En el dashboard, mostrar el avance **por carrera** y también un avance combinado si corresponde.
- No hace falta que la app detecte automáticamente equivalencias por código: alcanza con que al mostrar el plan de dos carreras que comparten materias (mismo código SIU), las marque visualmente como "también requerida en [otra carrera]".

---

## Funcionalidades actuales (HTML prototipo)

### ✅ Implementadas
- Importar plan de estudios desde XLS del SIU Guaraní
- Importar historia académica desde XLS del SIU Guaraní
- Importar oferta de materias desde XLS (formato libre, la app intenta detectar columnas)
- Dashboard: stats generales, avance por año, distribución de notas, materias en curso, próximas habilitadas
- Plan de estudios: tabla con filtros por estado y búsqueda, indicador de correlativas
- Historia académica: timeline de aprobaciones
- Correlatividades: grafo SVG interactivo (las correlativas de TUP UNAHUR están hardcodeadas)
- Oferta de materias: lista con selección múltiple + vista de horario semanal
- Persistencia en `localStorage`
- Borrar todos los datos

### ❌ Pendiente / Por implementar
- Soporte de múltiples carreras (selector, deduplicación, etc.)
- Visualización de materias compartidas entre carreras / títulos intermedios
- PWA manifest para instalación como acceso directo en mobile
- Export/import de backup en JSON
- Correlatividades para carreras distintas a TUP UNAHUR (actualmente hardcodeadas)
- Edición manual de correlatividades (por si el usuario quiere corregir o usa otra universidad)
- Gráfico de avance en el tiempo (línea temporal de aprobaciones)
- Vista de créditos extracurriculares (actividades AU_, CR_, etc.)
- Modo oscuro/claro toggle (actualmente solo oscuro)
- Responsive mobile completo (sidebar colapsable en mobile)

---

## Parseo de XLS del SIU Guaraní

### Plan de estudios
El XLS tiene una cabecera libre (nombre del alumno, legajo, propuesta, plan, versión) seguida de secciones marcadas con los prefijos:
- `MÓDULO: / PRIMER AÑO - TUP` → materias del módulo anual
- `MATERIA GENÉRICA: / SEGUNDO AÑO - TUP / ASIGNATURA UNAHUR_1` → electivas/actividades
- `MATERIA GENÉRICA: / CRÉDITOS - TUP / ...` → créditos extracurriculares

Dentro de cada sección hay una fila de encabezado (`Actividad, Tipo, Año, Período, Nota, Origen, Créditos, Puntaje`) seguida de las filas de materias.

El código de la materia viene **entre paréntesis al final del nombre**, ej: `Matemática para informática I (788)`.

Los estados posibles en la columna Nota/Origen:
- Nota numérica + `(Promocionado)` → aprobada por promoción
- `En Curso` en columna Origen → cursando actualmente
- Vacío → pendiente

### Historia académica
Estructura más simple: fila de encabezado (`Actividad, Fecha, Tipo, Nota, Resultado`) seguida de todas las entradas. Una materia puede aparecer **múltiples veces** (una vez por tipo: Regularidad, Promocion, En curso). Al cruzar con el plan, tomar la entrada con el mejor resultado.

### Oferta de materias
Formato variable (depende de cómo lo exporte cada facultad). La app debe intentar detectar columnas por nombre. Las columnas que se buscan: `materia/nombre/actividad`, `dia/días`, `hora inicio/inicio`, `hora fin/fin`, `modalidad`, `docente/profesor`, `año/anio`, `cuatrimestre/cuat`, `codigo/cód`.

---

## Correlatividades

Las correlatividades **no vienen en el XLS del SIU Guaraní**. Actualmente están hardcodeadas para el plan TUP de UNAHUR:

```javascript
const CORRELATIVIDADES = {
  '789': [],                    // Intro a lógica y problemas computacionales
  '788': [],                    // Matemática para informática I
  '790': [],                    // Organización de computadoras I
  '004': [],                    // Nuevos entornos y lenguajes
  '791': [],                    // Taller de lenguajes de marcado
  '792': ['789'],               // Programación estructurada
  '793': ['788'],               // Matemática para informática II
  '030': [],                    // Inglés I
  '754': ['789', '792'],        // Bases de datos
  '753': ['789', '792'],        // Programación con objetos I
  '752': ['789', '792', '788'], // Estructuras de datos
  '765': ['753'],               // Programación con objetos II
  '043': ['030'],               // Inglés II
  '758': ['765', '754'],        // Construcción de interfaces de usuario
  '759': ['754', '752'],        // Estrategias de persistencia
  '760': ['753', '752'],        // Elementos de ingeniería de software
};
```

**Para la refactorización:** estas correlatividades deberían poder ser editadas por el usuario en caso de que cambien o que use otra universidad. Una solución simple es guardarlas también en `localStorage` y permitir edición desde la UI.

---

## Notas de diseño visual

- Paleta: fondo oscuro azul marino (`#0b1622`), acento verde (`#4ade80`), acento azul (`#38bdf8`), acento amarillo (`#f59e0b`).
- Tipografía: Inter para UI, JetBrains Mono para códigos de materia.
- Sidebar fijo a la izquierda, colapsable.
- Cards con borde sutil y fondo ligeramente más claro que el background.
- Badges de color por estado: verde=aprobado, azul=en curso, gris=pendiente, amarillo=advertencia.
- El diseño es intencionalmente técnico/académico, no "alegre" ni "gamificado".

---

## Checklist para Claude Code

Al refactorizar a React/Next.js, tener en cuenta:

- [ ] Estructura de carpetas estándar (`/components`, `/hooks`, `/utils`, `/types`, `/lib`)
- [ ] TypeScript desde el inicio (interfaces ya definidas en este documento)
- [ ] Hook personalizado `useAppState` o similar para centralizar la lógica de `localStorage`
- [ ] Parsers de XLS en `/lib/parsers/` (separados: `parsePlanEstudios.ts`, `parseHistoriaAcademica.ts`, `parseOferta.ts`)
- [ ] Componente de importación con deduplicación y detección de carrera
- [ ] Selector de carrera activa en el header o sidebar
- [ ] `manifest.json` para PWA (instalación como acceso directo en mobile)
- [ ] Meta tags para iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`)
- [ ] Exportar/importar backup como JSON
- [ ] Responsive: sidebar como drawer en mobile
- [ ] `SheetJS (xlsx)` como librería de parseo (ya funciona bien con los XLS del SIU)
- [ ] Para el grafo de correlatividades: evaluar `react-flow` o `d3` en lugar del SVG manual actual
- [ ] Vercel: si se usa Next.js, el deploy es directo; si es React+Vite, configurar como Static Site en Vercel