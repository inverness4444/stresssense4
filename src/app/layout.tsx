import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = { variable: "" };
const geistMono = { variable: "" };

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
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: "if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{});}",
          }}
        />
      </body>
    </html>
  );
}
