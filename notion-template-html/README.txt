Notion Template Preview (Interactive HTML)

What this is
- A standalone, interactive HTML “Notion-like” preview of a NOTION_TEMPLATES structure (Start Here, Dashboard, and 5 databases).
- No external dependencies. No network calls.

How to open
Option A (simplest):
- Open `index.html` directly in your browser.

Option B (recommended): serve it locally
- From the repo root:
  - PowerShell:
    - `npx serve notion-template-html`
  - Then open the URL printed by `serve`.

How it’s used in the GumGenie UI
- The React app can embed this preview using an iframe with `srcDoc` so the interactive preview runs inside the app.
- This is intended as a *preview/demo* (not a replacement for the real Notion build via OAuth + Notion APIs).

Notes
- This preview is deterministic and safe to host anywhere.
- If you copy/edit this file, keep it self-contained so it can be imported as a raw string by Vite.
