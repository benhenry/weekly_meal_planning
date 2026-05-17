import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { storage, currentWeekOf } from "./storage.js";
import { generatePlan, swapMeal } from "./planner.js";
import { pushShoppingList } from "./todoist.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 3001);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/state", async (_req, res, next) => {
  try {
    const state = await storage.getAll();
    const weeks = state.history.weeks || [];
    const currentPlan = weeks.length ? weeks[weeks.length - 1] : null;
    res.json({ ...state, currentPlan, weekOf: currentWeekOf() });
  } catch (e) { next(e); }
});

app.post("/api/plan/generate", async (req, res, next) => {
  try {
    const { instruction } = req.body || {};
    const { pantry, history, preferences } = await storage.getAll();
    const weekOf = currentWeekOf();
    const plan = await generatePlan({ pantry, history, preferences, weekOf, instruction });
    plan.weekOf = plan.weekOf || weekOf;
    plan.feedback = plan.feedback || {};
    const weeks = history.weeks || [];
    const existingIdx = weeks.findIndex((w) => w.weekOf === plan.weekOf);
    if (existingIdx >= 0) weeks[existingIdx] = plan; else weeks.push(plan);
    await storage.setHistory({ weeks });
    res.json({ plan });
  } catch (e) { next(e); }
});

app.post("/api/plan/swap", async (req, res, next) => {
  try {
    const { day, reason } = req.body || {};
    if (!day) return res.status(400).json({ error: "day is required" });
    const { pantry, history, preferences } = await storage.getAll();
    const weeks = history.weeks || [];
    if (!weeks.length) return res.status(400).json({ error: "no current plan" });
    const currentPlan = weeks[weeks.length - 1];
    const newMeal = await swapMeal({
      pantry, history, preferences,
      weekOf: currentPlan.weekOf, day, currentPlan, reason,
    });
    currentPlan.meals[day] = newMeal;
    await storage.setHistory({ weeks });
    res.json({ plan: currentPlan });
  } catch (e) { next(e); }
});

app.post("/api/plan/feedback", async (req, res, next) => {
  try {
    const { day, feedback } = req.body || {};
    if (!day || !feedback) return res.status(400).json({ error: "day and feedback required" });
    const history = await storage.getHistory();
    const weeks = history.weeks || [];
    if (!weeks.length) return res.status(400).json({ error: "no current plan" });
    const current = weeks[weeks.length - 1];
    current.feedback = current.feedback || {};
    current.feedback[day] = feedback;

    const mealName = current.meals?.[day]?.name;
    if (mealName) {
      const prefs = await storage.getPreferences();
      const liked = new Set(prefs.liked || []);
      const disliked = new Set(prefs.disliked || []);
      if (feedback === "loved") { liked.add(mealName); disliked.delete(mealName); }
      else if (feedback === "too-complicated" || feedback === "disliked") {
        disliked.add(mealName); liked.delete(mealName);
      }
      await storage.setPreferences({ ...prefs, liked: [...liked], disliked: [...disliked] });
    }
    await storage.setHistory({ weeks });
    res.json({ plan: current });
  } catch (e) { next(e); }
});

app.put("/api/plan/recipe", async (req, res, next) => {
  try {
    const { day, meal } = req.body || {};
    if (!day || !meal) return res.status(400).json({ error: "day and meal required" });
    const history = await storage.getHistory();
    const weeks = history.weeks || [];
    if (!weeks.length) return res.status(400).json({ error: "no current plan" });
    const current = weeks[weeks.length - 1];
    current.meals[day] = { ...current.meals[day], ...meal };
    await storage.setHistory({ weeks });
    res.json({ plan: current });
  } catch (e) { next(e); }
});

app.post("/api/shopping/push-to-todoist", async (_req, res, next) => {
  try {
    const history = await storage.getHistory();
    const weeks = history.weeks || [];
    if (!weeks.length) return res.status(400).json({ error: "no current plan" });
    const current = weeks[weeks.length - 1];
    if (!current.shopping) return res.status(400).json({ error: "current plan has no shopping list" });
    const result = await pushShoppingList({ shopping: current.shopping, weekOf: current.weekOf });
    res.json(result);
  } catch (e) { next(e); }
});

app.get("/api/pantry", async (_req, res, next) => {
  try { res.json(await storage.getPantry()); } catch (e) { next(e); }
});
app.put("/api/pantry", async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    res.json(await storage.setPantry({ items }));
  } catch (e) { next(e); }
});

app.get("/api/preferences", async (_req, res, next) => {
  try { res.json(await storage.getPreferences()); } catch (e) { next(e); }
});
app.put("/api/preferences", async (req, res, next) => {
  try {
    const { liked = [], disliked = [], notes = "" } = req.body || {};
    res.json(await storage.setPreferences({ liked, disliked, notes }));
  } catch (e) { next(e); }
});

// Serve the built React app from STATIC_DIR if present (Docker production mode).
const STATIC_DIR = process.env.STATIC_DIR ? resolve(process.env.STATIC_DIR) : null;
if (STATIC_DIR && existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(join(STATIC_DIR, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: err.message || "internal error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`dinners backend listening on http://0.0.0.0:${PORT}`);
});
