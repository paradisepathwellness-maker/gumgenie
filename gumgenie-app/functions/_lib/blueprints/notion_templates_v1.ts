export type NotionTemplateV1Blueprint = {
  templateName: string;
  startHereMarkdown: string;
  dashboardMarkdown: string;
  databases: Array<{
    key: string;
    title: string;
    properties: Record<string, unknown>;
  }>;
};

/**
 * Deterministic v1 blueprint.
 *
 * Phase 1 goal: remove “setup confusion” by providing extremely explicit onboarding.
 * DB links are injected at runtime via {{DB_LINKS}}.
 */
export type NotionTemplateV1Variant = 'standard' | 'premium';

export function notionTemplatesV1Blueprint(params: { supportUrl: string; variant?: NotionTemplateV1Variant }): NotionTemplateV1Blueprint {
  const { supportUrl } = params;
  const variant: NotionTemplateV1Variant = params.variant === 'premium' ? 'premium' : 'standard';

  const startHereStandard = `# Start Here

## 10-minute setup (do this in order)

- Step 1: Open **Dashboard** and write your Weekly Focus
- Step 2: Capture everything into **Tasks** → Status = Inbox
- Step 3: Create your first outcome in **Projects** (then link Tasks to it)
- Step 4: Save reusable notes into **Knowledge** (SOPs, lessons, resources)
- Step 5: Do a Weekly Review (Projects + Tasks + Content Calendar)

## Quick links

{{DB_LINKS}}

## FAQ

- Works on Notion Free? Yes.
- Can I customize? Yes — edit properties, views, and statuses.
- Updates? Yes — improvements will ship over time.

## Support

If you get stuck, visit: ${supportUrl}
`;

  const startHerePremium = `# Start Here

## 10-minute setup (do this in order)

- Step 1: Open **Dashboard** and write your Weekly Focus
- Step 2: Capture everything into **Tasks** → Status = Inbox
- Step 3: Create your first outcome in **Projects** (then link Tasks to it)
- Step 4: Save reusable notes into **Knowledge** (SOPs, lessons, resources)
- Step 5: Do a Weekly Review (Projects + Tasks + Content Calendar)

## Quick links

{{DB_LINKS}}

## Quick wins (first 15 minutes)

- Add 1 Project outcome and set a due date
- Capture 10 tasks into Inbox, then triage 3 into Next
- Create 1 Knowledge note you’ll reuse every week

## Troubleshooting

- If you feel lost: only use **Dashboard** + **Tasks** for 2 days
- If your inbox grows: schedule a 5-minute daily triage
- If you over-customize: stop and ship with the defaults first

## FAQ

- Works on Notion Free? Yes.
- Can I customize? Yes — edit properties, views, and statuses.
- Updates? Yes — improvements will ship over time.

## Support

If you get stuck, visit: ${supportUrl}
`;

  const dashboardStandard = `# Dashboard

Welcome to your command center.

## Today

- Set your Weekly Focus
- Triage Inbox → Next
- Do 1 meaningful task

## Quick links

{{DB_LINKS}}

## Weekly Review (15 minutes)

- Projects: close loops, set next milestones
- Tasks: clear Inbox, update priorities
- Content Calendar: schedule the next publish date
`;

  const dashboardPremium = `# Dashboard

Welcome to your command center.

## Today (3-step loop)

- Step 1: Set your Weekly Focus
- Step 2: Triage Inbox → Next
- Step 3: Do 1 meaningful task

## Quick links

{{DB_LINKS}}

## Weekly Review (15 minutes)

- Projects: close loops, set next milestones
- Tasks: clear Inbox, update priorities
- Content Calendar: schedule the next publish date

## Operating rules

- Capture fast, organize later
- One project = one outcome
- Review weekly, not constantly
`;

  return {
    templateName: 'GumGenie Notion System OS',

    // Keep markdown limited to headings, paragraphs, and bullet lists for reliable block conversion.
    startHereMarkdown: variant === 'premium' ? startHerePremium : startHereStandard,
    dashboardMarkdown: variant === 'premium' ? dashboardPremium : dashboardStandard,

    databases: [
      {
        key: 'tasks',
        title: 'Tasks',
        properties: {
          Name: { type: 'title', title: {} },
          Status: {
            type: 'status',
            status: {
              options: [
                { name: 'Inbox', color: 'gray' },
                { name: 'Next', color: 'blue' },
                { name: 'Doing', color: 'yellow' },
                { name: 'Done', color: 'green' },
                { name: 'Someday', color: 'purple' },
              ],
            },
          },
          Due: { type: 'date', date: {} },
          Priority: {
            type: 'select',
            select: { options: [{ name: 'Low' }, { name: 'Medium' }, { name: 'High' }] },
          },
          Area: {
            type: 'select',
            select: { options: [{ name: 'Business' }, { name: 'Personal' }] },
          },
        },
      },
      {
        key: 'projects',
        title: 'Projects',
        properties: {
          Name: { type: 'title', title: {} },
          Status: {
            type: 'status',
            status: { options: [{ name: 'Active' }, { name: 'Paused' }, { name: 'Complete' }] },
          },
          Start: { type: 'date', date: {} },
          Due: { type: 'date', date: {} },
          Notes: { type: 'rich_text', rich_text: {} },
        },
      },
      {
        key: 'knowledge',
        title: 'Knowledge',
        properties: {
          Name: { type: 'title', title: {} },
          Type: {
            type: 'select',
            select: { options: [{ name: 'Idea' }, { name: 'SOP' }, { name: 'Lesson' }, { name: 'Resource' }] },
          },
          Tags: {
            type: 'multi_select',
            multi_select: { options: [{ name: 'Marketing' }, { name: 'Ops' }, { name: 'Product' }] },
          },
          Source: { type: 'url', url: {} },
          Summary: { type: 'rich_text', rich_text: {} },
        },
      },
      {
        key: 'crm',
        title: 'CRM',
        properties: {
          Name: { type: 'title', title: {} },
          Stage: {
            type: 'select',
            select: { options: [{ name: 'Lead' }, { name: 'Contacted' }, { name: 'Follow-up' }, { name: 'Won' }, { name: 'Lost' }] },
          },
          Email: { type: 'email', email: {} },
          Website: { type: 'url', url: {} },
          'Next Action': { type: 'rich_text', rich_text: {} },
          'Next Action Date': { type: 'date', date: {} },
        },
      },
      {
        key: 'content',
        title: 'Content Calendar',
        properties: {
          Name: { type: 'title', title: {} },
          Status: {
            type: 'select',
            select: { options: [{ name: 'Idea' }, { name: 'Draft' }, { name: 'Scheduled' }, { name: 'Published' }] },
          },
          'Publish Date': { type: 'date', date: {} },
          Channel: { type: 'select', select: { options: [{ name: 'X' }, { name: 'Email' }, { name: 'Blog' }, { name: 'YouTube' }] } },
          Link: { type: 'url', url: {} },
        },
      },
    ],
  };
}
