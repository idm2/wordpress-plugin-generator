export const runtime = 'nodejs' // Explicitly set runtime
// 
// import "@/styles/globals.css"
import '@/styles/globals.css'
import { Inter } from "next/font/google"
import type React from "react" // Import React

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "WordPress Plugin Generator",
  description: "Generate WordPress plugins using AI",
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

