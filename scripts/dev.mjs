import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const cwd = process.cwd();
const children = new Map();
let shuttingDown = false;

const mainEntry = path.join(cwd, 'dist/main/main/main.js');
const preloadEntry = path.join(cwd, 'dist/main/main/preload.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = createServer();
    server.unref();

    server.once('error', () => {
      resolve(false);
    });

    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, maxAttempts = 30) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No available dev port found from ${startPort} to ${startPort + maxAttempts - 1}`);
}

function isServerReady(url) {
  return new Promise(resolve => {
    const request = fetch(url, { method: 'GET' })
      .then(() => resolve(true))
      .catch(() => resolve(false));

    Promise.resolve(request).catch(() => resolve(false));
  });
}

function killChild(child) {
  if (!child || child.killed) return;

  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }

  child.kill('SIGTERM');
}

function stopAll() {
  for (const child of children.values()) {
    killChild(child);
  }
}

function spawnManaged(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  });

  children.set(name, child);

  child.on('exit', code => {
    if (shuttingDown) return;

    shuttingDown = true;
    console.error(`[dev] ${name} exited with code ${code ?? 1}`);
    stopAll();
    process.exit(code ?? 1);
  });

  return child;
}

async function waitForDependencies(url, timeoutMs = 90_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const compiledReady = existsSync(mainEntry) && existsSync(preloadEntry);
    // eslint-disable-next-line no-await-in-loop
    const serverReady = await isServerReady(url);

    if (compiledReady && serverReady) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(500);
  }

  throw new Error(`Timed out waiting for dev dependencies. url=${url}`);
}

process.on('SIGINT', () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

async function main() {
  const preferredPort = Number.parseInt(process.env.DESKTOP_ASSISTANT_DEV_PORT ?? '5173', 10);
  const port = await findAvailablePort(preferredPort);
  const devUrl = `http://localhost:${port}`;

  if (port !== preferredPort) {
    console.log(`[dev] Port ${preferredPort} is occupied. Switched to ${port}.`);
  }

  console.log(`[dev] Renderer URL: ${devUrl}`);

  spawnManaged('main', 'npm', ['run', 'dev:main']);
  spawnManaged('renderer', 'npm', ['run', 'dev:renderer', '--', '--port', String(port), '--strictPort']);

  await waitForDependencies(devUrl);
  console.log('[dev] Main/preload build and renderer server are ready. Launching Electron...');

  spawnManaged('electron', 'npx', ['electron', '.'], {
    DESKTOP_ASSISTANT_DEV_URL: devUrl,
  });
}

main().catch(error => {
  shuttingDown = true;
  console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  stopAll();
  process.exit(1);
});
