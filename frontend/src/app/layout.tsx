import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "INVEST AI",
  description: "Plataforma de inteligência e análise de investimentos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
          <Toaster position="top-right" toastOptions={{ style: { background: '#1f2937', color: '#fff' } }} />
        </ThemeProvider>
      </body>
    </html>
  );
}