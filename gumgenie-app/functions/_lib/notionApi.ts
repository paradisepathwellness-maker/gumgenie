const NOTION_VERSION = '2025-09-03';

export function richText(text: string) {
  return [{ type: 'text', text: { content: text } }];
}

export async function notionRequest<T>(params: {
  token: string;
  path: string;
  method: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
}): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const res = await fetch(`https://api.notion.com${params.path}`, {
    method: params.method,
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await res.text().catch(() => '');
  if (res.ok === false) return { ok: false, status: res.status, text };

  return { ok: true, data: JSON.parse(text) as T };
}

type CreatePageResponse = { id: string; url: string };

type CreateDatabaseResponse = { id: string; url: string };

export async function createPage(params: {
  token: string;
  parent: { type: 'workspace'; workspace: true } | { type: 'page_id'; page_id: string };
  title: string;
  // minimal rich-text page content (not blocks API; just title)
}): Promise<{ ok: true; id: string; url: string } | { ok: false; status: number; text: string }> {
  const res = await notionRequest<CreatePageResponse>({
    token: params.token,
    method: 'POST',
    path: '/v1/pages',
    body: {
      parent: params.parent,
      properties: {
        title: {
          title: richText(params.title),
        },
      },
    },
  });

  if (res.ok === false) return { ok: false, status: res.status, text: res.text };
  return { ok: true, id: res.data.id, url: res.data.url };
}

export async function createDatabase(params: {
  token: string;
  parentPageId: string;
  title: string;
  description?: string;
  properties: Record<string, unknown>;
}): Promise<{ ok: true; id: string; url: string } | { ok: false; status: number; text: string }> {
  // 2025-09-03: properties must be provided under initial_data_source
  const res = await notionRequest<CreateDatabaseResponse>({
    token: params.token,
    method: 'POST',
    path: '/v1/databases',
    body: {
      parent: { type: 'page_id', page_id: params.parentPageId },
      title: richText(params.title),
      description: params.description ? richText(params.description) : [],
      initial_data_source: {
        properties: params.properties,
      },
    },
  });

  if (res.ok === false) return { ok: false, status: res.status, text: res.text };
  return { ok: true, id: res.data.id, url: res.data.url };
}

// --- Blocks API (Phase 1) ----------------------------------------------------

type NotionBlock = {
  object?: 'block';
  type: string;
  // Allow any extra keys because Notion block objects are polymorphic.
  // We keep this dependency-free.
  [k: string]: unknown;
};

type AppendBlockChildrenResponse = {
  results: Array<{ id: string }>;
};

export function paragraphBlock(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: richText(text) },
  };
}

export function heading1Block(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'heading_1',
    heading_1: { rich_text: richText(text) },
  };
}

export function heading2Block(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: richText(text) },
  };
}

export function heading3Block(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: richText(text) },
  };
}

export function bulletedListItemBlock(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: richText(text) },
  };
}

export function dividerBlock(): NotionBlock {
  return {
    object: 'block',
    type: 'divider',
    divider: {},
  };
}

/**
 * Minimal markdown → Notion blocks converter.
 * Supports:
 * - # / ## / ### headings
 * - paragraphs
 * - '-' bullet list items
 *
 * Purposefully minimal for Phase 1 reliability.
 */
export function markdownToBlocks(markdown: string): NotionBlock[] {
  const lines = markdown
    .split(/\r?\n/)
    .map((l) => l.trimEnd());

  const blocks: NotionBlock[] = [];
  let paraBuf: string[] = [];

  const flushParagraph = () => {
    const text = paraBuf.join(' ').trim();
    paraBuf = [];
    if (text) blocks.push(paragraphBlock(text));
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push(heading3Block(line.slice(4).trim()));
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push(heading2Block(line.slice(3).trim()));
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      blocks.push(heading1Block(line.slice(2).trim()));
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      flushParagraph();
      blocks.push(bulletedListItemBlock(line.slice(2).trim()));
      continue;
    }

    // Otherwise: paragraph content (accumulate)
    paraBuf.push(line);
  }

  flushParagraph();
  return blocks;
}

export async function appendBlockChildren(params: {
  token: string;
  blockId: string;
  children: NotionBlock[];
}): Promise<{ ok: true; appendedCount: number } | { ok: false; status: number; text: string }> {
  if (!params.children.length) return { ok: true, appendedCount: 0 };

  const res = await notionRequest<AppendBlockChildrenResponse>({
    token: params.token,
    method: 'POST',
    path: `/v1/blocks/${encodeURIComponent(params.blockId)}/children`,
    body: {
      children: params.children,
    },
  });

  if (res.ok === false) return { ok: false, status: res.status, text: res.text };
  return { ok: true, appendedCount: Array.isArray(res.data?.results) ? res.data.results.length : 0 };
}
