const BASE = "/api";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  state: () => req("/state"),
  generate: (instruction) => req("/plan/generate", { method: "POST", body: JSON.stringify({ instruction }) }),
  swap: (day, reason, weekOf) => req("/plan/swap", { method: "POST", body: JSON.stringify({ day, reason, weekOf }) }),
  feedback: (day, { rating, notes }, weekOf) => req("/plan/feedback", { method: "POST", body: JSON.stringify({ day, rating, notes, weekOf }) }),
  saveRecipe: (day, meal, weekOf) => req("/plan/recipe", { method: "PUT", body: JSON.stringify({ day, meal, weekOf }) }),
  savePantry: (items) => req("/pantry", { method: "PUT", body: JSON.stringify({ items }) }),
  savePreferences: (prefs) => req("/preferences", { method: "PUT", body: JSON.stringify(prefs) }),
  pushToTodoist: (weekOf) => req("/shopping/push-to-todoist", { method: "POST", body: JSON.stringify({ weekOf }) }),
};
