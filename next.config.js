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
    // Only include binary modules in the server bundle
    if (!isServer) {
      // Don't bundle binary modules on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'ssh2': false,
        'cpu-features': false,
        'basic-ftp': false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        stream: false,
        path: false,
        os: false,
        crypto: false
      };
    }
    
    // Handle binary .node files
    config.module = {
      ...config.module,
      exprContextCritical: false,
      rules: [
        ...config.module.rules,
        {
          test: /\.node$/,
          loader: 'node-loader',
          exclude: /node_modules/,
        }
      ]
    };
    
    return config;
  },
  
  // Special handling for Vercel deployment
  output: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT === 'true' ? 'standalone' : undefined,
};

module.exports = nextConfig;

