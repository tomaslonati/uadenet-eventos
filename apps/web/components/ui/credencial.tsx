"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import estilos from "./credencial.module.css";

/**
 * Representación visual de la credencial digital con código QR real estándar (ISO/IEC 18004).
 * Codifica el identificador real de la inscripción y es escaneable por cualquier lector físico
 * o aplicación de cámara estándar.
 */
export function Credencial({
  codigo,
  tamano = "grande",
  semilla,
}: {
  codigo: string;
  tamano?: "grande" | "chica";
  semilla?: number;
}) {
  void semilla;
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelado = false;
    if (!codigo) return;

    const generar = async () => {
      try {
        const url = await QRCode.toDataURL(codigo, {
          margin: 1,
          width: tamano === "grande" ? 256 : 128,
          color: {
            dark: "#16171a",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });
        if (!cancelado) {
          setDataUrl(url);
        }
      } catch (err) {
        console.error("Error al generar código QR estándar:", err);
      }
    };

    void generar();
    return () => {
      cancelado = true;
    };
  }, [codigo, tamano]);

  return (
    <div
      className={`${estilos.contenedor} ${estilos[tamano]}`}
      role="img"
      aria-label={`Credencial digital ${codigo}`}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`Código QR ${codigo}`}
          className={estilos.imagenQr}
        />
      ) : (
        <div className={estilos.placeholder} />
      )}
    </div>
  );
}
