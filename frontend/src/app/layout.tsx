import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kimyo Olami",
  description: "Kimyoni kurslar, videodarslar va amaliy materiallar orqali o‘rganing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
