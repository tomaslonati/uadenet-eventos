export type Persona = {
  nombre: string;
  legajo: string;
  rol: "Estudiante" | "Docente" | "Administrativo";
};

/**
 * Padrón de prueba genérico para el control de asistencia. No corresponde a
 * los inscriptos reales de ningún evento puntual — cuando exista el endpoint
 * de inscripciones, este control tiene que leer de ahí (los inscriptos de
 * `evento.id`), no de una lista de personas aparte.
 */
export const PADRON: Persona[] = [
  { nombre: "Martina Aguirre", legajo: "LU 104882", rol: "Estudiante" },
  { nombre: "Joaquín Peralta", legajo: "LU 099431", rol: "Estudiante" },
  { nombre: "Dr. Esteban Ruiz", legajo: "DOC 2214", rol: "Docente" },
  { nombre: "Camila Ordóñez", legajo: "LU 112004", rol: "Estudiante" },
  { nombre: "Federico Lantos", legajo: "ADM 0471", rol: "Administrativo" },
  { nombre: "Valentina Cruz", legajo: "LU 108765", rol: "Estudiante" },
  { nombre: "Nicolás Bermúdez", legajo: "LU 097210", rol: "Estudiante" },
  { nombre: "Lucía Sandoval", legajo: "DOC 1902", rol: "Docente" },
];
