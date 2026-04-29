import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avestra — IA Jurídica para Advogados | Dr. Wladmir Bonadio Filho",
  description: "Hub de IA especializada para advogados brasileiros. Pesquise jurisprudência, redija petições e contratos com inteligência artificial treinada para o Direito Brasileiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
