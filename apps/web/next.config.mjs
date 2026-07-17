import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@node-rs/argon2', 'bullmq', 'ioredis'],
  // Trace files from the monorepo root so pnpm-hoisted native deps resolve.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Copy the Prisma query engine (.so.node) into the server bundle. The official
  // monorepo plugin is the reliable fix for the "engine-not-found" error on Vercel.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
