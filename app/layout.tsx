import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mongomigrate.app"),
  title: "Mongo Migration Tool - Database Migration Made Easy",
  description:
    "Open-source tool to migrate data between MongoDB databases. Simply provide connection strings and transfer your collections seamlessly.",
  keywords: ["mongodb", "migration", "database", "transfer", "open-source"],
  openGraph: {
    title: "Mongo Migration Tool",
    description:
      "Migrate MongoDB databases in your browser—no scripts required.",
    type: "website",
    url: "https://mongomigrate.app",
    siteName: "mongomigrate.app",
    images: [
      {
        url: "/og_image.png",
        width: 1200,
        height: 630,
        alt: "mongomigrate.app — Migrate MongoDB databases in your browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mongo Migration Tool",
    description:
      "Migrate MongoDB databases in your browser—no scripts required.",
    images: ["/og_image.png"],
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
