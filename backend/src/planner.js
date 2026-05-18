import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic();
  }
  return client;
}

const PLAN_SCHEMA = `Return ONLY valid JSON matching this exact shape, no markdown fences, no prose:

{
  "weekOf": "YYYY-MM-DD",
  "meals": {
    "Sun": {
      "name": "...", "cuisine": "...", "timeMin": 75, "pantryUsed": ["..."], "kidFriendly": true,
      "recipe": { "servings": 3, "ingredients": [{"item": "...", "quantity": "..."}], "steps": ["...", "..."], "notes": "..." },
      "side": { "name": "Roasted broccoli with lemon", "timeMin": 20, "ingredients": [{"item": "Broccoli", "quantity": "1 large head"}], "steps": ["...", "..."] }
    },
    "Mon": { ... same shape including "side" ... },
    "Tue": { ... },
    "Wed": { ... },
    "Thu": { ... },
    "Fri": {
      "name": "Leftovers", "cuisine": "—", "timeMin": 15, "pantryUsed": [], "kidFriendly": true,
      "recipe": { "servings": 3, "ingredients": [], "steps": ["Reheat Sunday or Wednesday remix"], "notes": "Suggest a remix idea" },
      "side": { "name": "Simple green salad", "timeMin": 5, "ingredients": [{"item": "Mixed greens", "quantity": "1 bag"}], "steps": ["Toss with olive oil, lemon, salt"] }
    }
  },
  "shopping": {
    "buyThisWeek": [{"item": "...", "quantity": "...", "neededDays": ["Mon"]}],
    "checkStock": ["Tortillas", "Garlic", "Onions", "Limes", "Olive oil", "Soy sauce", "Rice", "Chicken stock", "Eggs", "Butter", "Canned tomatoes"]
  },
  "headerNote": "optional one-line note about constraints applied this week"
}`;

const RECIPE_RULES = `Hard constraints:
- Every day MUST include both a "recipe" (main) AND a "side" (vegetable side dish). No exceptions, including Friday.
- timeMin caps apply to the MAIN. The side should be quick (typically 5–25 min) and runnable in parallel with the main. Sun ≤ 90 min; Mon ≤ 40 min; Tue ≤ 35 min (always tacos, vary protein); Wed ≤ 45 min; Thu ≤ 40 min
- No meal from disliked list; weight liked meals higher if not served in last 4 weeks
- Prefer pantry-first picks; flag kidFriendly:false only if it's adult-leaning
- Friday is leftovers — do not invent a new main, but DO pick a fresh light side (salad, crudités, quick roasted veg)
- Each main recipe: 3-8 ingredients with quantities, 3-8 numbered steps, servings: 3
- Each side: 2-6 ingredients with quantities, 2-5 numbered steps
- Sides should be vegetable-forward: roasted veggies, simple salads, sautéed greens, slaw, cucumber salad, etc. Vary across the week — don't repeat the same vegetable or technique two days in a row.
- Tuesday tacos: side can be the standard taco bar (slaw, pico, guac) OR a separate veggie side — your call
- SHOPPING LIST MUST INCLUDE INGREDIENTS FROM BOTH mains AND sides. Dedupe across days; note which days each ingredient is needed.
- Past feedback notes from the family are LOAD-BEARING context. Read them carefully. A note like "kid loved the broccoli" → pick more cruciferous sides. A note like "main was bland" → pick mains with bolder flavor profiles. A note like "took 70 min not 40" → pick a lower-difficulty main in that slot. Do not ignore them.`;

function buildSystemPrompt() {
  return `You are a weekly meal planner for a family of 3 (two adults + a picky 8-year-old).
${RECIPE_RULES}

${PLAN_SCHEMA}`;
}

function normalizeFeedback(f) {
  if (!f) return null;
  if (typeof f === "string") return { rating: f, notes: "" };
  return { rating: f.rating || null, notes: f.notes || "" };
}

function recentWithFeedback(history) {
  return (history.weeks || []).slice(-3).map((w) => ({
    weekOf: w.weekOf,
    meals: Object.entries(w.meals || {}).map(([day, m]) => {
      const fb = normalizeFeedback(w.feedback?.[day]);
      const entry = { day, name: m.name, side: m.side?.name || null };
      if (fb && (fb.rating || fb.notes)) entry.feedback = fb;
      return entry;
    }),
  }));
}

function buildUserPrompt({ pantry, history, preferences, weekOf, instruction }) {
  const recent = recentWithFeedback(history);
  return `Today's plan target weekOf: ${weekOf}

Pantry items currently on hand:
${JSON.stringify(pantry.items, null, 2)}

Preferences:
- liked: ${JSON.stringify(preferences.liked)}
- disliked: ${JSON.stringify(preferences.disliked)}
- notes: ${preferences.notes || "(none)"}

Recent meals and family feedback (avoid repeating, but USE THE NOTES to inform new picks — if a note says "kid loved the broccoli but main was bland", weight similar sides up and bump up the seasoning on similar mains):
${JSON.stringify(recent, null, 2)}

Additional instruction from user:
${instruction || "Generate the standard weekly plan."}`;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generatePlan({ pantry, history, preferences, weekOf, instruction }) {
  const anthropic = getClient();
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserPrompt({ pantry, history, preferences, weekOf, instruction }) }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return extractJson(text);
}

export async function swapMeal({ pantry, history, preferences, weekOf, day, currentPlan, reason }) {
  const anthropic = getClient();
  const current = currentPlan.meals?.[day];
  const priorFeedback = normalizeFeedback(currentPlan.feedback?.[day]);
  const recent = recentWithFeedback(history);
  const sys = `You replace a single day's dinner in an existing weekly plan. Return ONLY a JSON object with this shape:
{
  "name": "...", "cuisine": "...", "timeMin": 35, "pantryUsed": ["..."], "kidFriendly": true,
  "recipe": { "servings": 3, "ingredients": [{"item":"...","quantity":"..."}], "steps":["..."], "notes":"..." },
  "side": { "name": "...", "timeMin": 15, "ingredients": [{"item":"...","quantity":"..."}], "steps":["..."] }
}

Rules:
- Respect time caps for the main (Sun 90 / Mon 40 / Tue 35 / Wed 45 / Thu 40); side typically 5–25 min runnable in parallel.
- Always include both "recipe" and "side". Side must be vegetable-forward.
- Avoid disliked meals, avoid the current pick, prefer pantry items, Tuesday must still be tacos.
- Don't repeat a vegetable already used elsewhere in the week (you'll see other meals in the user message).`;
  const user = `Day to swap: ${day} (current pick: ${current?.name || "(none)"}${current?.side?.name ? ` + side: ${current.side.name}` : ""})
Reason from user: ${reason || "(no reason given; just want a different pick)"}
${priorFeedback ? `Existing feedback recorded for this meal: ${JSON.stringify(priorFeedback)}` : ""}

Pantry: ${JSON.stringify(pantry.items)}
Liked: ${JSON.stringify(preferences.liked)}
Disliked: ${JSON.stringify(preferences.disliked)}
Family notes: ${preferences.notes}

Other meals this week (do not duplicate, and don't pick a side using the same hero vegetable):
${JSON.stringify(
    Object.entries(currentPlan.meals || {})
      .filter(([d]) => d !== day)
      .map(([d, m]) => ({ day: d, name: m.name, side: m.side?.name }))
  )}

Recent meals + feedback (learn from notes):
${JSON.stringify(recent)}`;
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: sys,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return extractJson(text);
}
