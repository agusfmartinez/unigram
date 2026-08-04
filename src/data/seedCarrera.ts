import type { Carrera, Materia } from "@/types";

/**
 * Plantilla de la Licenciatura en Informática (UNAHUR) — plan ITI23_25v1.
 * Despersonalizada: todas las materias arrancan en "pendiente", sin nota ni
 * fecha. Incluye estructura del plan, créditos, flags de título intermedio y
 * las correlatividades. Se carga por default al primer arranque (store vacío)
 * y desde el botón en Importar.
 */

// Helpers para declarar materias de forma compacta.
const M1 = "1er año Lic en Informática";
const M2 = "2do año Lic en Informática";
const MU = "2do año Lic en Informática / ASIGNATURA UNAHUR_1";
const M3 = "3er año Lic en Informática";
const M4 = "4to año Lic en Informática";
const M5 = "5to año Lic en Informática";
const MACA = "ACA — Actividades Curriculares Acreditables";

/** materia principal del plan */
function mat(
  codigo: string,
  nombre: string,
  anio: number,
  creditos: number,
  modulo: string,
  ti: boolean,
): Materia {
  return {
    id: codigo,
    codigo,
    nombre,
    tipo: "materia",
    anio,
    periodo: "Cuatrimestral",
    nota: null,
    estado: "pendiente",
    origen: "",
    creditos,
    modulo,
    esPrincipal: true,
    tituloIntermedio: ti,
  };
}

/** electiva UNAHUR (AU) — actividad de crédito, no principal */
function au(codigo: string, nombre: string): Materia {
  return {
    id: codigo,
    codigo,
    nombre,
    tipo: "credito",
    anio: 2,
    periodo: "",
    nota: null,
    estado: "pendiente",
    origen: "",
    creditos: 3,
    modulo: MU,
    esPrincipal: false,
    tituloIntermedio: false,
  };
}

/** actividad ACA — crédito no principal */
function aca(codigo: string, nombre: string, creditos: number): Materia {
  return {
    id: codigo,
    codigo,
    nombre,
    tipo: "credito",
    anio: 10,
    periodo: "",
    nota: null,
    estado: "pendiente",
    origen: "",
    creditos,
    modulo: MACA,
    esPrincipal: false,
    tituloIntermedio: true,
  };
}

const materias: Materia[] = [
  // ── 1er año ──
  mat("789", "Introducción a lógica y problemas computacionales", 1, 7, M1, true),
  mat("788", "Matemática para informática I", 1, 7, M1, true),
  mat("790", "Organización de computadoras I", 1, 7, M1, true),
  mat("004", "Cultura y alfabetización digital en la universidad", 1, 4, M1, true),
  mat("786", "Tecnología y sociedad", 1, 4, M1, false),
  mat("SA_007", "Inglés", 1, 4, M1, true),
  mat("792", "Programación estructurada", 1, 7, M1, true),
  mat("793", "Matemática para informática II", 1, 7, M1, true),
  mat("TI_007", "Lenguajes informáticos I", 1, 7, M1, true),
  mat("795", "Organización de computadoras II", 1, 5, M1, false),

  // ── 2do año ──
  mat("753", "Programación con objetos I", 2, 7, M2, true),
  mat("752", "Estructuras de datos", 2, 7, M2, true),
  mat("754", "Bases de datos", 2, 7, M2, true),
  mat("TI_013", "Matemática para informática III", 2, 5, M2, false),
  mat("756", "Redes de computadoras", 2, 5, M2, false),
  mat("765", "Programación con objetos II", 2, 7, M2, true),
  mat("TI_015", "Sistemas y organizaciones", 2, 6, M2, true),
  mat("768", "Algoritmos", 2, 6, M2, false),
  mat("757", "Sistemas operativos", 2, 6, M2, false),
  { ...mat("UNAHUR_1", "Asignatura UNAHUR", 2, 0, MU, true), periodo: "" },

  // ── Electivas UNAHUR (catálogo AU) ──
  au("AU_2", "AU_Abordaje de situaciones sociales complejas"),
  au("AU_11", "AU_Software libre y sociedad"),
  au("AU_12", "AU_Taller de escritura creativa"),
  au("AU_3", "AU_Análisis y diseño de políticas públicas"),
  au("AU_4", "AU_Ciencia Tecnología y sociedad"),
  au("AU_5", "AU_Culturas Juveniles"),
  au("AU_6", "AU_Filosofía"),
  au("AU_7", "AU_Pensamiento Nacional"),
  au("AU_8", "AU_Robótica"),
  au("AU_9", "AU_Universidad, territorio e intervenciones sociales"),
  au("AU_1", "AU_Literatura Argentina. Ficciones de la patria"),
  au("AU_10", "AU_Investigación cualitativa"),
  au("AU_13", "AU_Métodos participativos de transformación de conflictos"),
  au("AU_14", "AU_Malvinas: una Causa de nuestra América Latina"),
  au("AU_15", "AU_Pensar Hurlingham"),
  au("AU_17", "AU_Astro: Relación de la Humanidad con el Cosmos"),
  au("AU_16", "AU_Modos de ver el Mundo contemporáneo a través del lenguaje audiovisual"),
  au("AU_20", "AU_Ciudadanía activa y compromiso social"),
  au("AU_18", "AU_Infancias, derechos y políticas"),
  au("AU_19", "AU_Innovación y creatividad"),
  au("AU_21", "AU_Técnicas de investigación en opinión pública"),
  au("AU_22", "AU_Cuentos norteamericanos"),
  au("AU_30", "AU_Arte contemporáneo: un recorrido por la historia del siglo XX a través de las vanguardias artísticas"),
  au("AU_32", "AU_Educación Sexual Integral. Cuando lo esencial es visible a los ojos"),
  au("AU_33", "AU_Género y Sociedad: una nueva mirada para una era mas justa"),
  au("AU_28", "AU_Invitación a un clásico de la Literatura"),
  au("AU_27", "AU_Literatura y Memoria"),
  au("AU_26", "AU_Manipulación genética en humanos. Historia, mitos y realidades"),
  au("AU_31", "AU_Una Historia del Rock Nacional"),
  au("AU_25", "AU_Literatura y Política"),
  au("AU_24", "AU_Arte y Tecnología"),
  au("AU_23", "AU_La vida secreta de las rocas"),
  au("AU_34", "AU_Introducción a la Imagen. (De la imagen fija a la imagen en movimiento)"),
  au("AU_35", "AU_Cuando los Pasados No Pasan: lugares de memoria"),
  au("AU_36", "AU_Pensamiento Ambiental Latinoamericano"),
  au("AU_37", "AU_Pensamiento Pedagógico Latinoamericano"),
  au("AU_39", "AU_No sos vos, es Freud: una introducción al psicoanálisis"),
  au("AU_40", "AU_Introducción al Latín"),
  au("AU_41", "AU_Hacia una Práctica Profesional Inclusiva"),
  au("AU_42", "AU_Ciencias en la cocina"),
  au("AU_43", "AU_Cine documental: miradas desde el Sur"),
  au("AU_44", "AU_Repensar la discapacidad"),
  au("AU_45", "AU_Introducción al griego"),
  au("AU_46", "AU_Mal de tango. La historia argentina a través del tango"),
  au("AU_47", "AU_ESI en el campo de la salud: un abordaje integral sobre la sexualidad"),
  au("AU_48", "AU_Debates políticos actuales. Ideas para pensar el mundo de hoy"),
  au("AU_49", "AU_Educación y memoria: la transmisión del pasado reciente en las aulas"),
  au("AU_50", "AU_CINE.AR La Argentina contemporánea a través del cine"),
  au("AU_52", "AU_Derechos: los tuyos, los míos, los nuestros"),
  au("AU_51", "AU_Modos de ver el mundo contemporáneo a través del lenguaje audiovisual. Cine, jóvenes y trabajo"),
  au("AU_53", "AU_Ciencias del fin del mundo"),
  au("AU_54", "AU_Ciencia, tecnología e innovación para el desarrollo"),
  au("AU_55", "AU_Habilidades blandas: un acercamiento al mundo del trabajo"),
  au("AU_56", "AU_Soberanía alimentaria para la inclusión social"),
  au("AU_61", "AU_El Holocausto, el abismo de la humanidad"),

  // ── 3er año ──
  mat("758", "Construcción de interfaces de usuario", 3, 7, M3, true),
  mat("759", "Estrategias de persistencia", 3, 7, M3, true),
  mat("TI_105", "Ingeniería de software I", 3, 7, M3, true),
  mat("1401", "Álgebra lineal", 3, 5, M3, false),
  mat("783", "Ejercicio profesional en tecnología", 3, 4, M3, false),
  mat("763", "Desarrollo de aplicaciones", 3, 6, M3, false),
  mat("762", "Laboratorio de sistemas operativos y redes", 3, 6, M3, false),
  mat("TI_108", "Lenguajes informáticos II", 3, 5, M3, false),
  mat("778", "Arquitectura de software I", 3, 6, M3, false),
  mat("TI_017", "Matemática para informática IV", 3, 5, M3, false),

  // ── 4to año ──
  mat("TI_110", "Ingeniería de software II", 4, 5, M4, false),
  mat("774", "Probabilidad y estadística", 4, 5, M4, false),
  mat("TI_111", "Lenguajes informáticos III", 4, 5, M4, false),
  mat("771", "Seguridad de la información", 4, 5, M4, false),
  mat("TI_113", "Computabilidad y complejidad", 4, 5, M4, false),
  mat("1405", "Fundamentos de redes neuronales", 4, 5, M4, false),
  mat("TI_115", "Lenguajes informáticos IV", 4, 6, M4, false),
  mat("TI_116", "Formalización de lenguajes y generación de código", 4, 5, M4, false),
  mat("781", "Arquitectura de software II", 4, 5, M4, false),
  mat("764", "Práctica profesional supervisada", 4, 7, M4, false),

  // ── 5to año ──
  mat("785", "Gestión de proyectos de desarrollo de software", 5, 5, M5, false),
  mat("1407", "Aprendizaje automático", 5, 6, M5, false),
  mat("779", "Sistemas distribuidos y tiempo real", 5, 5, M5, false),
  mat("782", "Arquitectura de computadoras", 5, 5, M5, false),
  mat("TI_123", "Proyecto final", 5, 7, M5, false),

  // ── ACA (Actividades Curriculares Acreditables) ──
  aca("ACA_TI36", "ACA Procesamiento de imágenes y visión por computadora", 5),
  aca("ACA_TI34a", "ACA: 3 Créditos en Actividades Curriculares Acreditables", 3),
  aca("ACA_TI34b", "ACA: 4 Créditos en Actividades Curriculares Acreditables", 4),
  aca("ACA_TI35", "ACA: Sistemas de información geográfica", 4),
  aca("ACA_TI29", "ACA: Introducción a computación cuántica y tecnologías cuánticas", 5),
  aca("ACA_TI37", "ACA: Proyecto integrador Programación", 6),
];

const correlatividades: Record<string, string[]> = {
  "752": ["792"],
  "753": ["792"],
  "754": ["792"],
  "756": ["790"],
  "757": ["790"],
  "758": ["754", "765"],
  "759": ["754", "765"],
  "762": ["795", "756", "757"],
  "763": ["758", "759", "TI_105"],
  "764": ["763"],
  "765": ["753"],
  "768": ["752"],
  "771": ["762"],
  "774": ["TI_017"],
  "778": ["758", "759", "TI_105"],
  "779": ["762"],
  "781": ["778"],
  "782": ["762"],
  "783": ["786"],
  "785": ["TI_110"],
  "792": ["789"],
  "793": ["788"],
  "795": ["790"],
  "1401": ["TI_007"],
  "1405": ["774"],
  "1407": ["TI_113"],
  TI_007: ["789"],
  TI_013: ["793"],
  TI_015: ["792"],
  TI_105: ["TI_015"],
  TI_108: ["793", "765", "768"],
  TI_017: ["TI_013", "1401"],
  TI_110: ["TI_105"],
  TI_111: ["792", "757"],
  TI_113: ["768", "1401"],
  TI_115: ["768", "TI_108"],
  TI_116: ["TI_113"],
  TI_123: ["TI_115", "764"],
};

export const SEED_CARRERA: Carrera = {
  id: "licenciatura-en-informatica-iti23-25v1",
  nombre: "Licenciatura en Informática",
  codigo: "023",
  version: "ITI23_25v1",
  universidad: "Universidad Nacional de Hurlingham",
  materias,
  correlatividades,
  importadaEn: "2026-07-28T00:00:00.000Z",
};

/** Catálogo de planes de estudio precargados (para el desplegable de Importar). */
export const SEED_PLANES: Carrera[] = [SEED_CARRERA];
