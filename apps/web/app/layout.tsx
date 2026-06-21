import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seguro Viagem MVP",
  description: "Fundacao do MVP de cotacao automatizada de seguro viagem"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
