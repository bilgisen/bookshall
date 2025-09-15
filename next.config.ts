// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  
  // Disable static optimization for auth routes
  experimental: {
    serverComponentsExternalPackages: ['better-auth'],
  },
  
  // Exclude auth routes from static optimization
  pageExtensions: ['page.tsx', 'page.ts', 'page.jsx', 'page.js'],
  
  // Configure webpack to handle better-auth and path aliases
  webpack: (config, { isServer }) => {
    // Handle browser-specific configurations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Add aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      'better-auth': require.resolve('better-auth'),
      '@': __dirname,
    };
    
    return config;
  },

  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },

  eslint: {
    ignoreDuringBuilds: false, // Geliştirme sırasında ESLint hatalarını göster
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigin = isProd ? 'https://bookshall.com' : '*';

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Vary', value: 'Origin' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.bookshall.com' }],
        destination: 'https://bookshall.com/:path*',
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-3cfc29e59e5243f4917194e2466f5fa0.r2.dev" },
      { protocol: "https", hostname: "jdj14ctwppwprnqu.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "storage.bookshall.com" },
    ],
  },

  turbopack: {
    rules: {
      // Add any module rules that were previously in webpack
    },

    resolveAlias: {
      // Add any path aliases that were in webpack
      '@': __dirname,
    }
  }
};

export default nextConfig;