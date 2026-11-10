# ADR 0017 — Lectura del QR de la credencial con la cámara, en el navegador

**Contexto:** la toma de asistencia (HU6) en modo QR mostraba un recuadro decorativo y obligaba a pegar el código a mano: el "escáner" no leía nada. El operador de la puerta usa un celular, y en iPhone el navegador no tiene la API nativa `BarcodeDetector`.

**Opciones consideradas:**
1. `BarcodeDetector` nativo. Descartada: no existe en Safari de iOS, y ahí es donde se va a usar.
2. `html5-qrcode` o `@zxing/browser`: traen su propia interfaz y pesan bastante más. Descartadas por exceso para leer un solo tipo de código.
3. `jsQR` (1.4.0) sobre `getUserMedia` y un `<canvas>`. **Elegida:** solo decodifica, sin interfaz propia, y funciona igual en todos los navegadores.

**Decisión:** `apps/web/app/(app)/asistencia/lector-qr.tsx` abre la cámara trasera solo cuando el operador toca "Activar cámara" (en iOS el permiso exige un gesto), decodifica unos 8 cuadros por segundo sobre una copia achicada del video, y entrega el código a la misma validación que ya existía para el código pegado: ninguna regla de asistencia cambió. Un mismo código no se vuelve a validar durante 4 segundos. La cámara se apaga al detener, al cambiar de método, al salir de la pantalla o si la asistencia deja de estar habilitada. Si no hay permiso, cámara o soporte, la pantalla avisa y sigue funcionando pegando el código.

**Motivo:** la decodificación ocurre en el dispositivo: ninguna imagen se envía a la API ni a un tercero, y no suma costo de servidor ni de Vercel. El QR de la credencial ya es estándar (ISO/IEC 18004) y codifica el id de la inscripción, así que no hizo falta tocar la credencial. Requiere HTTPS, que dev y prod ya tienen.
