import type { NextConfig } from 'next'

const isEsaDeploy = process.env.ESA_DEPLOY === 'true'

const nextConfig: NextConfig = {
  ...(isEsaDeploy ? { output: 'export' as const } : {}),
  transpilePackages: ['geist'],
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: isEsaDeploy,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sam-material-online-1302115363.file.myqcloud.com',
        port: '',
        pathname: '/**',
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
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
