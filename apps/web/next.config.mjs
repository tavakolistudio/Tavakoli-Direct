/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript source and transpiled here.
  transpilePackages: [
    '@tavakoli/config',
    '@tavakoli/core',
    '@tavakoli/database',
    '@tavakoli/integrations',
    '@tavakoli/ui',
  ],
  // Keep native/node-only deps external to the server bundle (Next 15 key name).
  serverExternalPackages: ['@prisma/client', '@node-rs/argon2', 'bullmq', 'ioredis'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
