#!/usr/bin/env node
/**
 * Run only the Next.js frontend.
 */
const path = require('path');
const { spawn } = require('child_process');
const log = require('./_logger');

const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');

log.banner();
log.step('Starting frontend only');

const child = spawn('npm', ['run', 'dev'], {
  cwd: FRONTEND,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' },
});

child.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGTERM'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
