// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  experimental: {
    // Server Actions configuration
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // serverExternalPackages ayarı kaldırıldı
    // '@polar-sh/better-auth' gibi paketler için genellikle gerekli değildir
    // Gerekirse ve doğru paket adıyla tekrar değerlendirilir.
  },

  output: "standalone",

  // Webpack alias'ları kaldırıldı.
  // Next.js varsayılan modül çözümlemesinin çalışmasına izin verin.
  // Turbopack kullanılıyorsa webpack fonksiyonu zaten devre dışı.
  webpack: process.env.TURBOPACK ? undefined : (config, { isServer }) => {
    // Yalnızca gerekli olduğunda Webpack yapılandırmasını değiştirin.
    // 'fs', 'net', 'tls' gibi Node.js modüllerinin
    // istemci tarafında kullanımını engellemek için fallback'ler.
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...(config.resolve?.fallback ?? {}),
          fs: false,
          net: false,
          tls: false,
        },
      };
    }

    // 'better-auth' için özel alias kaldırıldı.
    // '@polar-sh/better-auth' doğrudan import edilmelidir.

    return config;
  },

  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },

  eslint: {
    ignoreDuringBuilds: false, // Genellikle false bırakmak iyi bir fikirdir
  },

  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // Allowed origin'deki fazladan boşluk kaldırıldı
    const allowedOrigin = isProd ? "https://bookshall.com" : "*";

    const commonHeaders = [
      { key: "Access-Control-Allow-Credentials", value: "true" },
      { key: "Access-Control-Allow-Origin", value: allowedOrigin },
      { key: "Vary", value: "Origin" },
      { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
      {
        key: "Access-Control-Allow-Headers",
        value:
          "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
      },
    ];

    return [
      { source: "/:path*", headers: commonHeaders },
      { source: "/api/:path*", headers: commonHeaders },
    ];
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.bookshall.com" }],
        // Destination'daki fazladan boşluk kaldırıldı
        destination: "https://bookshall.com/:path*",
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
};

export default nextConfig;