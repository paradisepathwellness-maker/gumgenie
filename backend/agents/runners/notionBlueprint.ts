import { GoogleGenAI, Type } from '@google/genai';
import { TemplateCategory } from '../../../types';
import type { NotionTemplateBlueprint } from '../definitions/schemas';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export type NotionBlueprintMode = 'deterministic' | 'gemini';

export function generateNotionBlueprintDeterministic(): NotionTemplateBlueprint {
  return {
    templateName: 'Solopreneur OS (Notion)',
    category: TemplateCategory.NOTION_TEMPLATES,
    rootPage: {
      key: 'root',
      title: 'Solopreneur OS',
      iconEmoji: '🧠',
      blocks: [
        { type: 'heading_1', text: 'Solopreneur OS' },
        {
          type: 'paragraph',
          text: 'A minimalist, high-performance Notion workspace for solopreneurs. Use the Dashboard to run your week in one place.',
        },
      ],
    },
    pages: [
      {
        key: 'start-here',
        title: 'Start Here',
        iconEmoji: '✅',
        blocks: [
          { type: 'heading_1', text: 'Start Here' },
          {
            type: 'bullets',
            text: [
              'Step 1: Duplicate this template into your workspace.',
              'Step 2: Open Dashboard and set your Weekly Focus.',
              'Step 3: Capture tasks into Inbox, then triage daily.',
              'Step 4: Keep Projects updated weekly; review on Sunday.',
            ],
          },
        ],
      },
      {
        key: 'dashboard',
        title: 'Dashboard',
        iconEmoji: '📊',
        blocks: [
          { type: 'heading_1', text: 'Dashboard' },
          { type: 'paragraph', text: 'Your command center. Start here each day.' },
        ],
        embeds: [
          { databaseKey: 'tasks', viewName: 'Today' },
          { databaseKey: 'projects', viewName: 'Active Projects' },
          { databaseKey: 'crm', viewName: 'Pipeline' },
        ],
      },
    ],
    databases: [
      {
        key: 'tasks',
        name: 'Tasks',
        iconEmoji: '✅',
        description: 'Capture everything, then triage into Projects and Dates.',
        properties: [
          { name: 'Name', type: 'title' },
          {
            name: 'Status',
            type: 'status',
            options: [
              { name: 'Inbox', color: 'gray' },
              { name: 'Next', color: 'blue' },
              { name: 'Doing', color: 'yellow' },
              { name: 'Done', color: 'green' },
              { name: 'Someday', color: 'purple' },
            ],
          },
          { name: 'Due', type: 'date' },
          { name: 'Priority', type: 'select', options: [{ name: 'Low' }, { name: 'Medium' }, { name: 'High' }] },
          { name: 'Project', type: 'relation', targetDatabaseKey: 'projects', dualPropertyName: 'Tasks' },
          { name: 'Area', type: 'select', options: [{ name: 'Business' }, { name: 'Personal' }] },
          { name: 'Effort', type: 'number', format: 'number' },
        ],
        views: [
          { name: 'Today', type: 'list' },
          { name: 'Inbox', type: 'table' },
          { name: 'Board', type: 'board', groupBy: 'Status' },
          { name: 'Calendar', type: 'calendar' },
        ],
        seedRows: [
          { Name: 'Triage inbox tasks (10 min)', Status: 'Inbox' },
          { Name: 'Plan weekly focus', Status: 'Next' },
        ],
      },
      {
        key: 'projects',
        name: 'Projects',
        iconEmoji: '🗂️',
        description: 'Track outcomes, not just tasks.',
        properties: [
          { name: 'Name', type: 'title' },
          { name: 'Status', type: 'status', options: [{ name: 'Active' }, { name: 'Paused' }, { name: 'Complete' }] },
          { name: 'Area', type: 'select', options: [{ name: 'Business' }, { name: 'Personal' }] },
          { name: 'Start', type: 'date' },
          { name: 'Due', type: 'date' },
          { name: 'Notes', type: 'rich_text' },
        ],
        views: [
          { name: 'Active Projects', type: 'table' },
          { name: 'Board', type: 'board', groupBy: 'Status' },
          { name: 'Timeline', type: 'timeline' },
        ],
        seedRows: [{ Name: 'Launch Gumroad listing', Status: 'Active', Area: 'Business' }],
      },
      {
        key: 'notes',
        name: 'Knowledge',
        iconEmoji: '📝',
        description: 'Capture ideas, lessons, SOPs, and reusable knowledge.',
        properties: [
          { name: 'Name', type: 'title' },
          { name: 'Type', type: 'select', options: [{ name: 'Idea' }, { name: 'SOP' }, { name: 'Lesson' }, { name: 'Resource' }] },
          { name: 'Tags', type: 'multi_select', options: [{ name: 'Marketing' }, { name: 'Ops' }, { name: 'Product' }] },
          { name: 'Source', type: 'url' },
          { name: 'Summary', type: 'rich_text' },
        ],
        views: [{ name: 'All Notes', type: 'table' }, { name: 'Gallery', type: 'gallery' }],
      },
      {
        key: 'crm',
        name: 'CRM',
        iconEmoji: '🤝',
        description: 'Simple pipeline for leads, partners, and outreach.',
        properties: [
          { name: 'Name', type: 'title' },
          {
            name: 'Stage',
            type: 'select',
            options: [{ name: 'Lead' }, { name: 'Contacted' }, { name: 'Follow-up' }, { name: 'Won' }, { name: 'Lost' }],
          },
          { name: 'Email', type: 'email' },
          { name: 'Website', type: 'url' },
          { name: 'Next Action', type: 'rich_text' },
          { name: 'Next Action Date', type: 'date' },
        ],
        views: [{ name: 'Pipeline', type: 'board', groupBy: 'Stage' }, { name: 'Table', type: 'table' }],
      },
      {
        key: 'content',
        name: 'Content Calendar',
        iconEmoji: '📅',
        description: 'Plan and publish consistently without chaos.',
        properties: [
          { name: 'Name', type: 'title' },
          { name: 'Status', type: 'select', options: [{ name: 'Idea' }, { name: 'Draft' }, { name: 'Scheduled' }, { name: 'Published' }] },
          { name: 'Publish Date', type: 'date' },
          { name: 'Channel', type: 'select', options: [{ name: 'X' }, { name: 'Email' }, { name: 'Blog' }, { name: 'YouTube' }] },
          { name: 'Link', type: 'url' },
        ],
        views: [{ name: 'Calendar', type: 'calendar' }, { name: 'Board', type: 'board', groupBy: 'Status' }],
      },
    ],
    notes: ['Deterministic baseline blueprint. Suitable as a default/fallback if AI blueprint generation fails.'],
  };
}

function normalizeBlueprint(b: any): NotionTemplateBlueprint {
  const fallback = generateNotionBlueprintDeterministic();
  if (!b || typeof b !== 'object') return fallback;

  // Required fields
  if (typeof b.templateName !== 'string') b.templateName = fallback.templateName;
  b.category = TemplateCategory.NOTION_TEMPLATES;

  if (!b.rootPage || typeof b.rootPage !== 'object') b.rootPage = fallback.rootPage;
  if (typeof b.rootPage.key !== 'string') b.rootPage.key = 'root';
  if (typeof b.rootPage.title !== 'string') b.rootPage.title = fallback.rootPage.title;

  if (!Array.isArray(b.pages)) b.pages = fallback.pages;
  if (!Array.isArray(b.databases)) b.databases = fallback.databases;
  if (!Array.isArray(b.notes)) b.notes = [];

  return b as NotionTemplateBlueprint;
}

export async function generateNotionBlueprintFromGemini(params: {
  brief?: string;
}): Promise<NotionTemplateBlueprint> {
  const fallback = generateNotionBlueprintDeterministic();

  try {
    const apiKey = requireEnv('GEMINI_API_KEY');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are creating a Notion template blueprint for a Gumroad product.
Return ONLY valid JSON matching the schema.

Template: Solopreneur OS (NOTION_TEMPLATES)
Goal: minimalist, professional, high-performance dashboard for solopreneurs.

Rules:
- Use stable keys for databases/pages (kebab-case).
- Include: rootPage, pages[], databases[].
- Databases must include a title property called "Name".
- Keep views simple (table/board/calendar).
- Seed rows optional.

Context/Brief (optional): ${params.brief || ''}`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL_DEFAULT || 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            templateName: { type: Type.STRING },
            category: { type: Type.STRING },
            rootPage: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                title: { type: Type.STRING },
                iconEmoji: { type: Type.STRING },
                coverUrl: { type: Type.STRING },
              },
              required: ['key', 'title'],
            },
            pages: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            databases: { type: Type.ARRAY, items: { type: Type.OBJECT } },
            notes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['templateName', 'rootPage', 'pages', 'databases'],
        },
      },
    });

    const raw = JSON.parse(response.text);
    return normalizeBlueprint(raw);
  } catch {
    return fallback;
  }
}
