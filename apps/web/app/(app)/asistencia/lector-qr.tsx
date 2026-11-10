"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

import { Boton } from "@/components/ui/boton";

import estilos from "./asistencia.module.css";

type Estado =
  | "inactiva"
  | "iniciando"
  | "activa"
  | "denegada"
  | "sin-camara"
  | "no-soportada";

/** Se decodifica a unos 8 cuadros por segundo: sobra para una credencial y cuida la batería del celular. */
const MS_ENTRE_LECTURAS = 120;
/** Se achica el cuadro antes de decodificar: un QR sigue legible y el costo baja con el cuadrado del ancho. */
const ANCHO_MAXIMO = 480;
/** La credencial queda frente a la cámara un rato: sin esto se dispararía la misma validación varias veces por segundo. */
const MS_MISMO_CODIGO = 4000;

const AVISOS: Partial<Record<Estado, string>> = {
  denegada:
    "No tenemos permiso para usar la cámara. Habilitalo desde el candado de la barra del navegador, o pegá el código abajo.",
  "sin-camara":
    "No encontramos una cámara disponible. Pegá el código de la credencial abajo.",
  "no-soportada":
    "Este navegador no permite usar la cámara en esta página. Pegá el código de la credencial abajo.",
};

/**
 * Lee el QR de la credencial con la cámara trasera. La cámara solo se prende
 * cuando quien opera lo pide (en iOS el permiso exige un gesto del usuario) y
 * se apaga al detener, al cambiar de método o al salir de la pantalla. Todo
 * pasa en el navegador: ninguna imagen sale del dispositivo.
 */
export function LectorQr({
  habilitado,
  onCodigo,
}: {
  habilitado: boolean;
  onCodigo: (codigo: string) => void;
}) {
  const [estado, setEstado] = useState<Estado>("inactiva");
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const alLeer = useRef(onCodigo);
  const ultimo = useRef<{ codigo: string; en: number } | null>(null);

  useEffect(() => {
    alLeer.current = onCodigo;
  }, [onCodigo]);

  const apagar = () => {
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
  };

  // La cámara no sobrevive a la pantalla.
  useEffect(() => apagar, []);

  // Si la asistencia deja de estar habilitada con la cámara prendida, se apaga.
  useEffect(() => {
    if (habilitado) return;
    apagar();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado((actual) => (actual === "activa" ? "inactiva" : actual));
  }, [habilitado]);

  useEffect(() => {
    if (estado !== "activa") return;
    const elVideo = video.current;
    const elCanvas = canvas.current;
    if (!elVideo || !elCanvas || !flujo.current) return;

    elVideo.srcObject = flujo.current;
    void elVideo.play().catch(() => undefined);

    let cuadro = 0;
    let anterior = 0;
    const leer = (ahora: number) => {
      cuadro = requestAnimationFrame(leer);
      if (ahora - anterior < MS_ENTRE_LECTURAS) return;
      anterior = ahora;
      if (elVideo.readyState < 2 || elVideo.videoWidth === 0) return;

      const escala = Math.min(1, ANCHO_MAXIMO / elVideo.videoWidth);
      const ancho = Math.round(elVideo.videoWidth * escala);
      const alto = Math.round(elVideo.videoHeight * escala);
      elCanvas.width = ancho;
      elCanvas.height = alto;
      const contexto = elCanvas.getContext("2d", { willReadFrequently: true });
      if (!contexto) return;
      contexto.drawImage(elVideo, 0, 0, ancho, alto);

      const lectura = jsQR(
        contexto.getImageData(0, 0, ancho, alto).data,
        ancho,
        alto,
        { inversionAttempts: "dontInvert" },
      );
      const codigo = lectura?.data.trim();
      if (!codigo) return;

      const previo = ultimo.current;
      if (previo && previo.codigo === codigo && ahora - previo.en < MS_MISMO_CODIGO) {
        return;
      }
      ultimo.current = { codigo, en: ahora };
      navigator.vibrate?.(60);
      alLeer.current(codigo);
    };
    cuadro = requestAnimationFrame(leer);

    return () => {
      cancelAnimationFrame(cuadro);
      elVideo.srcObject = null;
    };
  }, [estado]);

  const activar = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado("no-soportada");
      return;
    }
    setEstado("iniciando");
    try {
      flujo.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      ultimo.current = null;
      setEstado("activa");
    } catch (error) {
      const nombre = error instanceof DOMException ? error.name : "";
      setEstado(
        nombre === "NotAllowedError" || nombre === "SecurityError"
          ? "denegada"
          : "sin-camara",
      );
    }
  };

  const detener = () => {
    apagar();
    setEstado("inactiva");
  };

  const activa = estado === "activa";
  const aviso = AVISOS[estado];

  return (
    <>
      <div className={estilos.escanerWrapper}>
        <div
          className={`${estilos.escaner} ${activa ? estilos.escanerActivo : ""}`}
        >
          {activa ? (
            <video
              ref={video}
              className={estilos.escanerVideo}
              muted
              playsInline
              aria-label="Cámara para leer la credencial"
            />
          ) : null}
          <canvas ref={canvas} hidden />
          <div className={estilos.escanerMarco} aria-hidden />
          <div className={estilos.escanerLinea} aria-hidden />
        </div>
      </div>

      {activa ? (
        <Boton bloque onClick={detener}>
          Detener cámara
        </Boton>
      ) : (
        <Boton
          bloque
          disabled={!habilitado || estado === "iniciando"}
          onClick={() => void activar()}
        >
          {estado === "iniciando" ? "Abriendo la cámara…" : "Activar cámara"}
        </Boton>
      )}

      <p
        role="status"
        className={`${estilos.escanerAviso} ${aviso ? estilos.escanerAvisoError : ""}`}
      >
        {aviso ??
          (activa
            ? "Apuntá la cámara al QR de la credencial. Se valida solo."
            : "Escanear con la cámara o pegar el código abajo.")}
      </p>
    </>
  );
}
