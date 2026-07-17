/**
 * Worker entrypoint. Consumes BullMQ queues and runs the automation + outbound
 * pipeline. Deployed as a persistent Node service (Railway/Render/Fly.io).
 */
import { createServer } from 'node:http';
import { Worker } from 'bullmq';
import { QUEUE_NAMES, assertEnv } from '@tavakoli/config';
import { connection } from './redis';
import { log } from './log';
import { processWebhookEvent } from './processors/webhook-event';
import { processOutboundMessage } from './processors/outbound-message';
import { runMaintenance } from './processors/maintenance';

// Fail fast on invalid configuration.
assertEnv();

const workers: Worker[] = [];

workers.push(
  new Worker(QUEUE_NAMES.webhookEvents, async (job) => processWebhookEvent(job.data), {
    connection,
    concurrency: 5,
  }),
);

workers.push(
  new Worker(
    QUEUE_NAMES.outboundMessages,
    async (job) => processOutboundMessage(job.data),
    // Per-account throttling: limit outbound send rate to be a good API citizen.
    { connection, concurrency: 3, limiter: { max: 10, duration: 1000 } },
  ),
);

workers.push(
  new Worker(QUEUE_NAMES.maintenance, async () => runMaintenance(), { connection, concurrency: 1 }),
);

for (const w of workers) {
  w.on('failed', (job, err) => {
    log.error('job failed', { queue: w.name, jobId: job?.id, attempts: job?.attemptsMade, error: err.message });
  });
  w.on('completed', (job) => {
    log.info('job completed', { queue: w.name, jobId: job.id });
  });
}

// Lightweight health endpoint for the hosting platform.
const port = Number(new URL(process.env.WORKER_URL ?? 'http://localhost:3001').port || 3001);
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
    return;
  }
  res.writeHead(404);
  res.end();
});
server.listen(port, () => log.info(`worker up`, { port, queues: Object.values(QUEUE_NAMES) }));

async function shutdown(): Promise<void> {
  log.info('shutting down worker');
  server.close();
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
