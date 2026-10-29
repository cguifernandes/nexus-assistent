import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const ui = Schibsted_Grotesk({ variable: "--font-ui", subsets: ["latin"] });
const display = Newsreader({ variable: "--font-display", subsets: ["latin"], weight: ["400"] });
const data = IBM_Plex_Mono({ variable: "--font-data", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Nexo Assist",
  description: "O agent do service desk de TI da Nexo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${ui.variable} ${display.variable} ${data.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
