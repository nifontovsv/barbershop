import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Barbershop — Запишись к мастеру за минуту",
  description:
    "Онлайн-запись в барбершоп. Выберите мастера, удобное время и запишитесь за минуту.",
  openGraph: {
    title: "Barbershop — Запишись к мастеру за минуту",
    description:
      "Онлайн-запись в барбершоп. Выберите мастера, удобное время и запишитесь за минуту.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
