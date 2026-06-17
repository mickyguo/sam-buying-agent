import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client'],
  outputFileTracingExcludes: {
    '*': [
      'node_modules/prisma/**',
      'node_modules/@prisma/engines/**',
      'node_modules/.prisma/client/libquery_engine-darwin*',
      'node_modules/@prisma/client/**/libquery_engine-darwin*',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, x-admin-password, x-cron-secret',
          },
        ],
      },
    ]
  },
}

export default nextConfig
