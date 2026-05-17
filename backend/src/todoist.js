const BASE = "https://api.todoist.com/api/v1";
const PROJECT_NAME = process.env.TODOIST_PROJECT_NAME || "Groceries";

function getToken() {
  const t = process.env.TODOIST_API_TOKEN;
  if (!t) throw new Error("TODOIST_API_TOKEN is not set");
  return t;
}

async function todoist(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Todoist ${res.status}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function findOrCreateProject(name) {
  // v1 uses cursor pagination: { results: [...], next_cursor }. v2 returned a flat array.
  // Tolerate both. For a personal account, the first page contains all projects.
  const res = await todoist("/projects");
  const projects = Array.isArray(res) ? res : (res?.results || []);
  const found = projects.find((p) => p.name === name);
  if (found) return found;
  return todoist("/projects", { method: "POST", body: JSON.stringify({ name }) });
}

async function createSection(name, projectId) {
  return todoist("/sections", {
    method: "POST",
    body: JSON.stringify({ name, project_id: projectId }),
  });
}

function formatItem(entry) {
  if (typeof entry === "string") return entry;
  const qty = entry.quantity ? ` — ${entry.quantity}` : "";
  return `${entry.item}${qty}`;
}

export async function pushShoppingList({ shopping, weekOf }) {
  if (!shopping) throw new Error("no shopping list to push");
  const project = await findOrCreateProject(PROJECT_NAME);
  const sectionName = `Week of ${weekOf || new Date().toISOString().slice(0, 10)}`;
  const section = await createSection(sectionName, project.id);

  const items = [
    ...(shopping.buyThisWeek || []).map(formatItem),
    ...(shopping.checkStock || []).map(formatItem),
  ];

  // Sequential to keep task order stable in Todoist; the list is small (<30 items).
  const created = [];
  for (const content of items) {
    const task = await todoist("/tasks", {
      method: "POST",
      body: JSON.stringify({ content, project_id: project.id, section_id: section.id }),
    });
    created.push({ id: task.id, content });
  }

  return {
    project: { id: project.id, name: project.name, url: project.url },
    section: { id: section.id, name: section.name },
    tasksCreated: created.length,
  };
}
