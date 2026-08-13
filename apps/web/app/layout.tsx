import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SesionProvider } from "@/lib/sesion";
import { Toast } from "@/components/ui/toast";

import "./globals.css";

export const metadata: Metadata = {
  title: "UADEnet · Eventos académicos",
  description: "Módulo Eventos Académicos — UADEnet",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SesionProvider>
          {children}
          <Toast />
        </SesionProvider>
      </body>
    </html>
  );
}
