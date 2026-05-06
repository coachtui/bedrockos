import type { NextConfig } from "next";

const FIX_APP_URL = process.env.FIX_APP_URL ?? "";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  async headers() {
    if (!FIX_APP_URL) return [];
    return [
      {
        // Allow Fix's app to be framed by BedrockOS
        source: "/modules/fix",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src ${FIX_APP_URL} 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
