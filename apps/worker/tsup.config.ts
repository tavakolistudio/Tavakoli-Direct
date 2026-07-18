import { defineConfig } from 'tsup';

/**
 * The workspace packages (@tavakoli/*) ship raw TypeScript — their package.json
 * `main` points at src/index.ts. Node cannot load those at runtime, so they must
 * be bundled into the worker output rather than left as external imports.
 *
 * Everything else stays external and is resolved from node_modules at runtime:
 * Prisma needs its generated client and native query engine on disk, and the
 * Redis/BullMQ packages gain nothing from bundling.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  noExternal: [/^@tavakoli\//],
  external: ['@prisma/client', '.prisma/client', 'bullmq', 'ioredis'],
});
