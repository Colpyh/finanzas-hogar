import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/shared/components/theme-provider";
import { Suspense } from "react";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Finanzas Hogar",
    template: "%s | Finanzas Hogar",
  },
  description: "Control de gastos del hogar",
  // PWA standalone en iOS (agregada a inicio desde Safari): sin barra de URL
  appleWebApp: {
    capable: true,
    title: "Finanzas Hogar",
    statusBarStyle: "default",
  },
};

// OJO: definir `viewport` reemplaza los defaults de Next — sin width/initialScale
// explícitos, mobile renderiza a ancho desktop (980px) y la UI se desborda.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#16121f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <ThemeProvider>{children}</ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}
