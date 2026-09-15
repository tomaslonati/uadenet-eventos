export type Persona = {
  nombre: string;
  legajo: string;
  rol: "Estudiante" | "Docente" | "Administrativo";
};

/** Padrón de prueba que alimenta el control de asistencia. */
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
