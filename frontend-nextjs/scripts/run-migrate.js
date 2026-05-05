#!/usr/bin/env node
/**
 * Run Alembic migrations standalone.
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

const args = process.argv.slice(2);
const action = args[0] || 'upgrade';

log.banner();

let cmd;
if (action === 'upgrade') {
  log.step('Running migrations: alembic upgrade head');
  cmd = ['-m', 'alembic', 'upgrade', 'head'];
} else if (action === 'downgrade') {
  log.step('Rolling back: alembic downgrade -1');
  cmd = ['-m', 'alembic', 'downgrade', '-1'];
} else if (action === 'revision') {
  const msg = args[1] || 'auto';
  log.step(`Generating revision: ${msg}`);
  cmd = ['-m', 'alembic', 'revision', '--autogenerate', '-m', msg];
} else if (action === 'current') {
  cmd = ['-m', 'alembic', 'current'];
} else {
  cmd = ['-m', 'alembic', ...args];
}

const child = spawn(detectPython(), cmd, { cwd: BACKEND, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code || 0));
