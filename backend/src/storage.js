import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "..", "data");

const FILES = {
  pantry: join(DATA_DIR, "pantry.json"),
  history: join(DATA_DIR, "history.json"),
  preferences: join(DATA_DIR, "preferences.json"),
};

const DEFAULTS = {
  pantry: { items: [] },
  history: { weeks: [] },
  preferences: { liked: [], disliked: [], notes: "" },
};

async function readJson(path, fallback) {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    throw err;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2));
}

export const storage = {
  async getPantry() {
    return readJson(FILES.pantry, DEFAULTS.pantry);
  },
  async setPantry(value) {
    await writeJson(FILES.pantry, value);
    return value;
  },
  async getHistory() {
    return readJson(FILES.history, DEFAULTS.history);
  },
  async setHistory(value) {
    await writeJson(FILES.history, value);
    return value;
  },
  async getPreferences() {
    return readJson(FILES.preferences, DEFAULTS.preferences);
  },
  async setPreferences(value) {
    await writeJson(FILES.preferences, value);
    return value;
  },
  async getAll() {
    const [pantry, history, preferences] = await Promise.all([
      this.getPantry(),
      this.getHistory(),
      this.getPreferences(),
    ]);
    return { pantry, history, preferences };
  },
};

export function currentWeekOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : -day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
