import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // Trace files from the monorepo root so the pnpm-hoisted Prisma query engine
  // (.prisma/client/*.so.node) is copied into the serverless function bundle.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
