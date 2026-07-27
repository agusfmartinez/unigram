/**
 * Correlatividades semilla para el plan TUP de UNAHUR.
 * NO vienen en el XLS del SIU Guaraní — se cargan como default y el usuario
 * puede editarlas por carrera desde la UI (se persisten en el store).
 */
export const CORRELATIVIDADES_TUP_UNAHUR: Record<string, string[]> = {
  "789": [], // Intro a lógica y problemas computacionales
  "788": [], // Matemática para informática I
  "790": [], // Organización de computadoras I
  "004": [], // Nuevos entornos y lenguajes
  "791": [], // Taller de lenguajes de marcado
  "792": ["789"], // Programación estructurada
  "793": ["788"], // Matemática para informática II
  "030": [], // Inglés I
  "754": ["789", "792"], // Bases de datos
  "753": ["789", "792"], // Programación con objetos I
  "752": ["789", "792", "788"], // Estructuras de datos
  "765": ["753"], // Programación con objetos II
  "043": ["030"], // Inglés II
  "758": ["765", "754"], // Construcción de interfaces de usuario
  "759": ["754", "752"], // Estrategias de persistencia
  "760": ["753", "752"], // Elementos de ingeniería de software
};

/**
 * Devuelve las correlatividades semilla apropiadas para una carrera recién
 * importada. Si el código/nombre coincide con TUP UNAHUR usa el mapa conocido;
 * si no, arranca vacío (el usuario las completa a mano).
 */
export function seedCorrelatividades(nombre: string, codigo: string): Record<string, string[]> {
  const n = nombre.toLowerCase();
  const esTup =
    codigo === "033" ||
    (n.includes("tecnicatura") && n.includes("program"));
  return esTup ? { ...CORRELATIVIDADES_TUP_UNAHUR } : {};
}
