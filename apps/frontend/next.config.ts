import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cafeteria-saas/types', '@cafeteria-saas/utils'],
};

export default nextConfig;
