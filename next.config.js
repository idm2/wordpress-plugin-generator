/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Set explicit port to avoid conflicts
  serverRuntimeConfig: {
    port: 3000
  },
  // Ensure consistent port usage in development
  env: {
    PORT: 3000
  }
};

module.exports = nextConfig;

