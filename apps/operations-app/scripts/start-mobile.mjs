import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../../..');
const backendDirectory = resolve(repositoryRoot, 'backend');

function isPrivateIpv4(address) {
  return address.startsWith('10.') ||
    address.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address);
}

function interfaceScore(name) {
  const normalized = name.toLowerCase();

  if (/vethernet|virtual|wsl|docker|hyper-v|vmware|virtualbox|loopback|vpn/.test(normalized)) {
    return -100;
  }
  if (/wi-?fi|wireless|wlan/.test(normalized)) return 100;
  if (/ethernet|^eth\d*$/.test(normalized)) return 80;
  return 10;
}

function findLanAddress() {
  const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter((entry) => entry.family === 'IPv4' && !entry.internal && isPrivateIpv4(entry.address))
      .map((entry) => ({ address: entry.address, name, score: interfaceScore(name) })),
  );

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0];
}

const selected = findLanAddress();
const host = process.env.DINEFLOW_DEV_HOST || selected?.address;

if (!host) {
  console.error('Could not find a LAN address. Set DINEFLOW_DEV_HOST to this computer\'s Wi-Fi IPv4 address.');
  process.exit(1);
}

const expoCli = require.resolve('expo/bin/cli');
const tsxCli = require.resolve('tsx/cli');
const extraArgs = process.argv.slice(2);
const backendEnv = dotenv.parse(readFileSync(resolve(backendDirectory, '.env')));
const backendPort = Number(backendEnv.PORT || 3000);

function portIsAvailable(port) {
  return new Promise((resolveAvailability) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolveAvailability(false));
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
      server.close(() => resolveAvailability(true));
    });
  });
}

function systemAvailablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen({ host: '0.0.0.0', port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Windows did not provide an available Expo port.'));
        return;
      }
      const port = address.port;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function findExpoPort(preferredPort) {
  if (await portIsAvailable(preferredPort)) return preferredPort;
  return systemAvailablePort();
}

async function backendIsRunning() {
  try {
    const response = await fetch(`http://${host}:${backendPort}/health`, {
      signal: AbortSignal.timeout(1_500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const preferredExpoPort = Number(process.env.DINEFLOW_EXPO_PORT || 8082);
const expoPort = await findExpoPort(preferredExpoPort);

console.log(`Starting DineFlow Operations for Expo Go at ${host}:${expoPort}`);
if (expoPort !== preferredExpoPort) {
  console.log(`Port ${preferredExpoPort} is already in use; selected available port ${expoPort}.`);
}
console.log('Keep this computer and phone on the same Wi-Fi network.');

let backend;
if (await backendIsRunning()) {
  console.log(`Using the DineFlow API already running at ${host}:${backendPort}`);
} else {
  console.log(`Starting the DineFlow API at ${host}:${backendPort}`);
  backend = spawn(process.execPath, [tsxCli, 'watch', 'src/server.ts'], {
    cwd: backendDirectory,
    env: process.env,
    stdio: 'inherit',
  });
}

const expo = spawn(
  process.execPath,
  [expoCli, 'start', '--go', '--lan', '--clear', '--port', String(expoPort), ...extraArgs],
  {
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: host,
    },
    stdio: 'inherit',
  },
);

let stopping = false;
function stop(code = 0, signal) {
  if (stopping) return;
  stopping = true;
  if (backend && !backend.killed) backend.kill();
  if (!expo.killed) expo.kill();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code);
}

expo.on('exit', (code, signal) => stop(code ?? 1, signal));
backend?.on('exit', (code, signal) => {
  if (!stopping) {
    console.error('The DineFlow API stopped. Expo is being stopped so the app cannot continue with broken CRUD requests.');
    stop(code ?? 1, signal);
  }
});
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
