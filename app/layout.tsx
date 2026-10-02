import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qwen Image Editor Studio | Powered by Kaggle GPU",
  description: "Next-gen AI Image Editor with Civitai LoRA Integration and 5TB Google Drive Storage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
