import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Sindh Incidents — Incident Analysis Dashboard",
  description:
    "Offline analytical registry and geospatial explorer for terrorism incidents in Sindh (2020–2026).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-200">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
