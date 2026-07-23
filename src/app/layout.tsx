import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { OnboardingOverlay } from "@/components/OnboardingOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OTT Finder — 내 구독으로 가장 싸게 보는 법",
  description:
    "콘텐츠를 검색하면 내가 구독 중인 OTT로 바로 볼 수 있는지, 아니면 가장 싸게 보는 방법을 알려줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/80 backdrop-blur-md dark:border-gray-800/70 dark:bg-gray-950/80">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-xs font-bold text-white">
                O
              </span>
              OTT Finder
            </Link>
            <Link
              href="/settings"
              className="rounded-full px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              설정
            </Link>
          </nav>
        </header>
        {children}
        <OnboardingOverlay />
      </body>
    </html>
  );
}
