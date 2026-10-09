import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { MuteButton } from "@/components/ui/MuteButton";
import { SettingsButton } from "@/components/ui/SettingsButton";
import "./globals.css";
import "./skins.css";
import "./themes.css";
import "./motion.css";
import { PREFS_BOOT } from "@/lib/prefsBoot";

const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "穿越 K 线",
  description: "回到 2007、2008、2015、2018、2020、2024 年，用真实行情玩 12 个月，结算出投资人格，再把这一年演奏成一段音乐。",
};

export const viewport: Viewport = { themeColor: "#eaf0f5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${jb.variable}`} data-skin="pan" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/smiley-subset.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* 阅读设置在首帧前生效：纸面主题不会先闪一下深色 */}
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <AppShell>
          <MuteButton />
          <SettingsButton />
          <div className="flex-1">{children}</div>
          <footer className="py-4 px-4 text-center text-xs text-sub border-t border-line">
            虚拟资金 · 历史数据不代表未来 · 不构成任何投资建议
          </footer>
        </AppShell>
      </body>
    </html>
  );
}
