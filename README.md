# Family Dinners

Weekly meal planner that asks Claude to design a full week of dinners — main + vegetable side, with full recipes, shopping list, and feedback handling. React frontend, Express + Anthropic SDK backend, Docker for deployment, optional Todoist sync so the shopping list goes with you to the store.

## What it does

- **Generates a 6-day plan** (Sun–Thu mains, Fri leftovers) — each day has a main + a vegetable side that runs in parallel.
- **Respects family constraints** — time caps per night, picky kid, weekly themes (Tuesday tacos, Wednesday international rotation, Thursday noodles).
- **Pantry-aware** — prefers meals that use what's already on hand.
- **Learns over time** — `❤ Loved` and `Too hard` buttons update preferences so future weeks weight meals in or out.
- **One-tap swap** — replace any single day without regenerating the whole week.
- **Editable recipes** — view + edit full ingredients/steps for both main and side.
- **Shopping list** — auto-generated, deduped across days, with optional **Send to Todoist** so it syncs to your phone.
- **Weekly cron** — macOS LaunchAgent auto-generates the new week every Monday at 8am.

## Architecture

```
backend/         Express + Anthropic SDK. REST API + serves the built React app.
frontend/        Vite + React. Tabs for the week, shopping list, pantry, prefs.
data/            pantry.json, history.json, preferences.json — bind-mounted into the container.
launchd/         macOS LaunchAgent that runs the weekly planner inside the container.
Dockerfile       Multi-stage: builds the React app, installs backend prod deps, runs Node.
```

The container exposes port **3001** and serves both `/api/*` (the backend) and the static React app from the same Express process.

## Setup

### 1. Add your Anthropic API key

```bash
cp .env.example .env
# edit .env and paste your ANTHROPIC_API_KEY
```

Get a key at https://console.anthropic.com/.

### 2. Start the container

```bash
docker compose up -d --build
```

Open http://localhost:3001 on your Mac. Family devices on the same Wi-Fi can use `http://<your-mac-hostname>.local:3001` (e.g. `http://henrys-mbp.local:3001`).

If you don't know your hostname:
```bash
scutil --get LocalHostName
```

### 3. (Optional) Schedule the weekly auto-generate

```bash
./launchd/install.sh
```

This installs a LaunchAgent that runs the planner inside the container every Monday at 8 AM. It writes the new plan to `data/history.json`, which the React app picks up on next refresh.

Manually trigger anytime:
```bash
launchctl kickstart -k gui/$(id -u)/com.henry.dinners.weekly
```

Logs: `logs/cron.out.log` and `logs/cron.err.log`.

## Day-to-day

- **Open the app** → see this week's plan and shopping list.
- **❤ Loved / Too hard** buttons → automatically update `preferences.json` so future weeks weight that meal in or out.
- **Swap** → asks Claude for a new pick for that day only, respecting time caps and the rest of the week.
- **Recipe button** → view + edit the full recipe (ingredients, steps, notes). Edits save into `history.json`.
- **Pantry / Preferences tabs** → edit what's on hand and family quirks; future plans take these into account.
- **Send to Todoist** (on the Shopping tab) → pushes "Buy this week" + "Check stock" into a `Groceries` project, with a new section per week. Sync handles the rest — open Todoist on your phone at the store. Requires `TODOIST_API_TOKEN` in `.env` (token at https://app.todoist.com/app/settings/integrations/developer). The project name is configurable via `TODOIST_PROJECT_NAME` (defaults to "Groceries"); it's created on first push if it doesn't exist.

## API quick reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | Pantry, history, preferences, currentPlan, weekOf |
| POST | `/api/plan/generate` | Generate this week's plan (body: `{ instruction? }`) |
| POST | `/api/plan/swap` | Swap one day (body: `{ day, reason? }`) |
| POST | `/api/plan/feedback` | Record feedback (body: `{ day, feedback }`) |
| PUT | `/api/plan/recipe` | Save an edited recipe (body: `{ day, meal }`) |
| POST | `/api/shopping/push-to-todoist` | Push current shopping list to Todoist as a new section under `TODOIST_PROJECT_NAME` |
| GET/PUT | `/api/pantry` | Read/replace pantry items |
| GET/PUT | `/api/preferences` | Read/replace likes, dislikes, notes |

## Local development (without Docker)

```bash
# terminal 1 — backend
cd backend && ANTHROPIC_API_KEY=sk-ant-... DATA_DIR=../data npm run dev

# terminal 2 — frontend
cd frontend && npm run dev
# open http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:3001`.

## Data files

All state lives in `data/`. Safe to back up, edit by hand, or commit (excluding `preferences.json` if it contains anything you'd rather not share).

- `pantry.json` — `{ "items": ["Mushrooms", ...] }`
- `preferences.json` — `{ "liked": [...], "disliked": [...], "notes": "..." }`
- `history.json` — `{ "weeks": [{ "weekOf", "meals", "shopping", "feedback" }, ...] }`

## Cost

Each weekly generation is a single Claude call (~3–5k output tokens) plus optional swaps. On Sonnet 4.6 a full week costs roughly a few cents.
