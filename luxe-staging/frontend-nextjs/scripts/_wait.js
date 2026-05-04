/**
 * Wait for a TCP port or HTTP endpoint to be ready.
 */
const net = require('net');
const http = require('http');
const https = require('https');

/** Wait for TCP port to accept connections */
function waitForPort(host, port, { timeoutMs = 30000, intervalMs = 500 } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const sock = new net.Socket();
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        try { sock.destroy(); } catch {}
      };
      sock.setTimeout(2000);
      sock.once('connect', () => {
        cleanup();
        resolve();
      });
      sock.once('error', () => {
        cleanup();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
      sock.once('timeout', () => {
        cleanup();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
      sock.connect(port, host);
    };
    tick();
  });
}

/** Wait for an HTTP endpoint to return 2xx */
function waitForHttp(url, { timeoutMs = 30000, intervalMs = 1000 } = {}) {
  const start = Date.now();
  const lib = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = lib.get(url, { timeout: 2000 }, (res) => {
        // Drain response
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
      req.on('timeout', () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
    };
    tick();
  });
}

module.exports = { waitForPort, waitForHttp };
