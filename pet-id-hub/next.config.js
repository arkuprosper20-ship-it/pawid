/** @type {import('next').NextConfig} */

// Vercel injects VERCEL_URL (server-only, no protocol, e.g. "my-app-git-x.vercel.app")
// automatically on every deployment — production and preview alike. We use it as a
// fallback so preview deployments get a correct QR/redirect URL without needing a
// manually-set NEXT_PUBLIC_SITE_URL per deploy. An explicit NEXT_PUBLIC_SITE_URL
// (e.g. your custom production domain) always wins when set.
const derivedSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_SITE_URL: derivedSiteUrl,
  },
};

module.exports = nextConfig;
