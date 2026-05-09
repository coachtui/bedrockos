import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s · BedrockOS",
    default:  "BedrockOS",
  },
  description: "The construction operating system — BedrockOS.",
  manifest: "/manifest.json",
  applicationName: "BedrockOS",
  appleWebApp: {
    capable: true,
    title: "BedrockOS",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#0B0B0D" },
    { media: "(prefers-color-scheme: light)", color: "#EDEDF2" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
