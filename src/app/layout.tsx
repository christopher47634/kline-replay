import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { MuteButton } from "@/components/ui/MuteButton";
import "./globals.css";

const noto = Noto_Sans_SC({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-noto", display: "swap", preload: false });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "穿越 K 线",
  description: "回到 2015 年，用真实行情玩 12 个月，结算出投资人格，再把这一年演奏成一段音乐。",
};

export const viewport: Viewport = { themeColor: "#07090D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${noto.variable} ${jb.variable}`}>
      <head>
        <link rel="preload" href="/fonts/smiley-subset.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh flex flex-col">
        <AppShell>
          <MuteButton />
          <div className="flex-1">{children}</div>
          <footer className="py-4 px-4 text-center text-xs text-sub border-t border-line">
            虚拟资金 · 历史数据不代表未来 · 不构成任何投资建议
          </footer>
        </AppShell>
      </body>
    </html>
  );
}
