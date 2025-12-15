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
  title: "StressSense | Stress pulse platform for modern teams",
  description:
    "StressSense helps HR and team leaders spot stress early with lightweight surveys, real-time dashboards, and anonymized feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-slate-900`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: "if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}",
          }}
        />
      </body>
    </html>
  );
}
