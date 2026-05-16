import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import SocketProvider from "@/components/SocketProvider";
import Sidebar from "@/components/Sidebar";
import GridCopilot from "@/components/GridCopilot";
import AIQueryBar from "@/components/AIQueryBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const rajdhani = Rajdhani({ weight: ['400', '500', '600', '700'], subsets: ["latin"], variable: "--font-rajdhani" });

export const metadata: Metadata = {
  title: "TN-GridSense | Smart Grid Platform",
  description: "State-Scale Distributed Smart Pole Monitoring Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} ${rajdhani.variable}`}>
        <SocketProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-wrapper">
              <main className="main-content">
                {children}
              </main>
            </div>
          </div>
          <GridCopilot />
        </SocketProvider>
      </body>
    </html>
  );
}
