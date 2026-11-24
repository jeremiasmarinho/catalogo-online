import type { Metadata } from "next";
import { STORE_CONFIG } from "@/config/store";
import { inter, sora } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: STORE_CONFIG.name,
  description: STORE_CONFIG.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
