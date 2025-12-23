import { verifyGumroadLicense } from '../_lib/gumroad';
import { getSessionIdFromRequest, getNotionToken, type KVNamespace } from '../_lib/session';
import { appendBlockChildren, createDatabase, createPage, markdownToBlocks } from '../_lib/notionApi';
import { notionTemplatesV1Blueprint } from '../_lib/blueprints/notion_templates_v1';

type Env = {
  GUMROAD_PRODUCT_PERMALINK?: string;
  GUMROAD_ACCESS_TOKEN?: string;
  GG_LICENSE_KV?: KVNamespace;
  GG_SESSION_KV?: KVNamespace;
};

import { newRunId, nowIso, jsonResponse, errEnvelope, okEnvelope } from '../_lib/provenance';

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  const runId = newRunId('generate');
  const startedAt = nowIso();

  const body = await request.json().catch(() => null);
  const licenseKey = body?.licenseKey ? String(body.licenseKey).trim() : '';
  const templateType = body?.templateType ? String(body.templateType).trim() : 'NOTION_TEMPLATES';
  const variant = body?.variant ? String(body.variant).trim() : 'standard';

  if (!licenseKey) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'missing_license_key' }), { status: 400 });
  }

  // Re-verify Gumroad key (trust server-side only)
  const v = await verifyGumroadLicense({
    licenseKey,
    productPermalink: env.GUMROAD_PRODUCT_PERMALINK,
    accessToken: env.GUMROAD_ACCESS_TOKEN,
  });

  if (v.valid === false) {
    const reason = v.reason;
    const status = reason === 'missing_env' ? 500 : reason === 'gumroad_error' ? 502 : 403;
    return jsonResponse(errEnvelope({ runId, startedAt, error: v.reason, message: v.message }), { status });
  }

  // Used-key check
  if (!env.GG_LICENSE_KV) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'missing_env', message: 'Missing KV binding: GG_LICENSE_KV' }), { status: 500 });
  }
  const used = await env.GG_LICENSE_KV.get(`used:${licenseKey}`);
  if (used) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'used' }), { status: 403 });
  }

  // Require Notion connected
  const sid = getSessionIdFromRequest(request);
  if (!sid) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'notion_not_connected', message: 'Missing session. Please connect Notion.' }), { status: 401 });
  }

  const notionToken = await getNotionToken({ GG_SESSION_KV: env.GG_SESSION_KV }, sid);
  if (!notionToken) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'notion_not_connected', message: 'Notion not connected. Complete OAuth first.' }), { status: 401 });
  }

  if (templateType !== 'NOTION_TEMPLATES') {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'not_implemented', message: `Template type not implemented yet: ${templateType}` }), { status: 501 });
  }

  const blueprint = notionTemplatesV1Blueprint({ supportUrl: 'https://www.agelessinsights.ca', variant: variant === 'premium' ? 'premium' : 'standard' });

  // Build report (partial-safe; only mark key used at the very end)
  const report: any = {
    templateType,
    variant,
    templateName: blueprint.templateName,
    root: null,
    pages: {},
    databases: {},
  };

  // 1) Root page (workspace parent)
  const root = await createPage({ token: notionToken, parent: { type: 'workspace', workspace: true }, title: blueprint.templateName });
  if (root.ok === false) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'notion_root_create_failed', message: `Notion returned ${root.status}`, details: root.text.slice(0, 500) }), { status: 502 });
  }
  report.root = root;

  // 2) Databases under root
  for (const db of blueprint.databases) {
    const created = await createDatabase({
      token: notionToken,
      parentPageId: root.id,
      title: db.title,
      description: '',
      properties: db.properties,
    });

    if (created.ok === false) {
      return jsonResponse(
        errEnvelope({
          runId,
          startedAt,
          error: 'notion_database_create_failed',
          message: `Failed creating database ${db.key} (${created.status})`,
          details: created.text.slice(0, 500),
        }),
        { status: 502 }
      );
    }

    report.databases[db.key] = created;
  }

  // 3) Pages under root (Start Here + Dashboard)
  const startHere = await createPage({ token: notionToken, parent: { type: 'page_id', page_id: root.id }, title: 'Start Here' });
  if (startHere.ok === false) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'notion_page_create_failed', message: `Start Here create failed (${startHere.status})`, details: startHere.text.slice(0, 500) }), { status: 502 });
  }
  report.pages.startHere = startHere;

  const dashboard = await createPage({ token: notionToken, parent: { type: 'page_id', page_id: root.id }, title: 'Dashboard' });
  if (dashboard.ok === false) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'notion_page_create_failed', message: `Dashboard create failed (${dashboard.status})`, details: dashboard.text.slice(0, 500) }), { status: 502 });
  }
  report.pages.dashboard = dashboard;

  // 4) Insert deterministic onboarding content via Blocks API
  const dbLinksMarkdown = blueprint.databases
    .map((db) => {
      const created = report.databases?.[db.key];
      const url = created?.url ? String(created.url) : '';
      return url ? `- ${db.title}: ${url}` : `- ${db.title}`;
    })
    .join('\n');

  const startHereMarkdown = blueprint.startHereMarkdown.replace('{{DB_LINKS}}', dbLinksMarkdown);
  const dashboardMarkdown = blueprint.dashboardMarkdown.replace('{{DB_LINKS}}', dbLinksMarkdown);

  const startHereAppend = await appendBlockChildren({ token: notionToken, blockId: startHere.id, children: markdownToBlocks(startHereMarkdown) });
  if (startHereAppend.ok === false) {
    return jsonResponse(
      errEnvelope({
        runId,
        startedAt,
        error: 'notion_blocks_append_failed',
        message: `Start Here block insert failed (${startHereAppend.status})`,
        details: startHereAppend.text.slice(0, 500),
      }),
      { status: 502 }
    );
  }
  report.pages.startHereBlocks = startHereAppend;

  const dashboardAppend = await appendBlockChildren({ token: notionToken, blockId: dashboard.id, children: markdownToBlocks(dashboardMarkdown) });
  if (dashboardAppend.ok === false) {
    return jsonResponse(
      errEnvelope({
        runId,
        startedAt,
        error: 'notion_blocks_append_failed',
        message: `Dashboard block insert failed (${dashboardAppend.status})`,
        details: dashboardAppend.text.slice(0, 500),
      }),
      { status: 502 }
    );
  }
  report.pages.dashboardBlocks = dashboardAppend;

  // Mark key used only after full success
  if (!env.GG_LICENSE_KV.put) {
    return jsonResponse(errEnvelope({ runId, startedAt, error: 'missing_env', message: 'GG_LICENSE_KV.put not available' }), { status: 500 });
  }

  await env.GG_LICENSE_KV.put(
    `used:${licenseKey}`,
    JSON.stringify({ usedAt: new Date().toISOString(), templateType, runId, rootUrl: root.url })
  );

  return jsonResponse(okEnvelope({ runId, startedAt, data: { report } }), { status: 200 });
}
