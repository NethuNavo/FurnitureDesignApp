import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FurniVision",
  description: "FurniVision interior design app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
