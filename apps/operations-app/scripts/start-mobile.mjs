import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { networkInterfaces } from 'node:os';

const require = createRequire(import.meta.url);

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
const extraArgs = process.argv.slice(2);

console.log(`Starting DineFlow Operations for Expo Go at ${host}:8082`);
console.log('Keep this computer and phone on the same Wi-Fi network.');

const child = spawn(
  process.execPath,
  [expoCli, 'start', '--go', '--lan', '--clear', '--port', '8082', ...extraArgs],
  {
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: host,
    },
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
