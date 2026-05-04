#!/usr/bin/env node
/**
 * Run only the FastAPI backend (no infra, no frontend).
 * Useful when Postgres/Redis are already running.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('./_logger');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

function detectPython() {
  const venvPython = path.join(BACKEND, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;
  const venvWin = path.join(BACKEND, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) return venvWin;
  return 'python3';
}

log.banner();
log.step('Starting backend only');

const child = spawn(
  detectPython(),
  ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
  { cwd: BACKEND, stdio: 'inherit' }
);

child.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGTERM'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
