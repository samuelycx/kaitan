import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const display = Noto_Serif_SC({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

const ui = Noto_Sans_SC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "开摊",
  description: "每天开门的经营点：当日报名占位，不报没有摊",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${display.variable} ${ui.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
