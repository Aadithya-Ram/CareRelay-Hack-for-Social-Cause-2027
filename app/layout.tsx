import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "./product.css";
import "./polish.css";
import "./admin.css";
import "./demo-providers.css";
import "./journey.css";

export const metadata: Metadata = {
  title: "CareRelay | Dialysis continuity coordination",
  description: "Turn disrupted dialysis appointments into confirmed treatment arrangements.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

