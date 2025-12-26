# AGENTS.md

> **⚠️ Integration Rule (Official Docs First):** Before implementing or debugging any integration (OAuth, MCP servers, third-party APIs), **always consult the official vendor documentation first** and record the canonical source link(s) in your notes/PR. This repo has already hit issues caused by assuming auth/token behavior.
> 
> **Canonical Notion MCP docs (official):**
> - Overview: https://developers.notion.com/docs/mcp
> - Connecting: https://developers.notion.com/docs/get-started-with-mcp
> - Supported tools: https://developers.notion.com/docs/mcp-supported-tools

> **✅ Change Protocol (lint → typecheck → test → confirm):** After **every** file modification or system configuration change, run:
> 1) `npm run lint`
> 2) `npm run typecheck`
> 3) `npm test` (not yet configured — **must be added later**, see session todo)
> 4) Confirm results explicitly in the session log/output.

> **🌐 Hosting Plan (current):**
> - **Application:** https://www.gumgenie.com
> - **Product hosting/domain:** https://www.agelessinsights.ca
> 
> Keep activation links, QR codes, and docs aligned to this plan.

> **🎯 Product principle (quality-first UX):**
> - Prioritize **outcome quality** (results + consistency + publish-ready deliverables) over convenience.
> - Then streamline the UX to reduce friction (activation, connect, generate) as a second-order optimization.
> - Protocols must be grounded in **real market/API data** when available (see Session Log notes).
>
> **⚡ PowerShell-first execution (workflow efficiency):** Always run commands in **PowerShell** whenever possible (including `curl.exe`, `Invoke-RestMethod`, `wrangler`, etc.). If a command cannot be run due to tool limitations, environment constraints, or required permissions/interactive steps, explicitly state **why** and provide the **direct workaround** to run it (to avoid workflow thrash).


## Project overview

## Agent Squad Architecture (V2.3) — “The Squad & The Researcher”

### Executive Summary
- **Goal:** Replace monolithic generation with a **resilient multi-agent architecture**.
- **Mode A (Researcher / Apify Agent):** asynchronous market intelligence pipeline that scrapes Gumroad (Apify actors) and writes **static snapshots**.
- **Mode B (Daily Swarm / Squad):** real-time **parallel agent swarm** that generates Gumroad-ready product listings using snapshots as ground truth.
- **Key upgrade in V2.3:** add a lightweight **Orchestrator Agent** to enforce coherence across the swarm and reduce contradictions.

### Agents (all agents should read this AGENTS.md)
These are the canonical agent roles used across the codebase and by collaborating agents:

1) **Orchestrator Agent** (Director)
- **Purpose:** Creates a single **Unified Brief** (persona, voice, constraints, success criteria) shared by all agents.
- **Output:** `brief: { persona, usp, constraints, mustInclude, vibe }`

2) **Strategist Agent** (`marketAgent`)
- **Purpose:** Positioning, target audience avatar, SEO keywords, competitive gap.
- **Inputs:** `category` + `ResearchData` (if available) + `brief`
- **Outputs:** `strategy: { targetAudience, corePainPoint, mechanismName, uniqueSellingProp, seoKeywords }`

3) **Monetization Agent** (`monetizationAgent`)
- **Purpose:** 3-tier pricing, bonuses, guarantee.
- **Inputs:** `category` + `strategy` + `ResearchData.stats`
- **Outputs:** `monetization: { tiers[3], bonuses[2], guaranteePolicy }`

4) **Copy Agent** (`copyAgent`)
- **Purpose:** High-conversion Gumroad copy (PAS), features, FAQs, CTA.
- **Inputs:** `category` + `strategy.seoKeywords` + `brief`
- **Outputs:** `content: { productTitle, hookHeadline, descriptionMarkdown, features[], faq[], callToAction }`

5) **Visual Agent** (`visualAgent`)
- **Purpose:** Style preset + emoji set + canvas settings + MCP component recommendations.
- **Inputs:** `category` + `brief.vibe`
- **Outputs:** `visuals: { stylePreset, emojiSet, canvasSettings, recommendedMcpComponents }`

6) **Researcher Agent** (`apifyAgent`)
- **Purpose:** Deep market truth via Apify (search → detail → reviews) + Gemini summarization.
- **Trigger:** manual or scheduled
- **Outputs:** `backend/data/snapshots/<category>.json` (ResearchData)

### Rovo Dev Subagent Profiles (/1–/8) — Source of Truth
In addition to the “Agent Squad (V2.3)” above, the repo maintains a set of **router-style subagent profiles** under `.rovodev/subagents/`.

These are intended for deterministic orchestration and strict JSON contracts:
- `/1` Master Orchestrator → `.rovodev/subagents/agent1.md`
  - Fan-out allowed (exclusive).
  - If fan-out occurred, output is a **single raw JSON envelope**:
    - `{ orchestrator_id, timestamp (ISO8601), status, execution_plan[], final_deterministic_output }`
  - Tools allowed (exact): `functions.open_files`, `functions.expand_code_chunks`, `functions.grep`, `functions.expand_folder`, `functions.find_and_replace_code`, `functions.create_file`, `functions.delete_file`, `functions.move_file`, `functions.powershell`, `multi_tool_use.parallel`

- `/2` Unified Brief Director → `.rovodev/subagents/agent2.md`
  - **Strict JSON only** (no markdown fences, no filler).
  - Produces the “Unified Brief v1.0” JSON schema.
  - Determinism: output MUST include a top-level `assumptions: string[]` array (empty if none); missing details must be inferred conservatively and recorded in `assumptions`.
  - If input is empty/nonsensical, may add top-level `error`.

- `/3` Direct Response Copywriter → `.rovodev/subagents/agent3.md`
  - **Strict raw JSON only**: `{ headline, subheadline, body_copy, call_to_action, objection_handler, microcopy }`
  - No fan-out; no fabricated proof.

- `/4` Frontend Section Spec Architect → `.rovodev/subagents/agent4.md`
  - **Strict JSON only** section spec schema with tooling allowlist.
  - Tooling allowlist (exact): `functions.open_files`, `functions.expand_code_chunks`, `functions.grep`, `functions.expand_folder`, `functions.find_and_replace_code`, `functions.create_file`, `functions.delete_file`, `functions.move_file`, `functions.powershell`
  - Determinism: stable `section_id` derivation (kebab-case); default responsive breakpoint rules; tool arguments must match real tool schemas or use `{}` with an explicit note.
  - Handoff compatibility:
    - outputs `section_id` AND `sectionId` (alias) to align with /5.

- `/5` MCP Execution Planner → `.rovodev/subagents/agent5.md`
  - Produces a **linear** execution plan (no fan-out): `callMcp|format|insert|fallback`
  - Determinism: defaults to stdio transport (`/api/mcp-stdio/*`), one tool call per step, and `callMcp` must be followed by `format|insert` consuming the prior text output; otherwise fallback.
  - References backend endpoints (for /1 to execute):
    - `GET /api/mcp-stdio/servers`
    - `POST /api/mcp-stdio/tools`
    - `POST /api/mcp-stdio/call`
    - `POST /api/ai/format-mcp-output`
  - Handoff compatibility:
    - `steps[].sectionId` matches input `section_id` OR `sectionId`.

- `/6` Visual Stylist → `.rovodev/subagents/agent6.md`
  - **Strict raw JSON only** style system output: `{ styled, style, notes, enforced }`
  - Determinism: fixed effect selection rules (none default; keyword-gated dither/lightrays); fixed `heroDitherIntensity`; limited palette `{bg,text,primary}`.
  - Enforces WCAG-oriented contrast checks + progressive enhancement.

- `/7` QA Reviewer → `.rovodev/subagents/agent7.md`
  - **Strict raw JSON only** detailed QA schema: `{ qa: { score (0–100), breakdown (0–25×4), notes, risks, quickFixes, quickFixApplied } }`

- `/8` Publisher → `.rovodev/subagents/agent8.md`
  - **Strict raw JSON only** publish-readiness manifest:
    - `{ deliverablePreview, filesGenerated, links[], publishingChecklist, warnings }`
  - `links[].url` is **nullable** when not explicitly available.

### Daily workflow (Mode B): “Specialist Swarm”
- Run on every user “Generate” click.
- Flow:
  1) Load snapshot (if exists) and cache in-memory.
  2) Orchestrator generates `UnifiedBrief`.
  3) Run 4 agents in parallel via `Promise.allSettled`.
  4) Merge JSON partials into master Product.
  5) Enforce deterministic quality gate + contradiction checks.
  6) Return a valid Product **100% of the time** (fallbacks for failed agents).

### Periodic workflow (Mode A): “Market Validator / Researcher”
- Run manually or on schedule.
- Flow:
  1) Cache check (TTL; default 24h).
  2) Apify scrape (Gumroad actors: search → detail → reviews).
  3) Sanitize/dedupe.
  4) Gemini summarization into `ResearchData`.
  5) Save `backend/data/snapshots/<category>.json`.

### Resilience requirements
- Use **`Promise.allSettled`** for the swarm.
- Each agent has:
  - strict JSON schema validation
  - retry once
  - safe default fallback output
- Runtime schema enforcement (backend + frontend):
  - Backend validates `/api/chat/orchestrate` recommendations against the live tool catalog and retries once; deterministic fallback on repeated failure.
  - Backend enforces minimal top-level schema keys in `dailySwarm.runJson` (purpose→required top-level key).
  - Frontend defensively validates orchestrate responses before rendering/using formatted blocks.
- Merge should record provenance metadata:
  - agent versions, fallback flags, timing

### Proposed backend structure (V2.3)
```
backend/
  agents/
    definitions/
      prompts.ts
      schemas.ts
    runners/
      dailySwarm.ts
      apifyAgent.ts
    utils/
      merger.ts
      snapshots.ts
  routes/
    agentRoutes.ts
  data/
    snapshots/
```

### API contracts (V2.3)
- `POST /api/agents/generate`
  - Body: `{ category: "NOTION_TEMPLATES" | ... }`
  - Response: `{ product: Product, preset: StylePreset, meta?: {...} }`

- `POST /api/agents/research`
  - Body: `{ category: "NOTION_TEMPLATES" | ..., force?: boolean }`
  - Response: `{ status: "updated" | "cached", snapshotPath: string, snapshot: ResearchData }`

- `POST /api/agents/orchestrate`
  - Purpose: Server-side “/1” orchestration runner that executes /2–/8 prompts via Gemini with strict JSON validation, retry-once, and deterministic fallbacks.
  - Body: `{ message: string, context?: object, mode?: "fast" | "full" }`
    - `mode="fast"`:
      - Runs /2, /3, /4, /6 in parallel
      - Skips /5, /7, /8 (marked as skipped in `execution_plan`)
      - Intended for quick smoke tests / dev iteration
    - `mode="full"`:
      - Runs /2, /3, /4, /6 in parallel
      - Runs /5 sequentially after /4 (depends on `sectionId`)
      - Runs /7 and /8 sequentially
  - Response: `/1 envelope`:
    - `{ orchestrator_id: "/1", timestamp: string(ISO8601), status: "success"|"partial_success"|"failure", execution_plan: [...], final_deterministic_output: {...} }`
  - Timeouts:
    - Uses bounded per-call timeouts and a global time budget; on timeout returns `partial_success` with fallbacks.

### Implementation checklist (V2.3)
1) Finalize V2.3 architecture decisions (Orchestrator + optional final consistency pass)
2) Define Orchestrator prompt + strict JSON schema (Unified Brief)
3) Define 4 Squad prompts + strict JSON schemas (Strategist/Monetization/Copy/Visual)
4) Expand ResearchData schema (delivery expectations, differentiation gaps, citations)
5) Implement backend agent folder structure
6) Implement Apify Agent runner (TTL → scrape → sanitize → summarize → save)
7) Implement snapshot loader + in-memory cache
8) Implement Daily Swarm (`Promise.allSettled` + retry + fallback + merge)
9) Implement deterministic quality gate + contradiction checks
10) Implement merger utility + provenance metadata
11) Add backend routes (`/api/agents/generate`, `/api/agents/research`, optional snapshot status)
12) Wire frontend store to `/api/agents/generate`
13) Update Sidebar UI (Generate + Market Data badge + Refresh)
14) Update chat/dashboard docs if needed
15) Update AGENTS.md runbook for V2.3 (this section)
16) Verify research pipeline (snapshot saved/loaded; TTL/force)
17) Verify daily swarm (<8s target; 100% valid Product; citations used)
18) Regression check (UI flows; build/lint)

## Project overview
- **App name:** GumGenie Pro AI – Advanced Architect (see `metadata.json`)
- **Purpose:** Generate high-converting Gumroad-style digital product listings + visual style presets using **Google Gemini**.
- **Frontend:** React + TypeScript powered by **Vite**.
- **State management:** Zustand (`store.ts`).
- **UI:** Tailwind CSS loaded via CDN in `index.html` (no Tailwind build pipeline).
- **Backend (optional / mock):** Express + Prisma in `backend/`.

## Tech stack
- **Language:** TypeScript
- **Frontend framework:** React (`react`, `react-dom`)
- **Build tooling:** Vite (`vite.config.ts`)
- **Linting:** ESLint (`.eslintrc.json`)
- **AI SDK:** `@google/genai` (`services/geminiService.ts`)
- **Backend libs:** `express`, `cors`, `@prisma/client`

## Repo layout (important files & directories)
- `index.html` — Vite entry HTML, Tailwind CDN, fonts, global styles, importmap.
- `index.tsx` — React root mount.
- `App.tsx` — Main page layout and the “generate” orchestration (logs + product generation).
- `types.ts` — Shared domain types (`Product`, `StylePreset`, `TemplateCategory`, etc.).
- `store.ts` — Zustand store + actions (generation, customization, content blocks, publishing mocks).
- `components/` — UI components:
  - `Sidebar.tsx` — Control panel (category selection, customization, integrations, publishing).
  - `ProductPreview.tsx` — Main product preview / editable content display.
  - `TemplateGrid.tsx` — Category selection.
  - `TerminalWindow.tsx` — Log view.
  - `DynamicIcon.tsx` — Maps emojis/names to `lucide-react` icons.
- `services/geminiService.ts` — Gemini prompts + response schema parsing.
- `backend/` — Optional server side:
  - `server.ts` — Express routes (mock simulation + mock Gumroad publish proxy).
  - `schema.prisma` — Prisma schema (currently empty/placeholder).

## Getting started
- **Prereqs:** Node.js (see `README.md`).
- Install deps:
  - `npm install`
- Create local env file:
  - Set `GEMINI_API_KEY` in `.env.local`
- Run frontend dev server:
  - `npm run dev`
- Build / preview:
  - `npm run build`
  - `npm run preview`
- Lint:
  - `npm run lint`
  - `npm run lint:fix`

## Environment variables
- `.env.local`
  - `GEMINI_API_KEY` — Google Gemini API key.

**How the key is wired today**
- `vite.config.ts` injects the key at build/dev time as:
  - `process.env.API_KEY`
  - `process.env.GEMINI_API_KEY`
- `services/geminiService.ts` uses `process.env.API_KEY`.

> Security note: this repo currently calls Gemini from the browser, which means the API key is exposed to clients. If you need to harden this, move Gemini calls to `backend/` (or a serverless function) and proxy requests.

## Development conventions observed
- **Type-first:** shared types live in `types.ts`; components and store import from there.
- **Path alias:** `@/*` maps to repo root (configured in `tsconfig.json` + `vite.config.ts`).
- **State updates:** prefer `useStore()` actions (e.g., `setProduct`, `applyPreset`, `addLog`) instead of mutating objects directly.
- **IDs:** ephemeral IDs are generated via `Math.random().toString(36)...` for UI-only entities (logs/content blocks).
- **Styling:** Tailwind utility classes directly in JSX; no CSS modules in repo.

### Visual Test Harness (tmp_rovodev_*)
For rapid UX iteration and customer-style visual review, we sometimes generate **single-section** test artifacts as standalone HTML files.

Rules:
- File naming: MUST use `tmp_rovodev_` prefix.
- Scope: one section per file (e.g., pricing-only), with multiple variants toggled via buttons/hash.
- Dependencies: prefer Tailwind CDN only (no build).
- Hygiene: these files are **temporary** and should be deleted after review.

Examples:
- `tmp_rovodev_pricing_variants.html` — pricing section with multiple visual/animation variants.
- `tmp_rovodev_hero_variants.html` — hero section with lighting/motion variants.
- `tmp_rovodev_background_shader_variants.html` — faux-shader background variants (Canvas + gradients).
- `tmp_rovodev_chat_component_variants.html` — docked chat UI variants.
- `tmp_rovodev_testimonial_variants.html` — testimonial layout variants.

### 3D / Shader Components (Three.js)
For in-app 3D/shader-style hero backgrounds, we keep components under `components/ui/` and follow these safety rules:
- Dependency: `three` (installed via npm).
- Must render as a background layer: `position: absolute; inset: 0; pointer-events: none`.
- Must pause animation when the tab is hidden (`document.visibilitychange`) to reduce CPU/GPU usage.
- Must clean up WebGL resources on unmount (`dispose()` geometry/material/renderer).
- Texture prototyping: you may use a real Unsplash URL (known to exist) as a low-opacity overlay during development.

Current example:
- `components/ui/mountain-scene.tsx` — `GenerativeMountainScene` (Three.js shader plane + mouse light).

## AI prompting / response handling
- `generateProductContent(category)` uses Gemini with a **JSON response schema** (via `responseMimeType: "application/json"` and `responseSchema`).
- Keep the output aligned with `types.ts`:
  - `Product` requires `title`, `description`, `price`, `features`, `callToAction`, `emojiSet`, `extraComponents`.
  - `StylePreset` requires the set of fields listed in `types.ts`.
- If you change the schema/prompt:
  - Update both `types.ts` and the `responseSchema` in `services/geminiService.ts`.
  - Ensure the UI (`Sidebar`, `ProductPreview`) still renders new/changed fields.

## Backend notes (Express)
- Backend lives in `backend/` and runs separately from Vite.
- **Default ports:**
  - Frontend (Vite): `http://localhost:3110`
  - Backend (Express): `http://localhost:4000`
- Run backend:
  - `npm run backend:dev`
  - Or run both: `npm run dev:full`

### One-command dev workflow
- `npm run dev:full` starts:
  - frontend (Vite) on `http://localhost:3110`
  - backend (Express) on `http://localhost:4000`
- It runs a preflight that kills any processes holding ports `3110` and `4000` (see `scripts/kill_ports.mjs`).

**Dev port hygiene**
- `npm run dev:full` runs a preflight that kills any processes listening on ports `3110` and `4000` to avoid "port already in use" errors on Windows.
- Manual fallback (Windows):
  - `netstat -ano | findstr :3110`
  - `taskkill /PID <pid> /F`

### Environment variables (backend)
- See `.env.example` for the full list.
- Backend loads `.env.local` automatically via `dotenv`.

### CORS / dev connectivity
- In internal dev mode, the backend CORS middleware allows **any** `http(s)://<host>:3110` origin (to support `localhost` + LAN IP URLs printed by Vite).
- If you hit `TypeError: Failed to fetch` in the browser, make sure:
  - frontend is running on port **3110**
  - backend is running on **4000**
  - you are visiting a URL that ends with `:3110` (Local or Network)
- For production hardening later, replace this with a strict allowlist.

  - On Windows/PowerShell, you can still set env vars in the session before running backend if needed.

**Expected env var keys (no values):**
- `PORT`
- `FRONTEND_URL`
- `GEMINI_API_KEY`
- `GUMROAD_CLIENT_ID`
- `GUMROAD_CLIENT_SECRET`
- `GUMROAD_REDIRECT_URI`
- `GUMROAD_ACCESS_TOKEN` (optional)
- `PEXELS_API_KEY` (optional; server-side only)
- `PIXABAY_API_KEY` (optional; server-side only)
- `MAGIC_API_KEY` (required for `@21st-dev/magic` MCP)
- `MCP_UNFRAMER_SSE_URL` (required for Unframer SSE MCP)

**Quick verification (PowerShell):**
- Backend reachable:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/mcp-stdio/servers" | ConvertTo-Json -Depth 5`
- Stock image proxy (server-side only; uses API keys from `.env.local`):
  - `GET /api/stock-image?provider=pexels|pixabay&query=<text>`
  - Official docs:
    - Pexels: https://www.pexels.com/api/documentation/
    - Pixabay: https://pixabay.com/api/docs/
  - Example (PowerShell):
    - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/stock-image?provider=pexels&query=mountains" | ConvertTo-Json -Depth 5`
- Gumroad auth status:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/gumroad/status" | ConvertTo-Json`
- MCP stdio tool listing (example):
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-stdio/tools" -ContentType "application/json" -Body '{"serverId":"magicui"}' | ConvertTo-Json -Depth 10`
  - If tool listing fails, the API may return `diagnostics.stderrTail` (last ~12 stderr lines) to help identify missing env vars or `npx`/network issues.

**Known working stdio servers** (internal dev)
- `shadcn` — registry browsing/install helpers (React Bits compatible)
- `magicui` — Magic UI component library tools (e.g., backgrounds, buttons, components)
- `magic` — 21st.dev Magic tools (component builder/refiner)

### AI formatting helpers (MCP → Canvas)
- `POST /api/ai/format-mcp-output` converts raw MCP output text into a structured `ContentBlock` (pricing, FAQ, feature grid, etc.).
  - Used by the Library “MCP Component Preview” flow to create usable blocks instead of inserting raw code.

### Reliability & Performance (production-ready)
- **Hard timeouts** (to avoid multi-minute hangs):
  - AI formatting (`POST /api/ai/format-mcp-output`) has a **20s hard timeout**.
  - MCP stdio tool calls (`POST /api/mcp-stdio/call`) support per-call **`timeoutMs`** (forwarded to the underlying stdio tool call).
- **Retry logic**:
  - AI formatting retries **once** (small backoff) for transient failures.
- **Fallback blocks**:
  - If AI formatting fails or times out, we immediately return a safe fallback block so Preview/Insert never dead-ends.
  - Pricing fallback: a usable **3-tier pricing block** (rendered via the existing canvas pricing section) under a feature-grid.
- **Progress logs**:
  - Workflow progress is streamed into the Terminal feed (step-by-step), including formatting start, warnings on failures, and "preview ready" success messages.
- **Quality standards**:
  - **100-point quality rubric** established (4 dimensions × 25 points each).
  - **80+ point threshold** required for launch-ready products.
  - All template categories transformed to premium positioning (average 77→88 quality score).
- **Performance monitoring**:
  - Comprehensive audit plan with latency targets, caching strategies.
  - Web Vitals tracking: <2s LCP, <100ms FID, <0.1 CLS targets.
  - API response targets: <6s generation, <20s AI formatting, <30s MCP calls.

### Gumroad OAuth + publishing (real)
- OAuth endpoints:
  - `GET /api/gumroad/oauth/start` — redirects to Gumroad authorize
  - `GET /api/gumroad/oauth/callback` — exchanges code for token then redirects back to `FRONTEND_URL`
  - `GET /api/gumroad/status` — returns `{ connected: boolean }`
  - `POST /api/gumroad/products` — creates a real Gumroad product
- Required env vars (see `.env.example`):
  - `GUMROAD_CLIENT_ID`
  - `GUMROAD_CLIENT_SECRET`
  - `GUMROAD_REDIRECT_URI` (recommended local: `http://localhost:4000/api/gumroad/oauth/callback`)
  - `FRONTEND_URL` (recommended local: `http://localhost:3110`)

### Market signals (MVP)
- `POST /api/market-brief` accepts `{ query, category? }` and returns a best-effort market snapshot (competitor links + keywords).

### MCP integrations (component libraries)
The app supports multiple MCP transport modes:

**Official docs**
- shadcn MCP: https://ui.shadcn.com/docs/mcp
- Magic UI MCP: https://magicui.design/docs/mcp
- Magic UI MCP server repo (manual config + tools list): https://github.com/magicuidesign/mcp

**Debugging MCP stdio (PowerShell)**
- List available local servers:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/mcp-stdio/servers" | ConvertTo-Json`
- List tools for magic:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-stdio/tools" -ContentType "application/json" -Body '{"serverId":"magic"}' | ConvertTo-Json -Depth 10`
- List tools for Magic UI:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-stdio/tools" -ContentType "application/json" -Body '{"serverId":"magicui"}' | ConvertTo-Json -Depth 10`
- Call a tool:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-stdio/call" -ContentType "application/json" -Body '{"serverId":"magic","toolName":"<tool>","args":{}}' | ConvertTo-Json -Depth 10`

If stdio calls fail, the API returns a `diagnostics.stderrTail` snippet (last ~12 stderr lines) to help identify missing env vars or `npx`/network issues.

- **Local MCP (stdio)** (backend spawns process):
  - `shadcn` — official config: `npx shadcn@latest mcp` (we run `cmd /c npx -y shadcn@latest mcp` on Windows to avoid interactive prompts)
  - `magicui` — official manual config: `npx -y @magicuidesign/mcp@latest` (we run `cmd /c npx -y @magicuidesign/mcp@latest` on Windows)
  - `magic` — `npx -y @21st-dev/magic@latest` (requires `MAGIC_API_KEY`)
  - Endpoints:
    - `GET /api/mcp-stdio/servers`
    - `POST /api/mcp-stdio/tools` `{ serverId }`
    - `POST /api/mcp-stdio/call` `{ serverId, toolName, args }`
- **Hosted MCP (SSE)**:
  - `unframer` — requires `MCP_UNFRAMER_SSE_URL`
  - Endpoints:
    - `GET /api/mcp-sse/servers`
    - `POST /api/mcp-sse/tools` `{ serverId }`
    - `POST /api/mcp-sse/call` `{ serverId, toolName, args }`

- **Local MCP (HTTP via adapter)**:
  - `gemini-image` — Gemini image generation via local container (REST) exposed through an MCP JSON-RPC adapter.
  - Required (non-secret) env vars (see `.env.example`):
    - `GEMINI_IMAGE_MCP_BASE_URL` (default: `http://localhost:3102`)
    - `MCP_ADAPTER_BASE_URL` (optional; default: `http://localhost:4000`)
  - Adapter endpoint (backend):
    - `POST /api/mcp-http-adapter/gemini-image` (MCP JSON-RPC: `initialize`, `tools/list`, `tools/call`)
  - Registry endpoints (same as other HTTP MCP servers):
    - `GET /api/mcp-http/servers` (should include `gemini-image`)
    - `POST /api/mcp-http/tools` `{ serverId: "gemini-image" }`
    - `POST /api/mcp-http/call` `{ serverId: "gemini-image", toolName, args }`
  - Tools exposed (v1):
    - `gemini_image.list_models`
    - `gemini_image.list_images`
    - `gemini_image.generate`
  - Safety:
    - The adapter **never returns base64** image blobs (only ids/urls/metadata).
    - Avoid logging raw image payloads.

- **Remote MCP (WebSocket)** (experimental):
  - Endpoints:
    - `POST /api/mcp/tools` `{ serverUrl }`
    - `POST /api/mcp/generate-block` `{ serverUrl, toolName, prompt, blockType? }`

### Prisma status
- Prisma is **not configured** yet in this repo (`backend/schema.prisma` is empty). The backend uses in-memory mocks where needed.

## Testing & CI
- No test runner is configured in `package.json` yet.
- If you add tests, prefer adding a single lightweight runner first (e.g., Vitest) and wire it into CI later.

## Template specifications (V2 architecture)
- **Quality-driven approach**: All categories follow unified V2 specification format:
  - **Market Strategy & Positioning**: Target audience analysis, competitive positioning, value proposition framework
  - **Monetization Architecture**: 3-tier pricing structure, social proof strategy, value anchoring, ecosystem planning
  - **Content Blueprint**: Information architecture, content block specifications, technical requirements
  - **Visual System Layer**: Design foundation, category-specific optimization, platform requirements  
  - **Assets Pipeline**: Production workflow, deliverable specifications, support infrastructure
- **Quality benchmarks**: 
  - **Notion Templates V2**: 91→93/100 (enhanced social proof + niche positioning)
  - **AI Prompts V2**: 83→88/100 (framework-based approach + technical credibility) 
  - **Digital Planners V2**: 77→86/100 (aesthetic lifestyle + Instagram-worthy design)
  - **Design Templates V2**: 76→85/100 (agency-grade + professional ROI focus)
- **Implementation docs**:
  - `templates/*_V2.md` - Complete V2 specifications for each category
  - `QUALITY_CRITERIA.md` - 100-point scoring rubric and launch thresholds
  - `VISUAL_SYSTEM_SPEC.md` - Conversion-optimized presets and performance budgets
  - `COMPONENT_LIBRARY_INTEGRATION.md` - Category-specific MCP workflow mappings

## Common workflows
- **Add a new template category:**
  - Update `TemplateCategory` in `types.ts`
  - Create V2 specification following `TEMPLATE_SPEC_V2_FORMAT.md`
  - Add category-specific components in `COMPONENT_LIBRARY_INTEGRATION.md`  
  - Update category names + image seeds in `services/geminiService.ts`
  - Update UI list in `components/TemplateGrid.tsx` and Components tab in `Sidebar.tsx`
- **Add a new style preset field:**
  - Update `StylePreset` in `types.ts`
  - Update the Gemini `responseSchema` + prompt in `services/geminiService.ts`
  - Update `store.ts` `applyPreset()` and any UI bindings
  - Add preset specifications to `VISUAL_SYSTEM_SPEC.md` if needed

### Canvas modules (premium visuals)
- The **Theme → Canvas Modules** panel controls hero visual modules live:
  - `heroBackgroundEffect`: `none` | `lightrays` | `dither`
  - `heroDitherIntensity` slider
  - `heroGradientTitleEnabled`, `heroSplitTitleEnabled`, `heroGlareCtaEnabled`

### Components tab: Curated MCP workflows
- The **Components** tab provides category-specific component buttons that trigger optimized MCP workflows:
  - **AI Prompts**: Framework Showcase, Technical Credibility, Developer Testimonials, 3-Tier Pricing
  - **Notion Templates**: Database Showcase, Productivity Benefits, Setup Simplicity, Professional Testimonials  
  - **Digital Planners**: Aesthetic Gallery, Lifestyle Benefits, App Compatibility, Creative Community
  - **Design Templates**: Agency ROI Calculator, Platform Compatibility, Professional Testimonials, Commercial License
- Each button uses curated prompts aligned with category positioning and target audience
- Components integrate seamlessly with the existing MCP preview → insert workflow

### AI recommendation system
- **Smart suggestions** appear on hover over editable content (title, description, content blocks)
- **Category-aware recommendations** provide 3 contextual alternatives based on:
  - Selected template category and target audience
  - V2 specification positioning (framework-based, aesthetic lifestyle, agency-grade, etc.)
  - Conversion-optimized messaging with specific value propositions
- **One-click application** replaces content instantly, with full undo support

### Chat with AI integration (production-ready)
- **Interactive AI chat** with context-aware suggestions and component generation

#### UX: Two access patterns
1) **Chat modal** (existing): user clicks chat button → modal opens
2) **Chat Control Dashboard** (new, always visible): fixed bottom-docked dashboard that keeps the LLM accessible at all times

#### Chat Control Dashboard (always-visible)
- Full-width, fixed-position panel docked to the bottom of the app
- Compact by default and **height-adjustable** (resizable handle)
- The existing **“Add Section (MCP)”** UI remains **unchanged** and continues to function as the deterministic/manual workflow
- Layout safety: `App.tsx` reserves bottom space equal to the dashboard height so content is never hidden

#### Ask / Turbo modes (tool automation)
- **Ask mode**: assistant proposes the MCP server/tool + args and waits for confirmation
- **Turbo mode**: assistant selects tools/args and executes automatically (visually “lit” in UI)
- **Guardrail (v1):** single-tool-per-message execution (prevents spam + keeps runs deterministic)

#### Category workflow buttons (routed through chat)
- Dashboard includes dedicated button groups for:
  - **AI Prompts**
  - **Notion Templates**
  - **Digital Planners**
  - **Design Templates**
- Clicking a workflow button sends a **structured prompt into the chatbot** (no direct MCP call from the button)
- Chat can run a guided micro-flow (e.g., style follow-ups like Glassmorphic / Minimalist / 3D animated) via clickable option buttons

#### MCP tool awareness + formatting pipeline
- MCP stdio servers are discovered via backend endpoints:
  - `GET /api/mcp-stdio/servers`
  - `POST /api/mcp-stdio/tools` `{ serverId }`
  - `POST /api/mcp-stdio/call` `{ serverId, toolName, args, timeoutMs? }`
- Tool outputs are converted into Canvas-ready content via:
  - `POST /api/ai/format-mcp-output` (raw MCP output → structured `ContentBlock`)

#### Chat orchestration (implemented)
- The intended “agentic” flow is consolidated behind a single endpoint:
  - `POST /api/chat/orchestrate`
- Contract intent:
  - Input: `{ message, context, mode, product?, preset? }`
  - Output (Ask): `{ executed: false, recommendation: { serverId, toolName, args, targetBlockType, rationale } }`
  - Output (Turbo): `{ executed: true, recommendation: {...}, mcpText, formatted: { formattedBlock, suggestions } }`
- Performance note: tool catalog is cached in-memory (server list + tools list) and refreshed on demand

##### `/api/chat/orchestrate` examples (PowerShell)
- Ask mode (recommend only):
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/chat/orchestrate" -ContentType "application/json" -Body '{"message":"Create a 3-tier pricing section","mode":"ask","context":{"category":"AI_PROMPTS"}}' | ConvertTo-Json -Depth 10`
- Turbo mode (exec + format → ContentBlock)
  - Requires `product` + `preset` so formatting can return a Canvas-ready block:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/chat/orchestrate" -ContentType "application/json" -Body '{"message":"Create a 3-tier pricing section","mode":"turbo","context":{"category":"AI_PROMPTS"},"product":{...},"preset":{...}}' | ConvertTo-Json -Depth 10`

##### Debugging the dashboard
- Add `?debugChat` to the frontend URL to log orchestration timing + chosen args into the chat transcript.

##### Orchestrator CLI Console (dev)
- The app includes a developer-facing Orchestrator console (`components/OrchestratorCliConsole.tsx`).
- It supports a command:
  - `/orchestrate <message>`
    - Sends `POST /api/agents/orchestrate` with `mode:"fast"` by default.
    - Prints the returned `/1` envelope JSON into the console stream.

---

## Production-test exports (reports + zips + market snapshot)

### What this is
- A repeatable export pipeline that produces **team-reviewable artifacts** under `production-test/`:
  - `report.html` — interactive report (tabs per category)
  - `report.md` — comprehensive overview + strategic analysis + key insights + actionable steps
  - `market-data.json` — Apify-based market snapshot (structured)
  - `combined.json` — all artifacts + market data in one file
  - `summary.json` — quick scan index
  - `individual-files.zip` — raw per-category artifacts
  - `full-assembly.zip` — combined + summary + reports + market + artifacts

### Generate exports
1) Ensure `.env.local` contains:
   - `GEMINI_API_KEY`
   - `APIFY_TOKEN`
   - (optional) `APIFY_SERP_ACTOR_ID`
2) Run:
   - `npm run export:production-test`

### Notes / troubleshooting
- If market data is empty, confirm `APIFY_TOKEN` is valid and the default actor exists.
- You can override the actor via `APIFY_SERP_ACTOR_ID`.
- `tmp-workflows/` is treated as scratch; the export command copies any existing workflow artifacts into `production-test/` before generating reports.

---

## Market validation (Apify + SerpAPI) — rapid niche validation

### Recommended usage (offline insights layer)
- **Recommended:** run market validation as an **offline insights layer** that improves copy quality and delivery decisions.
- It is **not required** for the runtime app experience.
- Use outputs to:
  - refine prompts (feature list, objections, proof points)
  - tighten pricing/tier strategy
  - confirm delivery expectations (ZIP, Start Here, duplicate links, import guides)
  - update the quality gate checklist (must-have sections)

### When to integrate into the live app (optional)
- Only integrate into runtime if you want continuously refreshed market signals and automated prompt adjustments.
- Default approach: keep it offline for deterministic builds and lower complexity.

### What this is
A repeatable validation pipeline that extracts **real market signals** per niche (AI Prompts, Notion templates, Digital planners, Design templates):
- competitor positioning + headlines
- pricing bands and tier patterns (where visible)
- recurring buyer pain points (from reviews when available)
- delivery expectations (ZIP, Start Here, duplicate links, import guides, licensing clarity)
- keyword clusters + “People Also Ask” questions (SerpAPI enrichment)

### Data sources (recommended pipeline)
- **Apify Gumroad Search Scraper** → discovers competitor products
- **Apify Gumroad Product Detail Scraper** → extracts listing copy + metadata
- **Apify Gumroad Reviews Scraper** → extracts real customer pain points and complaints
- **SerpAPI** (optional) → adds PAA/related query signals for broader demand and objections

### Required env
- `.env.local`:
  - `APIFY_TOKEN` (required)
  - `APIFY_GUMROAD_SEARCH_ACTOR_ID` (recommended)
  - `APIFY_GUMROAD_DETAIL_ACTOR_ID` (recommended)
  - `APIFY_GUMROAD_REVIEWS_ACTOR_ID` (recommended)
  - `SERPAPI_KEY` (optional; used to augment Apify results with PAA/related queries)

### Tuning knobs (cost/time vs signal quality)
- Recommended sample size: **20 competitor products per category**
- If you’re iterating fast: start with 10, then scale to 30 for deeper audits

### Expected outputs
Under `production-test/`:
- `market-validation.json` — raw normalized validation dataset (queries, results, extracted phrases)
- `framework-audit.json` — claim-by-claim audit: **Supported / Weakly supported / Contradicted**, plus recommended changes
- `report.md` — includes a Market Validation section summarizing key pain points + recommended delivery format per product type

### Commands (recommended)
- Run validation:
  - `npm run validate:market`
- Audit the framework against extracted signals:
  - `npm run audit:framework`
- Run everything and export:
  - `npm run validate:all`

### How to use the results (team checklist)
- Treat **paid intent** signals as highest value: pricing pages, purchase language, checkout screenshots.
- Treat “download all / zip / import steps / duplicate link confusion” as delivery-critical requirements.
- Use the dataset to:
  1) choose a niche (or micro-niche)
  2) choose a delivery format (ZIP + Start Here + Pages)
  3) write Gumroad copy that directly addresses discovered objections

### Recommended decision gates
- If top results are mostly “free” and buyers complain about paid alternatives → tighten differentiation.
- If competitors repeatedly highlight one feature (e.g., Goodnotes tabs, Notion onboarding) → it’s table-stakes.
- If licensing questions appear frequently in results → include a license page + clear checklist.

#### Component architecture
- `components/ui/chat-with-ai.tsx`
  - `ChatControlDashboard` (fixed dock)
  - `ChatWithAI` (modal)
  - Workflow button rendering + follow-up option buttons
- `App.tsx`
  - Mounts `ChatControlDashboard` and reserves bottom padding
- `store.ts`
  - Persists dashboard height + Ask/Turbo mode (localStorage)
  - Caches MCP server list/tool list metadata for responsiveness

#### Developer runbook (quick-start)
- Install deps:
  - `npm install`
- Start full stack dev (recommended):
  - `npm run dev:full`
  - Frontend: `http://localhost:3110`
  - Backend: `http://localhost:4000`

##### Required env
- `.env.local`:
  - `GEMINI_API_KEY` (required for formatting + chat)
  - `MAGIC_API_KEY` (required only if using `@21st-dev/magic` stdio MCP server)

##### Verifying MCP tool discovery (PowerShell)
- List servers:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/mcp-stdio/servers" | ConvertTo-Json -Depth 5`
- List tools:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-stdio/tools" -ContentType "application/json" -Body '{"serverId":"magicui"}' | ConvertTo-Json -Depth 10`
- Call tool:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-stdio/call" -ContentType "application/json" -Body '{"serverId":"magicui","toolName":"<tool>","args":{},"timeoutMs":20000}' | ConvertTo-Json -Depth 10`

##### Verifying formatting (PowerShell)
- `POST /api/ai/format-mcp-output` expects:
  - `text`, `targetBlockType`, `product`, `preset`
- If formatting fails/timeouts, backend returns safe fallback blocks (never dead-end)

##### Team conventions for extending orchestration safely
- Keep contracts typed (add interfaces in `backend/mcpSchemas.ts` and `types.ts` as needed)
- Never log secrets (API keys) in backend logs or frontend UI
- When adding a new block type: update `types.ts` + formatter schema + renderer
- Prefer stdio-first MCP integration for local reliability; add SSE only once stdio paths are stable

### Library tab: MCP preview → insert workflow  
- The **Library → MCP Component Preview** panel can generate a section via local MCP stdio servers:
  - `magicui` (layout-focused)
  - `magic` (21st.dev, requires `MAGIC_API_KEY`)
  - `shadcn`
- Flow:
  1) Select server + tool
  2) Provide a prompt + block type
  3) Click **Generate preview**
  4) A **Canvas Preview** card appears in the canvas (`ProductPreview`) with **Insert** / **Dismiss**

### Add new React Bits components
- Place TS-CSS components under `components/reactbits/`
- Import and wire them in `components/ProductPreview.tsx` (hero is the current integration point)
- If a component requires a runtime dependency (e.g., `ogl` for `LightRays`), add it to `package.json` and run `npm install`

## Sentinel Agent (V2) — local quality guardian

### What this is
Sentinel is a deterministic, scope-aware quality guard intended to run **locally** during development.
It enforces a “green state” by running checks in a fail-fast sequence.

### Temp file hygiene
- Use `tmp_rovodev_sentinel_` as the prefix for any temporary files created by Sentinel.

### Scope rules
- **Frontend scope** (changes isolated to `components/`, `services/`, `App.tsx`):
  - Run: `npm run lint` → `npm run typecheck`
  - Skip build unless explicitly requested
- **Backend/core scope** (changes touching `backend/`, `types.ts`, `store.ts`, routes):
  - Run: `npm run lint` → `npm run typecheck` → `npm run build` → smoke

### Fail-fast execution sequence (stop on failure)
1) **Lint:** `npm run lint`
2) **Typecheck:** `npm run typecheck` (fallback: `npx tsc --noEmit`)
3) **Build:** `npm run build`
4) **Smoke (backend changes only):**
   - `GET /api/mcp-stdio/servers`
   - `POST /api/chat/orchestrate` (ask mode)
   - If Gumroad routes changed: `GET /api/gumroad/status`

### Output schema (Sentinel reports)
1. CHECKS RUN
2. RESULT (PASS/FAIL)
3. FAILURES (summarized)
4. ROOT CAUSE
5. FIX PLAN (minimal)
6. VERIFICATION (commands)

---

## Debug Trace (Agent Execution Tracker) — development mode

### Purpose
Enable **full visibility during development** into:
- agent timings, retries, fallbacks
- tool calls and formatting outcomes
- schema validation and quality gate results

### Feature flags
- `AGENT_TRACE_ENABLED=true|false`
  - Enables trace capture and the Debug UI tab.
- `AGENT_TRACE_VERBOSE=true|false`
  - When true (dev-only): includes verbose payloads (sanitized), truncated for size.

### Storage
- Trace files are written under: `production-test/logs/<traceId>.json`

### UI integration (Chat)
- The Debug Trace viewer lives inside the Chat UI (Dashboard) as a **Debug** tab.
- Each agentic generation response returns `meta.traceId`.
- The Debug tab can load and render the trace timeline for analysis.

---

## Chat Control Dashboard behavior (scroll-threshold)

### Desired UX
- **Compact sticky chatbar** is always available (minimal input).
- The full dashboard (workflow buttons/tool browser/debug) becomes visible **only after scrolling past the end of the main preview column**.
- When the user scrolls back above the threshold, the dashboard collapses back to compact mode.

### Implementation approach
- Use an `IntersectionObserver` sentinel placed at the end of the main preview column.
- **Chat UX:** the chat UI uses a **compact sticky chatbar** by default, and auto-expands into the full dashboard (buttons/tool browser/debug) only after the user scrolls past the preview sentinel.
- **Debug Trace UI:** the trace viewer is available inside the chat dashboard as a **Debug** tab when `AGENT_TRACE_ENABLED=true` (optional `AGENT_TRACE_VERBOSE=true`).

---

## Outstanding tasks (team checklist)

### High priority
- Implement scroll-threshold Chat UI (compact sticky bar → auto-expand below preview)
- Implement backend trace logging + `GET /api/traces/:traceId` (dev-only)
- Implement Debug Trace tab in chat UI

### Agent Squad (V2.3)
- Implement Orchestrator (brief + final consistency pass)
- Implement Daily Swarm (`Promise.allSettled` + retry + fallback + merge)
- Implement Researcher (Apify → Gemini → snapshots) + snapshot injection
- Add quality gate + contradiction checks + provenance metadata

### Verification
- `npm run lint`, `npm run typecheck`, `npm run build`
- Smoke endpoints after route changes

---

## Session Log
- 2025-12-25: Visual R&D harnesses + shader + stock image proxy.
  - Added smooth MeshGradient shader hero and scroll/parallax variants in the Vite app landing page (`?landing&variant=smoothshader*`).
  - Added stock-image parallax gallery cards and reduced-motion-safe scroll transforms.
  - Added `@paper-design/shaders-react` and new component `components/ui/hero-section-with-smooth-bg-shader.tsx`.

- 2025-12-25: AI Prompt Packs pivot — PromptOptimizer Pro (freemium → optimizer → advanced export)
  - PromptOptimizer Pro deliverables created under `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/`.
  - ZIP ready for Gumroad upload: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro.zip`.
  - Paste-ready listing: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro_GUMROAD_LISTING.txt`.
  - Interactive listing preview (light glass + shimmer): `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro_listing_preview.html`.
  - Specs exported as JSON:
    - `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/SPECS_LANDING.json`
    - `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/SPECS_GUMROAD.json`
    - `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/SPECS_APP.json`
  - Landing variants added/polished:
    - `glass3d-light`, `glass3d-light2`, `glass3d-light3` (distinct neon/shimmer intensity; reduced-motion safe)
    - `smoothshader*` variants supported
  - Live Preview polish:
    - Pricing content block full-width
    - Highlighted pricing card animates (float + glow pulse; reduced-motion safe)
    - Testimonials fixed via `GlassTestimonialCarousel tone="light"|"dark"`
  - Chrome/platinum rebrand + shimmer:
    - `.gg-platinum-shimmer` utility in `index.html`
    - Removed remaining pink/purple accents across UI and updated title/CTAs
  - New 3D button system:
    - Added `components/ui/3d-button.tsx` (framer-motion + CVA + Tabler icons)
    - Migrated top action buttons, Sidebar tabs and category selectors, Chat Expand/Collapse, and other key controls to `Button3D`
  - Architect Panel UX:
    - Category selector moved to top of Sidebar content as `START HERE!`
    - Default tab now starts on `theme`
    - Market Data moved into collapsed `Advanced` section
  - App theme updated from pink accents to platinum/silver gradients + shimmer (CTA + title).
  - Live Preview polish:
    - Pricing cards now render full-width reliably in ProductPreview.
    - Highlighted pricing card now animates (float + glow pulse), reduced-motion safe.
    - Removed remaining pink/purple accents from Live Preview controls.
  - Chat Dashboard behavior:
    - Expand button now forces dashboard open regardless of scroll threshold (manual override).
  - Added a 3D button component (`components/ui/3d-button.tsx`) using framer-motion + Tabler icons + CVA, and migrated top action buttons (Chat/Reset/Generate) to the new chrome variant.
  - Architect Panel UX: moved category selector (AI Prompts / Notion Templates / Digital Planners / Design Templates) into the Styles tab and renamed header to "START HERE!".
  - Created shippable deliverables bundle under `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/`.
  - Includes: Full PRD (`00_PRD/`), Technical Spec (`01_TECH_SPEC/`), Freemium lessons (`02_FREEMIUM_LESSONS/`), and 10 prompt packs (`03_PROMPT_PACKS/`).
  - Tier model:
    - Tier 1 (Freemium): lessons + starter packs + examples + QA rubrics.
    - Tier 2 (Paid): Prompt Optimizer app access (hosted quota + optional BYO key extension).
    - Tier 3 (Premium): advanced workflows + export-first Social Packs (JSON/CSV/TXT) for TikTok/Instagram/Facebook/LinkedIn/YouTube; OAuth posting deferred.
  - Prompt pack library (10 total):
    - FREE (5): Hook_Generator, Caption_Enhancer, LinkedIn_Insight_Builder, Brand_Voice_Primer, YouTube_Title_Description_Optimizer
    - OPTIMIZER (3): Prompt_Debugger, AB_Variant_Tester, Prompt_Token_Budget_Trimmer
    - ADVANCED_EXPORT (2): Social_Pack_5_Platforms, Content_Repurposer_5_Platforms
  - Gumroad listing assets generated (PromptOptimizer Pro):
    - Upload ZIP: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro.zip`
    - Paste-ready listing: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro_GUMROAD_LISTING.txt`
    - Interactive listing preview (light glass/3D/shimmer): `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro_listing_preview.html`
  - Specs exported as JSON (PromptOptimizer Pro):
    - Landing spec: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/SPECS_LANDING.json`
    - Gumroad spec: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/SPECS_GUMROAD.json`
    - App spec: `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro/SPECS_APP.json`
  - Chrome/platinum rebrand + shimmer standardization:
    - Added `.gg-platinum-shimmer` utility in `index.html`.
    - Updated app title “Genie” to platinum gradient; removed remaining pink/purple accents across UI (Sidebar, Chat dashboard, Terminal, DynamicIcon default gradients).
  - New 3D button system:
    - Added `components/ui/3d-button.tsx` (framer-motion + CVA + Tabler icons) with `variant="chrome"`.
    - Installed deps: `framer-motion`, `@tabler/icons-react`, `class-variance-authority`.
    - Migrated top action buttons (Chat/Reset/Generate), Sidebar category buttons, and Chat dashboard Expand/Collapse to `Button3D`.
  - Live Preview fixes:
    - Pricing cards in `ProductPreview` now render full-width reliably.
    - Highlighted pricing card animates (float + glow pulse), reduced-motion safe.
    - Testimonial carousel supports `tone="light"|"dark"` to prevent white-on-white.
  - Landing page variants (light glass/3D/shimmer):
    - Added `glass3d-light`, `glass3d-light2`, `glass3d-light3` variants with distinct neon/shimmer intensities and scroll effects.
    - Fixed bottom CTA contrast for light variants.
  - Branding:
    - Architect Panel header now supports a brand logo at `public/brand_logo/brand-logo.png` (glass chrome badge + shimmer).

  - Added temporary single-section visual test harness files (Tailwind CDN) for rapid customer-style review:
    - `tmp_rovodev_pricing_variants.html` (pricing variants V1–V20; favorites noted: V2 glass, V3 neon, V5 comparison table, V7 neon glow, V9 shimmer)
    - `tmp_rovodev_hero_variants.html` (hero variants V1–V5; favorites noted: V2 glass, V3 aurora, V4 neon)
    - `tmp_rovodev_background_shader_variants.html` (background/shader-ish variants V1–V10; Canvas 2D overlays + gradient meshes)
    - `tmp_rovodev_chat_component_variants.html` (docked chat UI variants V1–V8; resizable dock simulation)
    - `tmp_rovodev_testimonial_variants.html` (testimonial layout variants V1–V8)
  - Integrated a Three.js shader-style hero background component:
    - New file: `components/ui/mountain-scene.tsx` (`GenerativeMountainScene`)
    - Safety: runs as background layer; pauses when tab hidden; disposes WebGL resources on unmount.
    - Wired into landing page for `variant=glass3d` only (`components/LandingPage.tsx`).
  - Added server-side stock image proxy endpoint (no client key exposure):
    - New route: `GET /api/stock-image?provider=pexels|pixabay&query=<text>` (Express backend)
    - Uses `PEXELS_API_KEY` / `PIXABAY_API_KEY` from `.env.local`, returns `{ url, source, attribution?, reason? }`.
    - Landing page glass shader overlay now requests Pexels image with fallback to a known Unsplash URL.
  - Updated `.env.example` to include placeholders for `PEXELS_API_KEY` and `PIXABAY_API_KEY` (server-side only).
  - Orchestration endpoint (server-side /1 envelope): `POST /api/agents/orchestrate` supports `mode:"fast"|"full"` with time budgets + deterministic fallbacks.

### Agent handoff checklist (2025-12-25)
1) Install + run
- `npm install`
- `npm run dev:full` (kills ports 3110/4000, starts frontend+backend)

2) Theme/branding quick checks (frontend)
- Verify app chrome/platinum theme:
  - Top title “GumGenie” shows platinum gradient (no pink).
  - Top action buttons use `Button3D` chrome (Chat/Reset/Generate).
- Verify brand logo loads:
  - Place file at: `public/brand_logo/brand-logo.png`
  - Confirm Architect Panel header shows logo in a glass chrome badge.

3) Landing page variant checks
- Open:
  - `http://localhost:3110/?landing&variant=glass3d-light`
  - `http://localhost:3110/?landing&variant=glass3d-light2`
  - `http://localhost:3110/?landing&variant=glass3d-light3`
- Confirm:
  - Distinct neon/shimmer intensity per variant.
  - Reduced motion disables shimmer/tilt/parallax.
  - Bottom CTA text is readable (no black-on-black).

4) Live Preview checks (ProductPreview)
- Generate any category and confirm:
  - Pricing content block renders full width.
  - Highlighted pricing tier card animates (reduced-motion safe).
  - Testimonials render with correct contrast (light tone on light backgrounds).

5) Chat dashboard behavior
- Confirm Expand button forces open regardless of scroll threshold.

6) Gumroad assets
- Confirm PromptOptimizer Pro deliverables exist:
  - `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro.zip`
  - `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro_GUMROAD_LISTING.txt`
  - `tmp_rovodev_deliverables_bundle/AI_PROMPTS_PromptOptimizerPro_listing_preview.html`
- Optional: open the HTML preview locally to screenshot for Gumroad.

7) Checks (required protocol)
- `npm run lint`
- `npm run typecheck`

### Additional agent handoff notes (UI/Brand)
- Button system:
  - New 3D button component: `components/ui/3d-button.tsx` (`variant="chrome"`, `variant="outline"` now chrome-outline)
  - Dependencies installed: `framer-motion`, `@tabler/icons-react`, `class-variance-authority`
  - Major UI surfaces migrated to `Button3D`: top action buttons (Chat/Reset/Generate), Sidebar tabs and category selectors, Chat dashboard Expand/Collapse, Chat right-panel tab toggles.
- Branding:
  - App title “Genie” is platinum gradient + shimmer; remove remaining purple/pink accents via grep if regressions appear.
  - Brand logo path: `public/brand_logo/brand-logo.png` renders in Architect Panel header in a glass chrome badge.
- Architect Panel UX:
  - START HERE category selector moved to the top of Sidebar content and default active tab is `theme`.
  - Market Data moved into a collapsed `Advanced` `<details>` section.
- Live Preview:
  - Pricing cards render full width and highlighted tier animates (reduced-motion safe).
  - Testimonials support `tone="light"|"dark"` to prevent contrast issues.

2) Env requirements (local)
- `.env.local` must include (values not to be logged):
  - `GEMINI_API_KEY`
  - `PEXELS_API_KEY` (optional)
  - `PIXABAY_API_KEY` (optional)

3) Smoke checks (PowerShell)
- Health/version:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/health" | ConvertTo-Json`
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/version" | ConvertTo-Json`
- Stock image proxy:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/stock-image?provider=pexels&query=mountains" | ConvertTo-Json -Depth 5`
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/stock-image?provider=pixabay&query=mountains" | ConvertTo-Json -Depth 5`

4) Landing page verification
- Open: `http://localhost:3110/?landing&variant=glass3d`
  - Confirm Three.js shader background renders behind hero (mouse light reacts)
  - Confirm it does not block clicks (`pointer-events: none`)

5) Visual test harness files (temporary)
- Open locally in browser (deep-link with `#vN`):
  - `tmp_rovodev_pricing_variants.html`
  - `tmp_rovodev_hero_variants.html`
  - `tmp_rovodev_background_shader_variants.html`
  - `tmp_rovodev_chat_component_variants.html`
  - `tmp_rovodev_testimonial_variants.html`
- Hygiene: delete tmp harness files after review.

- 2025-12-22: Deep-dive extraction stabilized (SerpAPI discovery + muhammetakkurtt/gumroad-scraper detail; up to 30 competitors/category; reviews skipped unless APIFY_GUMROAD_REVIEWS_ACTOR_ID is rented).
- 2025-12-22: V2.3 Agent Squad implemented: backend endpoints `/api/agents/generate` + `/api/agents/research` (snapshot placeholder initially).
- 2025-12-22: Frontend wired to Agent Squad: generation uses `/api/agents/generate`; Sidebar includes Market Data status + Refresh.
- 2025-12-22: Output quality + dev UX upgrades: per-agent swarm timings fixed; merger now populates `product.contentBlocks` + safer preset/emoji handling; `/api/agents/research` now generates deterministic snapshots from latest `production-test/raw/<run>/merged/<CATEGORY>.detail.json`; added `/api/health` + deterministic `/api/version` (fs+JSON parse with cache); ProductPreview renders `pricing` content blocks via `PricingTiersSection` (no duplicate pricing section); Chat dashboard manual collapse/expand persisted (`gg_chatDashboardCollapsed`). Verified via lint/typecheck/build + full API smoke + one generation per category.se/expand persisted (`gg_chatDashboardCollapsed`). Verified via lint/typecheck/build + full API smoke + one generation per category.se/expand persisted (`gg_chatDashboardCollapsed`). Verified via lint/typecheck/build + full API smoke + one generation per category.
- 2025-12-22: Added reusable 3-tier pricing component `components/canvas/ThreeTierPricingGuide.tsx` and updated pricing content blocks in `components/ProductPreview.tsx` to render with it (decoy pricing based on product.price). Verified via typecheck + sample generation (NOTION_TEMPLATES).
- 2025-12-22: Notion MCP integration (Streamable HTTP) + full OAuth added.
- 2025-12-22: Notion template creation workflow started: introduced `NotionTemplateBlueprint` schema (pages/databases/properties/views/seed) in `backend/agents/definitions/schemas.ts` as the deterministic plan for the upcoming Notion MCP build runner.
- 2025-12-22: Notion blueprint generators added for NOTION_TEMPLATES: deterministic baseline + optional Gemini mode (env `NOTION_BLUEPRINT_MODE=gemini`, fallback to deterministic). `/api/agents/generate` now returns `meta.notionBlueprintMode` + `meta.notionBlueprint` (5 DBs, 2 pages in baseline). Verified via lint/typecheck and smoke generate.
- 2025-12-22: Notion template build runner v1 (MCP stdio via `mcp-remote`) is working end-to-end: added GumGenie-branded stdio server (`serverId: gumgenie`) bridging to `https://mcp.notion.com/mcp`; improved stdio error handling to fail fast on id:null errors; added dev endpoint `POST /api/notion/build-template` that creates a full template skeleton (root page + Start Here + Dashboard + 5 databases) and returns created URLs/IDs.
- 2025-12-22: Hosting plan updated: application hosted on https://www.gumgenie.com and product hosting/domain on https://www.agelessinsights.ca. Ensure activation links/QR codes and docs reflect this.
- 2025-12-22: Cloudflare free-tier/storage assessment (official docs): confirmed Pages Functions requests count toward Workers Free plan quota (100k requests/day). KV limits confirmed (100k reads/day, 1k writes/day on Free) and D1 free limits confirmed (5M rows read/day, 100k rows written/day, 5GB). Recommended v1: KV-only for one-time license redemption; add D1 later for audit/analytics. Sources: https://developers.cloudflare.com/pages/functions/pricing/ ; https://developers.cloudflare.com/kv/platform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/
- 2025-12-22: Market-signal grounding (local scraped dataset): when deciding deliverables and protocol UX/copy (e.g., Start Here page content, setup flow, objections), ground decisions in the repo’s scraped Gumroad/market dataset when available. Evidence paths used: production-test/market-validation.summary.json (NOTION_TEMPLATES: setup confusion), production-test/NOTION_TEMPLATES_product.json (common FAQ/objection patterns).
- 2025-12-22: gumgenie-app Phase 1 progress (Cloudflare Pages app): added KV-backed customer Notion OAuth connect flow (`/api/notion/oauth/start`, `/api/notion/oauth/callback`, `/api/notion/status`) using `GG_SESSION_KV`. Upgraded `POST /api/generate` (gumgenie-app) to build a NOTION_TEMPLATES v1 skeleton via Notion REST API (2025-09-03) (root page + 5 databases + Start Here + Dashboard) and mark the Gumroad key used in `GG_LICENSE_KV` only after full success. Added Start Here + Dashboard block children insertion via Notion Blocks API. Added `variant: "standard" | "premium"` option to control onboarding depth. Fixed production OAuth callback crash on Pages (`ReferenceError: Buffer is not defined`) by replacing Node Buffer usage with Workers-compatible base64 encoding. children insertion via Notion Blocks API. Added `variant: "standard" | "premium"` option to control onboarding depth.
- 2025-12-23: Option B (Wrangler-first) deployment work: authenticated Wrangler (`wrangler whoami`), created Pages project `gumgenie-generator`, and debugged Pages Functions routing. Key finding: `wrangler pages deploy .` (repo root) serves static HTML for `/api/*` because `/functions` is not at repo root; preferred approach is setting Pages root directory to `gumgenie-app` (Git integration) or deploying a build output containing `_worker.js` + `_routes.json`. Security hygiene: kept `.env.example` placeholders only and scrubbed secrets from versioned config; Pages secrets configured via `wrangler pages secret put`.
- 2025-12-23: Notion OAuth crash fix (Cloudflare Pages): observed production error `ReferenceError: Buffer is not defined` during `/api/notion/oauth/callback` (from `wrangler pages deployment tail`). Fixed by replacing Node Buffer base64 with Workers-compatible UTF-8 base64 encoding using `btoa` in `gumgenie-app/functions/api/notion/oauth/callback.ts` and redeployed.`.env.example` has placeholders only, scrubbed any secrets from `wrangler.toml`, configured Pages secrets via `wrangler pages secret put`, and added temp deploy dirs to `.gitignore`. Tooling: enabled Docker MCP servers `ast-grep`, `semgrep`, and `git`; initialized local git repo via `git init`.children insertion via Notion Blocks API. Added `variant: "standard" | "premium"` option to control onboarding depth.velopes across gumgenie-app endpoints.

Next developer handoff (Phase 1 → Phase 2 execution contract)

### Phase separation rule (non-negotiable)
- **Do not start Phase 2** until **Phase 1 is green for all 4 categories**.
- “Green” means: activation → generate → publish → delivery verification passes **end-to-end**, with required quality gate satisfied.

---

## PHASE 1 — Production readiness (must ship all 4 categories)

### P1.1 Activation gating (global)
- Ensure `/api/verify` and `/api/generate` share stable `{ ok, reason, message }` semantics.
- Retries must be safe (idempotent).
- **Mark license used only after full success** across all categories.

### P1.2 Observability/provenance (global)
- Every endpoint returns `runId`, `startedAt`, and a consistent error envelope.
- Logs are sanitized (no tokens/keys).

### P1.3 Quality gate (global)
- Required sections per category, no placeholders.
- Category-aligned copy and delivery expectations.
- MCP-generated sections must be formatted into valid Canvas blocks.
- Target: **80+ quality rubric**.

### P1.4 Category protocols (deliverables + variants)

#### A) NOTION_TEMPLATES
- Generation:
  - Notion build: root page + Start Here + Dashboard + 5 DBs.
  - Blocks API: Start Here + Dashboard block children insertion.
  - **Variants:** `variant: "standard" | "premium"` (premium adds Quick Wins + Troubleshooting + Operating Rules).
- Database polish (v1):
  - Views/filters (e.g., Inbox/Next/Done), basic relations (Tasks ↔ Projects).
  - Minimal seed rows (1 project + 3 tasks) optional.
- Acceptance checks:
  - Both variants produce correct content in a real Notion workspace.
  - No dead-ends: links work; onboarding is clear.

#### B) AI_PROMPTS
- Deliverable generator:
  - ZIP with: `01_START_HERE`, `04_LICENSE`, `05_SUPPORT`, prompt packs, presets, quality checklist.
  - (If applicable) multiple packs/variants (e.g., beginner vs pro).
- Acceptance checks:
  - ZIP opens and contents match listing promises.

#### C) DIGITAL_PLANNERS
- Deliverable generator:
  - PDF/ZIP output (planner pages), Start Here + license + support.
  - Variant expectations (standard vs premium) if offered.
- Acceptance checks:
  - Files render correctly; consistent branding.

#### D) DESIGN_TEMPLATES
- Deliverable generator:
  - ZIP with source files + exports + Start Here + license + support.
  - Variant expectations (standard vs premium) if offered.
- Acceptance checks:
  - Files open in target tools; licensing clarity.

### P1.5 Gumroad publishing integration (global)
- Create product, attach deliverables or links.
- Pricing tiers (if implemented), redirects, and connected status.

### P1.6 End-to-end production confirmation (hard gate)
For **each category** (NOTION_TEMPLATES, AI_PROMPTS, DIGITAL_PLANNERS, DESIGN_TEMPLATES):
- Activation → Generate → Publish
- Deliverable verification:
  - Notion: pages/dbs/blocks exist + URLs returned
  - ZIP/PDF: file integrity + expected structure
- Smoke checklist:
  - No secrets in logs
  - Quality gate satisfied

### P1.7 Local Cloudflare deploy automation (Option B: Wrangler-first)
Use this path to perfect output locally before moving to CI (Option A: GitHub Actions). Keep config/script-driven so B → A is copy/paste.

### gumgenie-app (Cloudflare Pages Functions) — Source of Truth (Phase 1)
**Important:** The deployed `*.pages.dev` endpoints come from **Cloudflare Pages Functions** under `gumgenie-app/functions/`, not the local Express backend (`backend/server.ts`).

**Authoritative Pages endpoints (gumgenie-app):**
- `GET /api/notion/status` → `gumgenie-app/functions/api/notion/status.ts`
- `GET /api/notion/oauth/start` → `gumgenie-app/functions/api/notion/oauth/start.ts`
- `GET /api/notion/oauth/callback` → `gumgenie-app/functions/api/notion/oauth/callback.ts`
- `POST /api/verify` → `gumgenie-app/functions/api/verify.ts`
- `POST /api/generate` → `gumgenie-app/functions/api/generate.ts`

**Required Cloudflare bindings (must be KV namespaces, not D1):**
- `GG_SESSION_KV` — KV namespace binding used to store OAuth session → Notion token (`sid:<sid>:notionToken`)
- `GG_LICENSE_KV` — KV namespace binding used for one-time redemption (`used:<licenseKey>`)

**Required Cloudflare env vars:**
- Notion OAuth:
  - `NOTION_CLIENT_ID`
  - `NOTION_CLIENT_SECRET`
  - `NOTION_REDIRECT_URI` (must exactly match Notion integration settings + deployed domain callback)
- Gumroad verification:
  - `GUMROAD_PRODUCT_PERMALINK`
  - (optional) `GUMROAD_ACCESS_TOKEN`

**Current implementation scope (Phase 1 reality):**
- `POST /api/generate` currently implements **NOTION_TEMPLATES only**.
- Other `templateType` values (`AI_PROMPTS`, `DIGITAL_PLANNERS`, `DESIGN_TEMPLATES`) return `501 not_implemented` until deliverable generators are implemented.

**E2E smoke sequence (NOTION_TEMPLATES standard + premium):**
1) Confirm status JSON:
   - `GET <BASE_URL>/api/notion/status` → `{ connected: false }`
2) OAuth connect (one-time):
   - open `<BASE_URL>/api/notion/oauth/start` in browser → approve → returns to callback
3) Confirm connected:
   - `GET <BASE_URL>/api/notion/status` → `{ connected: true }`
4) Generate standard:
   - `POST <BASE_URL>/api/generate` body: `{ "templateType":"NOTION_TEMPLATES", "variant":"standard", "licenseKey":"..." }`
5) Generate premium:
   - `POST <BASE_URL>/api/generate` body: `{ "templateType":"NOTION_TEMPLATES", "variant":"premium", "licenseKey":"..." }`

**Official docs (canonical):**
- Wrangler overview: https://developers.cloudflare.com/workers/wrangler/
- Wrangler commands reference (includes `pages` subcommands): https://developers.cloudflare.com/workers/wrangler/commands/
- Pages Functions get started: https://developers.cloudflare.com/pages/functions/get-started/
- Workers KV get started: https://developers.cloudflare.com/kv/get-started/

**Wrangler command syntax (official):**
- `wrangler <COMMAND> <SUBCOMMAND> [PARAMETERS] [OPTIONS]`
- Cloudflare recommends local install; run via `npx`:
  - `npx wrangler <COMMAND> <SUBCOMMAND> [PARAMETERS] [OPTIONS]`

**KV namespaces (one-time, per Cloudflare account):**
- Create namespaces:
  - `npx wrangler kv namespace create GG_SESSION_KV`
  - `npx wrangler kv namespace create GG_LICENSE_KV`
- Bind them to your Pages project runtime as KV bindings named exactly:
  - `GG_SESSION_KV`
  - `GG_LICENSE_KV`

**Deploy (Pages):**
- Wrangler provides a `pages` command group for Cloudflare Pages (see Commands docs). Common commands you will use:
  - `npx wrangler pages deploy ...`
  - `npx wrangler pages dev ...`
  - `npx wrangler pages project create ...`
  - `npx wrangler pages deployment list ...`
  - `npx wrangler pages deployment tail ...`
  - `npx wrangler pages secret put ...`

**Post-deploy E2E smoke (NOTION_TEMPLATES variants):**
1) Notion OAuth status:
   - `GET <BASE_URL>/api/notion/status`
   - If not connected, complete one-time OAuth connect:
     - open `<BASE_URL>/api/notion/oauth/start` in browser → approve → confirm status is connected
2) Generate Standard:
   - `POST <BASE_URL>/api/generate` body: `{ "templateType":"NOTION_TEMPLATES", "variant":"standard", "licenseKey":"..." }`
3) Generate Premium:
   - `POST <BASE_URL>/api/generate` body: `{ "templateType":"NOTION_TEMPLATES", "variant":"premium", "licenseKey":"..." }`
4) Acceptance checks in Notion UI:
   - Root page + Start Here + Dashboard created
   - Blocks inserted (onboarding present)
   - 5 databases exist
   - DB links open correctly

**Pro tips (speed + reliability):**
- Confirm Wrangler auth quickly (official CLI): `npx wrangler whoami`.
- Prefer `npx wrangler ...` to avoid global version drift between machines/CI.
- Use deployment logs for rapid debugging: `npx wrangler pages deployment tail ...` (see Wrangler Commands docs).
- KV bindings are name-sensitive: bindings must be named exactly `GG_SESSION_KV` and `GG_LICENSE_KV`.
- Keep secrets out of logs: never print access tokens, client secrets, or license keys.
- Treat Notion OAuth as a one-time bootstrap per environment: once `/api/notion/status` shows connected, E2E runs can be fully automated.

---

## PHASE 2 — Automation & scale (only after Phase 1 is green)

### P2.1 Auto-posting / automation
- Scheduling, safe rate limits, hard gate enforcement, rollback.

### P2.2 Scaling & caching
- Snapshot TTL refresh, queues/workers, concurrency control, performance budgets.

### P2.3 Advanced 3D AI experience
- 3D hero + AI textures + progressive enhancement + deterministic fallbacks.

### P2.4 Analytics & auditing
- Audit logs, license usage analytics, conversion tracking, support telemetry.
latform/limits/ ; https://developers.cloudflare.com/d1/platform/pricing/

---

## Next session start-here (handoff note)

### Current state
- Foreman Agent runner exists (`scripts/foreman.mjs`) and is wired in `package.json` (`npm run foreman`, `foreman:build`, `foreman:watch`).
- Repo model selection is env-driven via `GEMINI_MODEL_DEFAULT` (recommended default: `gemini-3-flash-preview`).
- Chat UX: compact sticky chatbar above preview, auto-expands below preview sentinel; Debug tab exists in chat.
- Debug Trace: backend returns `meta.traceId` from `/api/chat/orchestrate` when `AGENT_TRACE_ENABLED=true`, traces stored under `production-test/logs/`.
- Docker MCP Toolkit enabled servers (local): `ast-grep`, `semgrep`, `git` (in addition to existing core servers like `fetch`, `filesystem`, `playwright`).
- Git repo initialized locally: `git init`.
- GitHub CLI installed and accessible on the local machine: `gh`.

### Recent work completed (this session)
1) **NOTION_TEMPLATES generation variants (gumgenie-app)**
   - `POST /api/generate` now supports `variant: "standard" | "premium"`.
   - Premium adds extra onboarding sections (Quick Wins + Troubleshooting + Operating Rules).
   - Still deterministic and still preserves the safety rule: **mark license used only after full success**.

2) **Gemini Image MCP integrated into backend MCP registry (via adapter)**
   - `backend/mcpHttpServers.ts` now includes `gemini-image` in `/api/mcp-http/servers`.
   - `backend/server.ts` added `POST /api/mcp-http-adapter/gemini-image` (MCP JSON-RPC over HTTP → calls local gemini-image-mcp REST server).
   - `.env.example` now includes `GEMINI_IMAGE_MCP_BASE_URL` (default `http://localhost:3102`) and `MCP_ADAPTER_BASE_URL` (optional).
   - Safety: adapter responses are text-only and should never include base64 image blobs.

### Known remaining work (next agent)
A) **Gemini Image MCP polish** (still in progress)
- Tighten adapter output to always return a stable `id` and **absolute URLs** (service currently returns relative URLs like `/images/<id>`).
- Add `gemini-image` into the **frontend Library MCP selector** (so UI can list tools/call it).
- Run a sample workflow end-to-end (servers → tools → call generate → surface URL in UI).

B) **NOTION_TEMPLATES end-to-end completion** (still in progress)
- Confirm both variants produce the expected Notion page content (Start Here + Dashboard blocks) in real Notion accounts.

### Live Session Todo List (Phase 1 / Phase 2)

**PHASE 1 — Production readiness**
- (in progress) Activation gating: verify+generate stable contracts; safe retries; mark-used only after full success.
- (completed) Observability/provenance: runId envelopes + consistent error shapes.
- (pending) Quality gate: required sections; no placeholders; 80+ rubric.
- (in progress) NOTION_TEMPLATES: standard/premium variants; Notion build pages+dbs+blocks; E2E verification.
- (pending) AI_PROMPTS: ZIP deliverable generator + publish-ready assets.
- (pending) DIGITAL_PLANNERS: PDF/ZIP deliverable generator + publish-ready assets.
- (pending) DESIGN_TEMPLATES: ZIP/assets deliverable generator + publish-ready assets.
- (pending) Gumroad publishing integration: product create + attach deliverables.
- (in progress) Gemini Image MCP: stable id/absolute URL + frontend selector + sample workflow.
- (pending) End-to-end production confirmation: activation→generate→publish for all 4 categories (+ variants).

**PHASE 1 — Option B (Wrangler-first) local deploy tasks**
- (completed) Wrangler auth + project create + initial deploy.
- (in progress) KV bindings + env vars configured in Pages project.
- (blocked) Pages Functions routing via `wrangler pages deploy .` (repo root) — **do not use**; it serves static HTML for `/api/*`.
- (in progress) Preferred approach: deploy a build output containing `_worker.js` + `_routes.json` so `/api/*` is routed correctly.

**PHASE 2 — Automation & scale (blocked until Phase 1 green)**
- Auto-posting/automation.
- Scaling/caching.
- Advanced 3D AI experience.
- Analytics/auditing.

### Immediate next actions
1) Confirm `npm run foreman` is green (lint + typecheck).
2) If backend/core changes are made, run `npm run foreman:build` and smoke:
   - `GET /api/mcp-stdio/servers`
   - `POST /api/chat/orchestrate` (ask)
   - `POST /api/agents/generate`
   - `POST /api/agents/research`
3) For local Cloudflare deploy + E2E smoke (Option B), follow **P1.7 Local Cloudflare deploy automation (Wrangler-first)** in this doc.

### Local dev gotchas (backend)
- Do **not** run `node backend/server.ts` directly (it is TypeScript and will fail module resolution).
- Use the repo scripts which run via `tsx`:
  - `npm run backend:dev`
  - `npm run dev:full`
- If you hit odd runtime/module issues on Node v24, use Node **20 LTS** for best compatibility.

3) Gemini Image MCP smoke (backend)
- Ensure the container is running:
  - `docker ps | findstr gemini-image-mcp`
- Start backend:
  - `npm run backend:dev`
- Validate registry includes `gemini-image`:
  - `Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/mcp-http/servers" | ConvertTo-Json -Depth 6`
- List tools:
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-http/tools" -ContentType "application/json" -Body '{"serverId":"gemini-image"}' | ConvertTo-Json -Depth 10`
- Call generate (ensure response has **no** `data:image`):
  - `Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/mcp-http/call" -ContentType "application/json" -Body '{"serverId":"gemini-image","toolName":"gemini_image.generate","args":{"prompt":"Minimal abstract gradient, no text","width":256,"height":256}}' | ConvertTo-Json -Depth 10`

4) gumgenie-app NOTION_TEMPLATES variant usage (Cloudflare Pages Functions)
- Standard:
  - Body includes `"variant":"standard"`
- Premium:
  - Body includes `"variant":"premium"`

5) Deep-dive market extraction (optional)
- `npm run validate:deep` uses SerpAPI discovery + `muhammetakkurtt/gumroad-scraper` for detail (30 competitors/category).
- Reviews are skipped unless `APIFY_GUMROAD_REVIEWS_ACTOR_ID` points to a rented reviews actor.

6) Agent Squad (V2.3) status
- Implemented: `/api/agents/generate` (Orchestrator + Strategist + Monetization + Copy + Visual via Gemini, merged output, fallbacks)
- Implemented: `/api/agents/research` (snapshot load + placeholder; returns cached/missing)
- Implemented: frontend uses `/api/agents/generate` for generation and Sidebar shows Market Data badge + Refresh (calls `/api/agents/research`).

---

## House rules for contributors
- Keep changes small and typed; avoid introducing `any` unless necessary.
- When modifying AI output shape, update: prompt → schema → types → UI.
- Avoid putting secrets in committed files; `.env.local` is ignored.
- Prefer running `npm run lint` before committing.
