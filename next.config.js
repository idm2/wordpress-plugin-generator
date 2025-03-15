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
  
  // Add webpack configuration to handle binary modules
  webpack: (config, { isServer }) => {
    // Handle binary modules
    if (isServer) {
      config.externals = [...config.externals, 'ssh2', 'cpu-features'];
    }

    // Add fallbacks for node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser')
    };

    return config;
  },
  swcMinify: true
};

module.exports = nextConfig;

