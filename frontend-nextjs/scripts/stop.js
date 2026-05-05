#!/usr/bin/env node
/**
 * Stop everything: Docker containers + any leftover processes.
 */
const path = require('path');
const { spawn, execSync } = require('child_process');
const log = require('./_logger');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

log.banner();
log.step('Stopping all services');

// Stop Docker
log.info('Stopping Docker containers...');
const docker = spawn('docker', ['compose', '-f', 'docker-compose.yml', 'down'], {
  cwd: BACKEND,
  stdio: 'inherit',
});

docker.on('exit', () => {
  // Kill any leftover uvicorn / next-server processes (best effort)
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      try {
        execSync("pkill -f 'uvicorn app.main:app' 2>/dev/null", { stdio: 'pipe' });
      } catch {}
      try {
        execSync("pkill -f 'next dev' 2>/dev/null", { stdio: 'pipe' });
      } catch {}
    }
  } catch {}

  log.success('All services stopped');
  process.exit(0);
});
