import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Keep webpack config for production build
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
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