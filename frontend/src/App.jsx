import { useEffect, useState } from "react";
import { api } from "./api.js";
import WeekView from "./components/WeekView.jsx";
import ShoppingList from "./components/ShoppingList.jsx";
import PantryEditor from "./components/PantryEditor.jsx";
import PreferencesEditor from "./components/PreferencesEditor.jsx";
import RecipeEditor from "./components/RecipeEditor.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";
import SwapModal from "./components/SwapModal.jsx";
import WeekPicker from "./components/WeekPicker.jsx";

const TABS = [
  { id: "week", label: "This Week" },
  { id: "shopping", label: "Shopping" },
  { id: "pantry", label: "Pantry" },
  { id: "prefs", label: "Preferences" },
];

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("week");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [swapFor, setSwapFor] = useState(null);
  const [selectedWeekOf, setSelectedWeekOf] = useState(null);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const refresh = async () => {
    try {
      const s = await api.state();
      setState(s);
      setError(null);
      // Default to the latest week if nothing is selected yet.
      if (selectedWeekOf == null) {
        setSelectedWeekOf(s.currentPlan?.weekOf || null);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { refresh(); }, []);

  const weeks = state?.history?.weeks || [];
  const selectedPlan = selectedWeekOf
    ? weeks.find((w) => w.weekOf === selectedWeekOf) || state?.currentPlan
    : state?.currentPlan;
  const calendarWeekOf = state?.weekOf;
  const isViewingCurrent = selectedPlan?.weekOf === calendarWeekOf;

  const wrap = async (label, fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      flash(label);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Merge an updated plan (returned from any endpoint) back into history.weeks by weekOf.
  const mergePlan = (s, plan) => {
    const rest = (s.history.weeks || []).filter((w) => w.weekOf !== plan.weekOf);
    const next = [...rest, plan].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
    const isLatest = next[next.length - 1].weekOf === plan.weekOf;
    return { ...s, history: { weeks: next }, currentPlan: isLatest ? plan : s.currentPlan };
  };

  const handleGenerate = (instruction) => wrap("Plan saved", async () => {
    const { plan } = await api.generate(instruction);
    setState((s) => mergePlan(s, plan));
    setSelectedWeekOf(plan.weekOf);
  });

  const handleSwap = (day, reason) => wrap(`Swapped ${day}`, async () => {
    const { plan } = await api.swap(day, reason, selectedPlan?.weekOf);
    setState((s) => mergePlan(s, plan));
    setSwapFor(null);
  });

  const handleFeedback = (day, payload) => wrap("Feedback saved", async () => {
    const { plan } = await api.feedback(day, payload, selectedPlan?.weekOf);
    setState((s) => mergePlan(s, plan));
    setFeedbackFor(null);
  });

  const handleSaveRecipe = (day, meal) => wrap("Recipe saved", async () => {
    const { plan } = await api.saveRecipe(day, meal, selectedPlan?.weekOf);
    setState((s) => mergePlan(s, plan));
    setEditing(null);
  });

  const handleSavePantry = (items) => wrap("Pantry saved", async () => {
    const updated = await api.savePantry(items);
    setState((s) => ({ ...s, pantry: updated }));
  });

  const handleSavePreferences = (prefs) => wrap("Preferences saved", async () => {
    const updated = await api.savePreferences(prefs);
    setState((s) => ({ ...s, preferences: updated }));
  });

  const handlePushToTodoist = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.pushToTodoist(selectedPlan?.weekOf);
      flash(`Sent ${result.tasksCreated} items to Todoist · ${result.section.name}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return <main><div className="empty">Loading…</div></main>;
  }

  return (
    <>
      <header>
        <div>
          <h1>🍽 Family Dinners</h1>
          {weeks.length > 0 ? (
            <WeekPicker
              weeks={weeks}
              selectedWeekOf={selectedWeekOf}
              currentWeekOf={calendarWeekOf}
              onSelect={setSelectedWeekOf}
            />
          ) : (
            <div className="sub">No plans yet — generate the first one →</div>
          )}
        </div>
        <button className="primary" disabled={busy} onClick={() => handleGenerate()}>
          {busy
            ? "Working…"
            : !weeks.length
              ? "Generate this week"
              : isViewingCurrent
                ? "Regenerate this week"
                : "Generate current week"}
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {error && <div className="error">{error}</div>}

        {tab === "week" && (
          <WeekView
            plan={selectedPlan}
            busy={busy}
            readOnlySwap={!isViewingCurrent}
            onSwap={(day) => setSwapFor(day)}
            onFeedback={(day) => setFeedbackFor(day)}
            onEditRecipe={(day) => setEditing(day)}
            onGenerate={handleGenerate}
          />
        )}
        {tab === "shopping" && (
          <ShoppingList plan={selectedPlan} busy={busy} onPushToTodoist={handlePushToTodoist} />
        )}
        {tab === "pantry" && <PantryEditor items={state.pantry.items || []} onSave={handleSavePantry} />}
        {tab === "prefs" && <PreferencesEditor prefs={state.preferences} onSave={handleSavePreferences} />}
      </main>

      {editing && selectedPlan?.meals?.[editing] && (
        <RecipeEditor
          day={editing}
          meal={selectedPlan.meals[editing]}
          onClose={() => setEditing(null)}
          onSave={(meal) => handleSaveRecipe(editing, meal)}
        />
      )}

      {feedbackFor && selectedPlan?.meals?.[feedbackFor] && (
        <FeedbackModal
          day={feedbackFor}
          meal={selectedPlan.meals[feedbackFor]}
          existing={selectedPlan.feedback?.[feedbackFor]}
          onClose={() => setFeedbackFor(null)}
          onSave={(payload) => handleFeedback(feedbackFor, payload)}
        />
      )}

      {swapFor && selectedPlan?.meals?.[swapFor] && isViewingCurrent && (
        <SwapModal
          day={swapFor}
          meal={selectedPlan.meals[swapFor]}
          onClose={() => setSwapFor(null)}
          onSwap={(reason) => handleSwap(swapFor, reason)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
