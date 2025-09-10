import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  webpack: (config) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };
    return config;
  },
  typescript: {
    // Show TypeScript errors during development
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Production build'de ESLint hatalarını ignore etme (önerilmez)
    // ignoreDuringBuilds: true,
    
    // Veya sadece belirli kuralları devre dışı bırak
    // ignoreDuringBuilds: false,
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProd 
      ? ['https://bookshall.com', 'https://www.bookshall.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://bookshall.com', 'https://www.bookshall.com'];

    return [
      {
        // Apply these headers to all routes in your application
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: isProd ? 'https://bookshall.com' : '*',
          },
          {
            key: 'Vary',
            value: 'Origin',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
      // Handle preflight requests
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: isProd ? 'https://bookshall.com' : '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.bookshall.com',
          },
        ],
        destination: 'https://bookshall.com/:path*',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-3cfc29e59e5243f4917194e2466f5fa0.r2.dev",
      },
      {
        protocol: "https",
        hostname: "jdj14ctwppwprnqu.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "storage.bookshall.com",
      },
    ],
  },
};

export default nextConfig;
