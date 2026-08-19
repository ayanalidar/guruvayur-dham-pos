import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/pos/sw-register";
import { PwaInstallPrompt } from "@/components/pos/pwa-install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Guruvayur Dham — POS",
  description: "Point of Sale system for Hotel Guruvayur Dham, Mathura. Room management, kitchen orders, and dual invoicing.",
  keywords: ["POS", "Hotel", "Guruvayur Dham", "Invoice", "Kitchen", "Rooms", "Mathura"],
  authors: [{ name: "GuardianX" }],
  manifest: "/manifest.json",
  applicationName: "GVD POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GVD POS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "Hotel Guruvayur Dham — POS",
    description: "Room management, kitchen orders, and dual invoicing for Hotel Guruvayur Dham, Mathura.",
    type: "website",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Hotel Guruvayur Dham" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hotel Guruvayur Dham — POS",
    description: "Room management, kitchen orders, and dual invoicing.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#B22222",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // allow zoom for accessibility
  viewportFit: "cover", // respect safe areas on notched devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
