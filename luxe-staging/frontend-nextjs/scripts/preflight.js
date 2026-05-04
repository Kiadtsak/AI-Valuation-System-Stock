/**
 * Pre-flight checks before starting the dev environment.
 * Verifies that all prerequisites are present.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const log = require('./_logger');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

function checkCommand(cmd, name) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    log.error(`${name} not found in PATH`);
    return false;
  }
}

function checkFile(filepath, name) {
  if (fs.existsSync(filepath)) return true;
  log.error(`Missing: ${name} (${path.relative(ROOT, filepath)})`);
  return false;
}

function checkEnvVars(envPath, required) {
  if (!fs.existsSync(envPath)) {
    log.error(`Missing .env at ${path.relative(ROOT, envPath)}`);
    return false;
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const missing = [];
  const placeholder = [];

  for (const key of required) {
    const m = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (!m) {
      missing.push(key);
    } else {
      const val = m[1].trim();
      if (
        !val ||
        val.startsWith('your_') ||
        val.startsWith('GENERATE_') ||
        val.startsWith('paste_') ||
        val.includes('change-me') ||
        val.includes('CHANGE_ME')
      ) {
        placeholder.push(key);
      }
    }
  }

  if (missing.length) {
    log.error(`Missing env vars in ${path.relative(ROOT, envPath)}: ${missing.join(', ')}`);
  }
  if (placeholder.length) {
    log.warning(`Placeholder values in ${path.relative(ROOT, envPath)}: ${placeholder.join(', ')}`);
  }
  return missing.length === 0;
}

function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function preflight({ silent = false } = {}) {
  if (!silent) {
    log.step('Pre-flight checks');
  }

  const errors = [];
  const warnings = [];

  // ─── Required commands ──────────────────────────────
  if (!checkCommand('node', 'Node.js')) errors.push('node');
  if (!checkCommand('npm', 'npm')) errors.push('npm');
  if (!checkCommand('python3', 'Python 3')) errors.push('python3');
  if (!checkCommand('docker', 'Docker')) errors.push('docker');

  // ─── Docker daemon running ──────────────────────────
  if (!isDockerRunning()) {
    log.error('Docker is installed but not running. Please start Docker Desktop.');
    errors.push('docker-running');
  } else {
    if (!silent) log.success('Docker daemon running');
  }

  // ─── Project structure ──────────────────────────────
  if (!checkFile(BACKEND, 'backend/ directory')) errors.push('backend-dir');
  if (!checkFile(FRONTEND, 'frontend/ directory')) errors.push('frontend-dir');
  if (!checkFile(path.join(BACKEND, 'docker-compose.yml'), 'docker-compose.yml')) errors.push('docker-compose');
  if (!checkFile(path.join(BACKEND, 'app/main.py'), 'app/main.py')) errors.push('main.py');
  if (!checkFile(path.join(FRONTEND, 'package.json'), 'frontend/package.json')) errors.push('fe-package');

  // ─── .env files ─────────────────────────────────────
  const backendEnv = path.join(BACKEND, '.env');
  const frontendEnv = path.join(FRONTEND, '.env.local');

  if (!fs.existsSync(backendEnv)) {
    log.error('backend/.env does not exist');
    log.detail('Run: npm run setup');
    errors.push('be-env');
  } else {
    const ok = checkEnvVars(backendEnv, [
      'FMP_API_KEY',
      'JWT_SECRET',
      'INTERNAL_API_KEY',
    ]);
    if (!ok) errors.push('be-env-incomplete');
  }

  if (!fs.existsSync(frontendEnv)) {
    log.warning('frontend/.env.local does not exist (will use defaults)');
    warnings.push('fe-env-missing');
  } else {
    checkEnvVars(frontendEnv, ['INTERNAL_API_KEY']);
  }

  // ─── Python venv ────────────────────────────────────
  const venvDir = path.join(BACKEND, '.venv');
  if (!fs.existsSync(venvDir)) {
    log.warning('backend/.venv not found — will create on next backend start');
    warnings.push('no-venv');
  } else {
    if (!silent) log.success('Python venv exists');
  }

  // ─── node_modules ───────────────────────────────────
  const rootNodeModules = path.join(ROOT, 'node_modules');
  const feNodeModules = path.join(FRONTEND, 'node_modules');

  if (!fs.existsSync(rootNodeModules)) {
    log.warning('Root node_modules missing — run `npm install` first');
    warnings.push('no-root-nm');
  }

  if (!fs.existsSync(feNodeModules)) {
    log.warning('frontend/node_modules missing — will install on next frontend start');
    warnings.push('no-fe-nm');
  } else {
    if (!silent) log.success('Frontend node_modules exists');
  }

  if (errors.length === 0 && !silent) {
    log.success(`All checks passed${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
  }

  return { errors, warnings };
}

if (require.main === module) {
  log.banner();
  const { errors } = preflight();
  if (errors.length) {
    console.log();
    log.error(`Pre-flight failed with ${errors.length} error(s).`);
    process.exit(1);
  }
  console.log();
  log.success('Ready to start dev environment.');
}

module.exports = { preflight };
