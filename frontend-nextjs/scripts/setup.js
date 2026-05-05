#!/usr/bin/env node
/**
 * First-time setup wizard.
 * - Generates secrets
 * - Creates .env files from .env.example templates
 * - Optionally installs Python + Node dependencies
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const readline = require('readline');
const { spawn } = require('child_process');
const log = require('./_logger');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function genSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function copyEnvFile(srcPath, destPath, replacements = {}) {
  if (!fs.existsSync(srcPath)) {
    log.warning(`Template missing: ${path.relative(ROOT, srcPath)}`);
    return false;
  }
  if (fs.existsSync(destPath)) {
    log.info(`Already exists: ${path.relative(ROOT, destPath)} — skipping`);
    return false;
  }

  let content = fs.readFileSync(srcPath, 'utf-8');
  for (const [key, val] of Object.entries(replacements)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) {
      content = content.replace(re, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  }
  fs.writeFileSync(destPath, content);
  log.success(`Created: ${path.relative(ROOT, destPath)}`);
  return true;
}

function runShell(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed`))));
  });
}

(async () => {
  log.banner();
  log.step('First-time setup');

  // 1. Generate secrets
  const jwtSecret = genSecret(48);
  const internalKey = genSecret(32);

  log.success('Generated cryptographic secrets');

  // 2. Backend .env
  const backendEnvPath = path.join(BACKEND, '.env');
  copyEnvFile(
    path.join(BACKEND, '.env.example'),
    backendEnvPath,
    {
      JWT_SECRET: jwtSecret,
      INTERNAL_API_KEY: internalKey,
    }
  );

  // 3. Frontend .env.local
  const frontendEnvPath = path.join(FRONTEND, '.env.local');
  copyEnvFile(
    path.join(FRONTEND, '.env.example'),
    frontendEnvPath,
    {
      INTERNAL_API_KEY: internalKey,
      BACKEND_URL: 'http://127.0.0.1:8000',
    }
  );

  // 4. Optional: prompt for FMP API key
  console.log();
  const fmpKey = await ask('Enter your FMP API key (or press Enter to skip): ');
  if (fmpKey) {
    let beEnv = fs.readFileSync(backendEnvPath, 'utf-8');
    beEnv = beEnv.replace(/^FMP_API_KEY=.*$/m, `FMP_API_KEY=${fmpKey}`);
    fs.writeFileSync(backendEnvPath, beEnv);
    log.success('FMP API key saved');
  } else {
    log.warning('FMP_API_KEY not set — financials endpoints will fail until you add it');
  }

  // 5. Install root deps
  console.log();
  log.step('Installing controller dependencies');
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    await runShell('npm', ['install'], { cwd: ROOT });
  } else {
    log.info('Root node_modules already exists');
  }

  // 6. Done
  console.log();
  log.divider('SETUP COMPLETE');
  console.log();
  log.info('Next steps:');
  log.detail('1. Make sure Docker Desktop is running');
  log.detail('2. (Optional) Edit backend/.env to add OPENAI_API_KEY, STRIPE_*, etc.');
  log.detail('3. Run: ' + log.C.bold('npm run dev'));
  console.log();
})().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
