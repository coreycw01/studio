import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '9000-firebase-studio-1782092587116.cluster-rbhjeem4mfgjwrkwwvustjr6em.cloudworkstations.dev',
    '6000-firebase-studio-1782092587116.cluster-rbhjeem4mfgjwrkwwvustjr6em.cloudworkstations.dev',
  ],

  turbopack: {
    root: __dirname,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;