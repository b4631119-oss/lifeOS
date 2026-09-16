import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    // Google account avatars (`user.photoURL`) are the only remote images the
    // app renders, in the header and on the profile page. Anything else is
    // rejected by `photoURLOf`, which only accepts https URLs, and by Next,
    // which only optimizes hosts listed here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // The service worker must never be served from a cache, otherwise the
        // old worker keeps controlling the origin after a deploy. The explicit
        // content type keeps some hosts from guessing it wrong.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default withNextIntl(nextConfig);
