import fs from 'node:fs/promises';
import path from 'node:path';

export type TraceEvent = {
  ts: string;
  type: string;
  data?: unknown;
};

export type TraceFile = {
  traceId: string;
  createdAt: string;
  events: TraceEvent[];
};

function enabled() {
  return String(process.env.AGENT_TRACE_ENABLED || '').toLowerCase() === 'true';
}

function verbose() {
  return String(process.env.AGENT_TRACE_VERBOSE || '').toLowerCase() === 'true';
}

function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (key.includes('token') || key.includes('secret') || key.includes('api_key') || key.includes('authorization')) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

export class TraceLogger {
  private file: TraceFile;

  constructor(traceId: string) {
    this.file = { traceId, createdAt: new Date().toISOString(), events: [] };
  }

  add(type: string, data?: unknown) {
    if (!enabled()) return;
    const payload = verbose() ? redact(data) : undefined;
    this.file.events.push({ ts: new Date().toISOString(), type, data: payload });
  }

  async flush() {
    if (!enabled()) return;
    const dir = path.join('production-test', 'logs');
    await fs.mkdir(dir, { recursive: true });
    const outPath = path.join(dir, `${this.file.traceId}.json`);
    await fs.writeFile(outPath, JSON.stringify(this.file, null, 2));
  }
}

export function createTraceId() {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isTraceEnabled() {
  return enabled();
}
