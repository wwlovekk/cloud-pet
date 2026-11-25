import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "撸撸猫",
  description: "轻轻摸摸猫。真实毛发、温柔呼噜，背面和正面都可以。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
