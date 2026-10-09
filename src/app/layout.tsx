import type { Metadata } from "next";
import "./globals.css";
import "./glass.css";
export const metadata: Metadata = {
  title: "ATLAS — Personal AI Academy",
  description:
    "Build the skills. Prove the work. A personal workspace for learning AI engineering.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
