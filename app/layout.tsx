import "./globals.css";
import type { Metadata } from "next";
// 魔法のWebフォントをインポート
import { Inter, Noto_Sans_JP } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-noto-sans-jp' });

export const metadata: Metadata = {
  title: "Athenetic",
  description: "Hypertrophy Tracker based on Sports Science",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // HTMLタグにフォントの変数を注入します
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body className="font-sans antialiased text-[#1D1D1F] bg-[#F5F5F7]">
        {children}
      </body>
    </html>
  );
}