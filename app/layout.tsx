import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEUS Fleet OS · End to end logistics",
  description: "Sistema integral de gestión de flota TEUS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
