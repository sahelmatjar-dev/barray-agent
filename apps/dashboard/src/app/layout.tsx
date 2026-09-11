import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EL BARRAY RA — SITRAK Sourcing OS",
  description: "SITRAK China sourcing operations system for EL BARRAY RA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
