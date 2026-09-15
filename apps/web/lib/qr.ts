const LADO = 13;

/**
 * Matriz 13×13 que dibuja una credencial con aspecto de QR. No codifica datos:
 * el código real lo va a emitir la API, acá sólo se representa la credencial.
 */
export function celdasCredencial(semilla: number): boolean[] {
  const celdas: boolean[] = [];
  for (let i = 0; i < LADO * LADO; i++) {
    const fila = Math.floor(i / LADO);
    const col = i % LADO;
    const enMarcador =
      (fila < 3 && col < 3) || (fila < 3 && col > 9) || (fila > 9 && col < 3);

    if (!enMarcador) {
      celdas.push((fila * 31 + col * 17 + semilla * 7) % 5 < 2);
      continue;
    }

    const anilloSuperiorIzq =
      fila < 3 &&
      col < 3 &&
      (fila === 0 || fila === 2 || col === 0 || col === 2);
    const anilloSuperiorDer =
      fila < 3 &&
      col > 9 &&
      (fila === 0 || fila === 2 || col === 10 || col === 12);
    const anilloInferiorIzq =
      fila > 9 &&
      col < 3 &&
      (fila === 10 || fila === 12 || col === 0 || col === 2);

    celdas.push(anilloSuperiorIzq || anilloSuperiorDer || anilloInferiorIzq);
  }
  return celdas;
}

export const LADO_CREDENCIAL = LADO;
