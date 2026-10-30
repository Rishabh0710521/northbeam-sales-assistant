import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const font = Instrument_Sans({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Northbeam sales assistant",
  description: "Inbound inquiries, qualification and meeting booking"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>{children}</body>
    </html>
  );
}
