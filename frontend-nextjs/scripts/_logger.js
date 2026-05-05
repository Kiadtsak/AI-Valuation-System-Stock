/**
 * Branded console output for the orchestrator.
 * Uses chalk if available, falls back to ANSI codes.
 */
const chalk = (() => {
  try {
    return require('chalk');
  } catch {
    // Fallback if chalk not installed yet
    const c = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;
    return {
      gold: c('33'), green: c('32'), red: c('31'), blue: c('34'),
      gray: c('90'), bold: c('1'), dim: c('2'), cyan: c('36'),
      magenta: c('35'),
    };
  }
})();

const C = {
  gold:   chalk.hex ? chalk.hex('#d4a574') : chalk.gold || ((s) => s),
  green:  chalk.green,
  red:    chalk.red,
  blue:   chalk.blue,
  cyan:   chalk.cyan,
  gray:   chalk.gray,
  dim:    chalk.dim,
  bold:   chalk.bold,
};

const ICONS = {
  info: 'ℹ',
  success: '✓',
  error: '✗',
  warning: '⚠',
  step: '▸',
  arrow: '→',
};

let stepCounter = 0;

function divider(label = '') {
  const w = process.stdout.columns || 80;
  if (label) {
    const pad = Math.max(2, Math.floor((w - label.length - 4) / 2));
    console.log(C.gray('─'.repeat(pad)) + ' ' + C.gold(C.bold(label)) + ' ' + C.gray('─'.repeat(pad)));
  } else {
    console.log(C.gray('─'.repeat(w)));
  }
}

function banner() {
  console.log();
  console.log(C.gold('  ╭─────────────────────────────────────────╮'));
  console.log(C.gold('  │                                         │'));
  console.log(C.gold('  │       ') + C.bold(C.gold('LUXE CAPITAL')) + C.gold('  ·  Dev Mode       │'));
  console.log(C.gold('  │                                         │'));
  console.log(C.gold('  ╰─────────────────────────────────────────╯'));
  console.log();
}

function step(label) {
  stepCounter += 1;
  const num = String(stepCounter).padStart(2, '0');
  console.log();
  console.log(C.gold(C.bold(`  ${num}  `)) + C.bold(label));
}

function info(msg) {
  console.log(C.cyan('     ' + ICONS.info) + '  ' + msg);
}

function success(msg) {
  console.log(C.green('     ' + ICONS.success) + '  ' + msg);
}

function error(msg) {
  console.log(C.red('     ' + ICONS.error) + '  ' + msg);
}

function warning(msg) {
  console.log(C.gold('     ' + ICONS.warning) + '  ' + msg);
}

function detail(msg) {
  console.log(C.gray('        ' + msg));
}

function ready({ backend, frontend, db, redis }) {
  console.log();
  divider('READY');
  console.log();
  if (frontend) console.log('  ' + C.gold('▸ Frontend ') + C.dim('→') + '  ' + C.bold(frontend));
  if (backend)  console.log('  ' + C.gold('▸ Backend  ') + C.dim('→') + '  ' + C.bold(backend) + C.dim('  (docs at ' + backend + '/docs)'));
  if (db)       console.log('  ' + C.gray('▸ Postgres ') + C.dim('→') + '  ' + C.dim(db));
  if (redis)    console.log('  ' + C.gray('▸ Redis    ') + C.dim('→') + '  ' + C.dim(redis));
  console.log();
  console.log(C.dim('  Press ') + C.bold('Ctrl+C') + C.dim(' to stop everything.'));
  console.log();
  divider();
  console.log();
}

function resetSteps() {
  stepCounter = 0;
}

module.exports = {
  banner,
  step,
  info,
  success,
  error,
  warning,
  detail,
  ready,
  divider,
  resetSteps,
  C,
  ICONS,
};
