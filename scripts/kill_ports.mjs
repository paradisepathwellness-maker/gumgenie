import { execSync } from 'child_process';

const ports = process.argv.slice(2).map((p) => Number(p)).filter(Boolean);
if (ports.length === 0) {
  console.error('Usage: node scripts/kill_ports.mjs <port...>');
  process.exit(1);
}

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
}

function unique(arr) {
  return [...new Set(arr)];
}

function killPid(pid) {
  if (!pid || Number.isNaN(pid)) return;
  if (pid === process.pid) return;

  try {
    if (process.platform === 'win32') {
      run(`taskkill /PID ${pid} /F`);
    } else {
      run(`kill -9 ${pid}`);
    }
    console.log(`[kill_ports] Killed PID ${pid}`);
  } catch (e) {
    // ignore
  }
}

function pidsOnPortWin32(port) {
  const out = run('netstat -ano -p TCP');
  const lines = out.split(/\r?\n/);
  const pids = [];
  for (const line of lines) {
    // Example:
    // TCP    0.0.0.0:3110           0.0.0.0:0              LISTENING       12345
    const m = line.match(/^\s*TCP\s+[^:]+:(\d+)\s+[^\s]+\s+LISTENING\s+(\d+)\s*$/i);
    if (!m) continue;
    const p = Number(m[1]);
    const pid = Number(m[2]);
    if (p === port) pids.push(pid);
  }
  return unique(pids);
}

function pidsOnPortPosix(port) {
  try {
    const out = run(`lsof -ti :${port} || true`);
    return unique(out.split(/\r?\n/).map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)));
  } catch {
    return [];
  }
}

for (const port of ports) {
  let pids = [];
  try {
    pids = process.platform === 'win32' ? pidsOnPortWin32(port) : pidsOnPortPosix(port);
  } catch {
    pids = [];
  }

  if (pids.length === 0) {
    console.log(`[kill_ports] Port ${port}: free`);
    continue;
  }

  console.log(`[kill_ports] Port ${port}: killing PIDs ${pids.join(', ')}`);
  for (const pid of pids) killPid(pid);
}
