import type { Metadata, Viewport } from "next";
import { Sora, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Tipografia "Cívico Moderno":
   - Sora (display geométrica) carrega a personalidade dos títulos e cifras-herói.
   - Inter (sans neutra) faz o trabalho de leitura na interface.
   - IBM Plex Mono dá o ar de demonstrativo financeiro às colunas de números. */
const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pradópolis · Secretaria de Finanças",
    template: "%s · Pradópolis Finanças",
  },
  description:
    "Painel de finanças públicas da Prefeitura de Pradópolis — acompanhamento de arrecadação, despesas, orçamento e planejamento.",
  applicationName: "Pradópolis Finanças",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EBEEF1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
