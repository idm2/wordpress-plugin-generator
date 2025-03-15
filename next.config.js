/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove hardcoded port to allow dynamic port assignment
  serverRuntimeConfig: {
    // Let Next.js handle port assignment
  },
  // Remove hardcoded port in env
  env: {
    // PORT will be assigned by Next.js
  },
  // Ensure API routes are properly registered
  experimental: {
    appDir: true,
  },
  // Add rewrites for WordPress API routes
  async rewrites() {
    return [
      {
        source: '/api/wordpress/:path*',
        destination: '/api/wordpress/:path*',
      },
    ];
  },
  // Add assetPrefix to ensure assets are loaded from the correct URL
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
};

module.exports = nextConfig;

