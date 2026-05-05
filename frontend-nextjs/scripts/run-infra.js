#!/usr/bin/env node
/**
 * Start only Docker infrastructure (Postgres + Redis).
 */
const path = require('path');
const { spawn } = require('child_process');
const log = require('./_logger');
const { waitForPort } = require('./_wait');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

(async () => {
  log.banner();
  log.step('Starting Docker infrastructure');

  const docker = spawn(
    'docker',
    ['compose', '-f', 'docker-compose.yml', 'up', '-d', 'postgres', 'redis'],
    { cwd: BACKEND, stdio: 'inherit' }
  );

  await new Promise((resolve, reject) => {
    docker.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('docker compose failed'))));
  });

  log.info('Waiting for Postgres on :5432...');
  await waitForPort('127.0.0.1', 5432);
  log.success('Postgres ready');

  log.info('Waiting for Redis on :6379...');
  await waitForPort('127.0.0.1', 6379);
  log.success('Redis ready');

  console.log();
  log.success('Infrastructure ready. Run `npm run dev:backend` next.');
})().catch((e) => {
  log.error(e.message);
  process.exit(1);
});
