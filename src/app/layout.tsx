import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WordPress Plugin Generator",
  description: "Generate WordPress plugins with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} custom-scrollbar`}>
        <ThemeProvider defaultTheme="light">
          <div className="min-h-screen bg-gray-2 dark:bg-boxdark-2">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

