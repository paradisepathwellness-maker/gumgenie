import type { NotionDatabaseSpec, NotionPageSpec, NotionPropertySpec } from '../definitions/schemas';
import { generateNotionBlueprintDeterministic } from './notionBlueprint';
import { stdioCallTool } from '../../mcpStdioClient';

const MCP_SERVER_ID = 'gumgenie' as const;

type CreatedPage = { id: string; url: string; title?: string };
type CreatedDb = { id?: string; url?: string; title?: string };

function toMarkdown(blocks: NotionPageSpec['blocks']): string {
  if (!blocks?.length) return '';

  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === 'heading_1') out.push(`# ${String(b.text)}`);
    else if (b.type === 'heading_2') out.push(`## ${String(b.text)}`);
    else if (b.type === 'paragraph') out.push(String(b.text));
    else if (b.type === 'bullets') {
      const items = Array.isArray(b.text) ? b.text : [String(b.text)];
      for (const it of items) out.push(`- ${it}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

function buildDbProperties(props: NotionPropertySpec[]): Record<string, unknown> {
  // Minimal mapping for notion-create-database tool.
  // The MCP tool schema expects Notion API-style property definitions with explicit `type`.
  const out: Record<string, any> = {};

  for (const p of props) {
    if (p.type === 'title') {
      out[p.name] = { type: 'title', title: {} };
      continue;
    }

    if (p.type === 'rich_text') out[p.name] = { type: 'rich_text', rich_text: {} };
    else if (p.type === 'number') out[p.name] = { type: 'number', number: { format: p.format || 'number' } };
    else if (p.type === 'select') out[p.name] = { type: 'select', select: { options: p.options.map((o) => ({ name: o.name, color: o.color })) } };
    else if (p.type === 'multi_select') out[p.name] = { type: 'multi_select', multi_select: { options: p.options.map((o) => ({ name: o.name, color: o.color })) } };
    else if (p.type === 'status') out[p.name] = { type: 'status', status: { options: p.options.map((o) => ({ name: o.name, color: o.color })) } };
    else if (p.type === 'date') out[p.name] = { type: 'date', date: {} };
    else if (p.type === 'checkbox') out[p.name] = { type: 'checkbox', checkbox: {} };
    else if (p.type === 'url') out[p.name] = { type: 'url', url: {} };
    else if (p.type === 'email') out[p.name] = { type: 'email', email: {} };
    else if (p.type === 'phone_number') out[p.name] = { type: 'phone_number', phone_number: {} };
    else {
      // For v1 build: skip relation/rollup/formula until we confirm tool-specific supported shapes.
    }
  }

  // Ensure Name title property exists (Notion requirement)
  if (!out.Name) out.Name = { type: 'title', title: {} };

  return out;
}

async function createPage(parentPageId: string | null, title: string, markdown: string): Promise<CreatedPage> {
  const args: any = {
    pages: [
      {
        properties: { title },
        content: markdown,
      },
    ],
  };

  if (parentPageId) args.parent = { type: 'page_id', page_id: parentPageId };

  const res = await stdioCallTool(MCP_SERVER_ID as any, 'notion-create-pages', args);
  const raw = (res as any).content?.[0]?.text;
  const text = typeof raw === 'string' ? raw : String(raw ?? '{}');
  const parsed: any = JSON.parse(text);
  const page: any = parsed.pages?.[0];
  return { id: String(page.id), url: String(page.url), title: String(page.properties?.title || title) };
}

function richTextArray(text: string) {
  return [{ type: 'text', text: { content: text }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' } }];
}

async function createDatabase(parentPageId: string, db: NotionDatabaseSpec): Promise<CreatedDb> {
  const name = String(db.name || 'Database');
  const desc = db.description ? String(db.description) : '';

  const res = await stdioCallTool(MCP_SERVER_ID as any, 'notion-create-database', {
    parent: { type: 'page_id', page_id: parentPageId },
    title: richTextArray(name),
    description: desc ? richTextArray(desc) : [],
    properties: buildDbProperties(db.properties),
  });

  const raw = (res as any).content?.[0]?.text;
  const text = typeof raw === 'string' ? raw : String(raw ?? '');

  // Common Notion MCP response shape: text with <database url="{{https://www.notion.so/<id>}}">
  const urlMatch = text.match(/<database\s+url=\\"\{\{(https:\/\/www\.notion\.so\/[a-zA-Z0-9]+)\}\}\\"/);
  if (urlMatch?.[1]) {
    const url = urlMatch[1];
    const id = url.split('/').pop();
    return { id, url, title: db.name };
  }

  // Fallback: attempt JSON parse if server returns JSON.
  try {
    const parsed: any = JSON.parse(text || '{}');
    return {
      id: parsed?.database?.id || parsed?.id,
      url: parsed?.database?.url || parsed?.url,
      title: parsed?.database?.title || parsed?.title || db.name,
    };
  } catch {
    return { title: db.name };
  }

}

export async function buildNotionTemplateFromBlueprint(): Promise<{
  root: CreatedPage;
  pages: CreatedPage[];
  databases: Array<CreatedDb & { key: string; name: string }>;
  warnings: string[];
}> {
  const blueprint = generateNotionBlueprintDeterministic();
  const warnings: string[] = [];

  // 1) Root page
  const root = await createPage(null, blueprint.rootPage.title, toMarkdown(blueprint.rootPage.blocks));

  // 2) Databases under root
  const databases: Array<CreatedDb & { key: string; name: string }> = [];
  for (const db of blueprint.databases) {
    try {
      const created = await createDatabase(root.id, db);
      databases.push({ ...created, key: db.key, name: db.name });
    } catch (e: any) {
      warnings.push(`Failed to create database ${db.key}: ${e?.message || String(e)}`);
    }
  }

  // 3) Pages under root
  const pages: CreatedPage[] = [];
  for (const p of blueprint.pages) {
    try {
      const created = await createPage(root.id, p.title, toMarkdown(p.blocks));
      pages.push(created);
    } catch (e: any) {
      warnings.push(`Failed to create page ${p.key}: ${e?.message || String(e)}`);
    }
  }

  return { root, pages, databases, warnings };
}
