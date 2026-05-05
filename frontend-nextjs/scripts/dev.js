#!/usr/bin/env node
/**
 * Luxe Capital Dev Orchestrator.
 *
 * Single-command launcher: runs the full stack in sequence.
 *
 *   01  Pre-flight checks
 *   02  Start Postgres + Redis (Docker)            ← AUTO
 *   03  Run Alembic migrations                      ← AUTO every time
 *   04  Start backend + frontend (concurrently)    ← unified logs
 *
 * Usage:
 *   npm run dev
 *   npm run dev -- --no-infra       # skip Docker (if already running)
 *   npm run dev -- --skip-migrate   # skip migrations
 *   npm run dev -- --no-frontend    # backend only
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const log = require('./_logger');
const { preflight } = require('./preflight');
const { waitForPort, waitForHttp } = require('./_wait');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;
const POSTGRES_PORT = 5432;
const REDIS_PORT = 6379;

const args = process.argv.slice(2);
const SKIP_INFRA    = args.includes('--no-infra');
const SKIP_MIGRATE  = args.includes('--skip-migrate');
const SKIP_FRONTEND = args.includes('--no-frontend');

let mainConcurrently = null;       // concurrently process (returned by start())
let shuttingDown = false;

// ─── Helpers ─────────────────────────────────────────
function detectPython() {
  const venvPython = path.join(BACKEND, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;
  const venvWin = path.join(BACKEND, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) return venvWin;
  return 'python3';
}

function runSync(label, cmd, args, opts = {}) {
  log.detail(`${label}: ${cmd} ${args.join(' ')}`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      stdio: opts.silent ? 'pipe' : 'inherit',
      env: { ...process.env, ...(opts.env || {}) },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

// ─── Step 01: Pre-flight ─────────────────────────────
async function step01_preflight() {
  log.step('Pre-flight checks');
  const { errors } = preflight({ silent: true });
  if (errors.length > 0) {
    console.log();
    log.error(`Pre-flight failed: ${errors.join(', ')}`);
    log.detail('Run `npm run setup` to fix common issues');
    process.exit(1);
  }
  log.success('All checks passed');
}

// ─── Step 02: Infrastructure (Postgres + Redis) ──────
async function step02_infra() {
  if (SKIP_INFRA) {
    log.step('Step 02: Skipping infrastructure (--no-infra)');
    return;
  }

  log.step('Starting infrastructure (Postgres + Redis)');

  await runSync(
    'docker',
    'docker',
    ['compose', '-f', 'docker-compose.yml', 'up', '-d', 'postgres', 'redis'],
    { cwd: BACKEND, silent: true }
  );
  log.success('Docker compose up');

  log.info(`Waiting for Postgres on :${POSTGRES_PORT}...`);
  await waitForPort('127.0.0.1', POSTGRES_PORT, { timeoutMs: 30000 });
  log.success(`Postgres ready`);

  log.info(`Waiting for Redis on :${REDIS_PORT}...`);
  await waitForPort('127.0.0.1', REDIS_PORT, { timeoutMs: 15000 });
  log.success(`Redis ready`);
}

// ─── Python deps (auto-install on first run) ─────────
async function ensurePythonDeps() {
  const venvDir = path.join(BACKEND, '.venv');
  const venvPython = detectPython();

  if (!fs.existsSync(venvDir)) {
    log.info('Creating Python virtual environment...');
    await runSync('venv', 'python3', ['-m', 'venv', '.venv'], { cwd: BACKEND, silent: true });
    log.success('venv created');
  }

  // Check if dependencies installed
  try {
    execSync(`${venvPython} -c "import fastapi, alembic"`, { cwd: BACKEND, stdio: 'pipe' });
  } catch {
    log.info('Installing Python dependencies (this may take a minute)...');
    await runSync(
      'pip',
      venvPython,
      ['-m', 'pip', 'install', '-q', '--upgrade', 'pip'],
      { cwd: BACKEND, silent: true }
    );
    await runSync(
      'pip',
      venvPython,
      ['-m', 'pip', 'install', '-q', '-r', 'requirements.txt'],
      { cwd: BACKEND, silent: true }
    );
    log.success('Python deps installed');
  }
}

// ─── Step 03: Alembic migrations ─────────────────────
async function step03_migrate() {
  if (SKIP_MIGRATE) {
    log.step('Step 03: Skipping migrations (--skip-migrate)');
    return;
  }

  log.step('Running database migrations');
  const venvPython = detectPython();

  try {
    await runSync(
      'alembic',
      venvPython,
      ['-m', 'alembic', 'upgrade', 'head'],
      { cwd: BACKEND, silent: true }
    );
    log.success('Migrations up to date');
  } catch (e) {
    log.warning(`Alembic upgrade failed: ${e.message}`);
    log.detail('Backend will fall back to auto-create on startup');
  }
}

// ─── Frontend deps (auto-install on first run) ───────
async function ensureFrontendDeps() {
  const nm = path.join(FRONTEND, 'node_modules');
  if (!fs.existsSync(nm)) {
    log.info('Installing frontend dependencies...');
    await runSync('npm', 'npm', ['install'], { cwd: FRONTEND });
    log.success('Frontend deps installed');
  }
}

// ─── Step 04: Backend + Frontend (concurrently) ──────
function step04_runApps() {
  log.step(SKIP_FRONTEND ? 'Starting backend (FastAPI)' : 'Starting backend + frontend (concurrently)');

  const venvPython = detectPython();
  const concurrently = require('concurrently');

  const commands = [
    {
      name: 'backend',
      command: `"${venvPython}" -m uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT} --reload`,
      cwd: BACKEND,
      prefixColor: 'cyan',
    },
  ];

  if (!SKIP_FRONTEND) {
    commands.push({
      name: 'frontend',
      command: 'npm run dev',
      cwd: FRONTEND,
      prefixColor: 'magenta',
      env: { PORT: String(FRONTEND_PORT) },
    });
  }

  // Display banner showing where everything is BEFORE concurrently takes over
  setTimeout(() => {
    if (!shuttingDown) {
      log.ready({
        frontend: SKIP_FRONTEND ? null : `http://localhost:${FRONTEND_PORT}`,
        backend:  `http://localhost:${BACKEND_PORT}`,
        db:       `postgresql://luxe:luxepass@localhost:${POSTGRES_PORT}/luxe`,
        redis:    `redis://localhost:${REDIS_PORT}`,
      });
    }
  }, 100);

  // Launch via concurrently
  const { result, commands: runningCommands } = concurrently(commands, {
    prefix: '[{name}]',
    prefixColors: ['cyan', 'magenta'],
    timestampFormat: 'HH:mm:ss',
    killOthersOn: ['failure', 'success'],
    restartTries: 0,
  });

  mainConcurrently = runningCommands;

  result
    .then(() => {
      if (!shuttingDown) {
        log.info('All processes exited cleanly');
        process.exit(0);
      }
    })
    .catch((events) => {
      if (shuttingDown) return;
      const failed = events.find((e) => e && e.exitCode !== 0);
      if (failed) {
        log.error(`${failed.command.name} crashed with code ${failed.exitCode}`);
      }
      shutdown(1);
    });
}

// ─── Shutdown ─────────────────────────────────────────
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log();
  log.divider('SHUTTING DOWN');
  log.info('Stopping all processes...');

  if (mainConcurrently) {
    for (const c of mainConcurrently) {
      try {
        c.kill('SIGTERM');
      } catch {}
    }
  }

  setTimeout(() => process.exit(exitCode), 3000);
}

process.on('SIGINT',  () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (e) => {
  log.error('Uncaught exception: ' + e.message);
  if (process.env.DEBUG) console.error(e);
  shutdown(1);
});

// ─── Main ────────────────────────────────────────────
async function main() {
  log.banner();
  log.resetSteps();

  await step01_preflight();
  await step02_infra();
  await ensurePythonDeps();
  await step03_migrate();
  await ensureFrontendDeps();
  step04_runApps();
}

main().catch((err) => {
  console.log();
  log.error('Startup failed: ' + err.message);
  if (process.env.DEBUG) console.error(err);
  shutdown(1);
});
