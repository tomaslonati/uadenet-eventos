"use client";

import { useSesion } from "@/lib/sesion";

import estilos from "./toast.module.css";

export function Toast() {
  const { toast } = useSesion();
  if (!toast) return null;
  return (
    <div className={estilos.toast} role="status" aria-live="polite">
      {toast}
    </div>
  );
}
