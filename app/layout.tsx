import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facility Assessment Snapshot | INFINITE — Managed by MEDELITE",
  description:
    "Generate a polished CMS nursing-home Facility Assessment Snapshot from a CCN.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
