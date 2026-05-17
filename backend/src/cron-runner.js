import { storage, currentWeekOf } from "./storage.js";
import { generatePlan } from "./planner.js";

async function main() {
  const start = Date.now();
  console.log(`[cron] starting weekly plan generation at ${new Date().toISOString()}`);
  const { pantry, history, preferences } = await storage.getAll();
  const weekOf = currentWeekOf();
  const plan = await generatePlan({ pantry, history, preferences, weekOf });
  plan.weekOf = plan.weekOf || weekOf;
  plan.feedback = plan.feedback || {};
  const weeks = history.weeks || [];
  const idx = weeks.findIndex((w) => w.weekOf === plan.weekOf);
  if (idx >= 0) weeks[idx] = plan; else weeks.push(plan);
  await storage.setHistory({ weeks });
  console.log(`[cron] saved plan for week ${plan.weekOf} in ${Date.now() - start}ms`);
}

main().catch((err) => {
  console.error("[cron] failed:", err);
  process.exit(1);
});
