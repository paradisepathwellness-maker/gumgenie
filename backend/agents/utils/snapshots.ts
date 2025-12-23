import fs from 'node:fs/promises';
import path from 'node:path';
import type { TemplateCategory } from '../../../types';
import type { ResearchData } from '../definitions/schemas';

const SNAPSHOT_DIR = path.join('backend', 'data', 'snapshots');
const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { data: ResearchData; fetchedAt: number; filePath: string };
const cache = new Map<string, CacheEntry>();

export function snapshotPath(category: TemplateCategory) {
  return path.join(SNAPSHOT_DIR, `${category}.json`);
}

export async function loadSnapshot(category: TemplateCategory): Promise<{ snapshot: ResearchData | null; snapshotPath: string; fromCache: boolean }> {
  const p = snapshotPath(category);
  const key = category;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return { snapshot: cached.data, snapshotPath: cached.filePath, fromCache: true };

  try {
    const txt = await fs.readFile(p, 'utf8');
    const data = JSON.parse(txt) as ResearchData;
    cache.set(key, { data, fetchedAt: Date.now(), filePath: p });
    return { snapshot: data, snapshotPath: p, fromCache: false };
  } catch {
    return { snapshot: null, snapshotPath: p, fromCache: false };
  }
}

export async function saveSnapshot(category: TemplateCategory, snapshot: ResearchData): Promise<string> {
  const p = snapshotPath(category);
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  await fs.writeFile(p, JSON.stringify(snapshot, null, 2));
  cache.set(category, { data: snapshot, fetchedAt: Date.now(), filePath: p });
  return p;
}
