#!/usr/bin/env node
/**
 * Nuclear option: stop, remove volumes, force fresh start.
 *
 * Usage:
 *   npm run reset
 *   npm run reset -- --keep-data    (only restart, don't wipe DB)
 */
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const log = require('./_logger');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

const args = process.argv.slice(2);
const KEEP_DATA = args.includes('--keep-data');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

(async () => {
  log.banner();
  log.step('Reset development environment');

  if (!KEEP_DATA) {
    log.warning('This will DELETE the local database (Postgres volume).');
    log.warning('All users, watchlists, and AI reports will be lost.');
    console.log();
    const answer = await ask('Type "yes" to continue, anything else to cancel: ');
    if (answer !== 'yes') {
      log.info('Cancelled.');
      process.exit(0);
    }
  }

  // Stop containers
  log.info('Stopping Docker...');
  await new Promise((resolve) => {
    spawn('docker', ['compose', '-f', 'docker-compose.yml', 'down'], {
      cwd: BACKEND, stdio: 'inherit',
    }).on('exit', resolve);
  });

  if (!KEEP_DATA) {
    log.info('Removing Docker volumes...');
    await new Promise((resolve) => {
      spawn('docker', ['compose', '-f', 'docker-compose.yml', 'down', '-v'], {
        cwd: BACKEND, stdio: 'inherit',
      }).on('exit', resolve);
    });
  }

  console.log();
  log.success('Reset complete');
  log.info('Run `npm run dev` to start fresh.');
})();
