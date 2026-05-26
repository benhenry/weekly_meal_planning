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

// Find the target week in history. If weekOf is omitted, defaults to the latest.
// Returns { plan, weeks } or null when no match exists.
function findWeek(history, weekOf) {
  const weeks = history.weeks || [];
  if (!weeks.length) return null;
  if (!weekOf) return { plan: weeks[weeks.length - 1], weeks };
  const plan = weeks.find((w) => w.weekOf === weekOf);
  return plan ? { plan, weeks } : null;
}

app.post("/api/plan/swap", async (req, res, next) => {
  try {
    const { day, reason, weekOf } = req.body || {};
    if (!day) return res.status(400).json({ error: "day is required" });
    const { pantry, history, preferences } = await storage.getAll();
    const target = findWeek(history, weekOf);
    if (!target) return res.status(400).json({ error: "no plan found for that week" });

    const today = currentWeekOf();
    if (target.plan.weekOf !== today) {
      return res.status(400).json({ error: "swap is only allowed on the current week" });
    }

    const newMeal = await swapMeal({
      pantry, history, preferences,
      weekOf: target.plan.weekOf, day, currentPlan: target.plan, reason,
    });
    target.plan.meals[day] = newMeal;
    await storage.setHistory({ weeks: target.weeks });
    res.json({ plan: target.plan });
  } catch (e) { next(e); }
});

app.post("/api/plan/feedback", async (req, res, next) => {
  try {
    const { day, rating, notes, weekOf } = req.body || {};
    if (!day) return res.status(400).json({ error: "day required" });
    if (rating === undefined && (notes === undefined || notes === "")) {
      return res.status(400).json({ error: "rating or notes required" });
    }
    const history = await storage.getHistory();
    const target = findWeek(history, weekOf);
    if (!target) return res.status(400).json({ error: "no plan found for that week" });
    const current = target.plan;
    current.feedback = current.feedback || {};

    const prior = current.feedback[day];
    const priorObj = typeof prior === "string" ? { rating: prior, notes: "" } : (prior || { rating: null, notes: "" });
    current.feedback[day] = {
      rating: rating !== undefined ? rating : priorObj.rating,
      notes: notes !== undefined ? notes : priorObj.notes,
    };

    const mealName = current.meals?.[day]?.name;
    if (mealName && rating) {
      const prefs = await storage.getPreferences();
      const liked = new Set(prefs.liked || []);
      const disliked = new Set(prefs.disliked || []);
      if (rating === "loved") { liked.add(mealName); disliked.delete(mealName); }
      else if (rating === "too-complicated" || rating === "disliked") {
        disliked.add(mealName); liked.delete(mealName);
      }
      await storage.setPreferences({ ...prefs, liked: [...liked], disliked: [...disliked] });
    }
    await storage.setHistory({ weeks: target.weeks });
    res.json({ plan: current });
  } catch (e) { next(e); }
});

app.put("/api/plan/recipe", async (req, res, next) => {
  try {
    const { day, meal, weekOf } = req.body || {};
    if (!day || !meal) return res.status(400).json({ error: "day and meal required" });
    const history = await storage.getHistory();
    const target = findWeek(history, weekOf);
    if (!target) return res.status(400).json({ error: "no plan found for that week" });
    target.plan.meals[day] = { ...target.plan.meals[day], ...meal };
    await storage.setHistory({ weeks: target.weeks });
    res.json({ plan: target.plan });
  } catch (e) { next(e); }
});

app.post("/api/shopping/push-to-todoist", async (req, res, next) => {
  try {
    const { weekOf } = req.body || {};
    const history = await storage.getHistory();
    const target = findWeek(history, weekOf);
    if (!target) return res.status(400).json({ error: "no plan found for that week" });
    if (!target.plan.shopping) return res.status(400).json({ error: "plan has no shopping list" });
    const result = await pushShoppingList({ shopping: target.plan.shopping, weekOf: target.plan.weekOf });
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
