import React from 'react';
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "InvoicePro | GST Billing & Inventory Management",
  description: "Professional GST billing, invoicing, and inventory management software. Create tax invoices, manage products, track expenses, and generate reports — all in your browser.",
  keywords: ["GST billing", "invoice", "inventory", "accounting", "India", "tax invoice", "InvoicePro"],
  authors: [{ name: "Tushar Jain", url: "mailto:jaint0910@gmail.com" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/LOGO.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
