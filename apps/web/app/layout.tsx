import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rift",
  description: "A League of Legends performance analysis and coaching platform."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-night text-frost antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
