Temporary folder for Notion E2E smoke testing artifacts.

You can delete this folder manually after testing.

Suggested manual E2E flow (deployed or local):
1) GET /api/notion/status
2) If not connected: open /api/notion/oauth/start in browser → complete Notion OAuth → confirm status becomes connected
3) POST /api/generate with { templateType: "NOTION_TEMPLATES", variant: "standard" }
4) POST /api/generate with { templateType: "NOTION_TEMPLATES", variant: "premium" }
5) Verify in Notion UI: root page exists, Start Here + Dashboard pages exist, blocks inserted, DB links work.

Notes:
- Domain is required only insofar as you need a reachable base URL to hit the endpoints.
- If running locally, use the local dev URL.
