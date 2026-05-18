import { useEffect, useState } from "react";
import { api } from "./api.js";
import WeekView from "./components/WeekView.jsx";
import ShoppingList from "./components/ShoppingList.jsx";
import PantryEditor from "./components/PantryEditor.jsx";
import PreferencesEditor from "./components/PreferencesEditor.jsx";
import RecipeEditor from "./components/RecipeEditor.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";
import SwapModal from "./components/SwapModal.jsx";

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

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const refresh = async () => {
    try {
      const s = await api.state();
      setState(s);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { refresh(); }, []);

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

  const handleGenerate = (instruction) => wrap("Plan saved", async () => {
    const { plan } = await api.generate(instruction);
    setState((s) => ({ ...s, currentPlan: plan, history: { weeks: [...(s.history.weeks || []).filter((w) => w.weekOf !== plan.weekOf), plan] } }));
  });

  const handleSwap = (day, reason) => wrap(`Swapped ${day}`, async () => {
    const { plan } = await api.swap(day, reason);
    setState((s) => ({ ...s, currentPlan: plan }));
    setSwapFor(null);
  });

  const handleFeedback = (day, payload) => wrap("Feedback saved", async () => {
    const { plan } = await api.feedback(day, payload);
    setState((s) => ({ ...s, currentPlan: plan }));
    setFeedbackFor(null);
  });

  const handleSaveRecipe = (day, meal) => wrap("Recipe saved", async () => {
    const { plan } = await api.saveRecipe(day, meal);
    setState((s) => ({ ...s, currentPlan: plan }));
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
      const result = await api.pushToTodoist();
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
          <div className="sub">Week of {state.currentPlan?.weekOf || state.weekOf}</div>
        </div>
        <button className="primary" disabled={busy} onClick={() => handleGenerate()}>
          {busy ? "Working…" : state.currentPlan ? "Regenerate plan" : "Generate this week"}
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
            plan={state.currentPlan}
            busy={busy}
            onSwap={(day) => setSwapFor(day)}
            onFeedback={(day) => setFeedbackFor(day)}
            onEditRecipe={(day) => setEditing(day)}
            onGenerate={handleGenerate}
          />
        )}
        {tab === "shopping" && (
          <ShoppingList plan={state.currentPlan} busy={busy} onPushToTodoist={handlePushToTodoist} />
        )}
        {tab === "pantry" && <PantryEditor items={state.pantry.items || []} onSave={handleSavePantry} />}
        {tab === "prefs" && <PreferencesEditor prefs={state.preferences} onSave={handleSavePreferences} />}
      </main>

      {editing && state.currentPlan?.meals?.[editing] && (
        <RecipeEditor
          day={editing}
          meal={state.currentPlan.meals[editing]}
          onClose={() => setEditing(null)}
          onSave={(meal) => handleSaveRecipe(editing, meal)}
        />
      )}

      {feedbackFor && state.currentPlan?.meals?.[feedbackFor] && (
        <FeedbackModal
          day={feedbackFor}
          meal={state.currentPlan.meals[feedbackFor]}
          existing={state.currentPlan.feedback?.[feedbackFor]}
          onClose={() => setFeedbackFor(null)}
          onSave={(payload) => handleFeedback(feedbackFor, payload)}
        />
      )}

      {swapFor && state.currentPlan?.meals?.[swapFor] && (
        <SwapModal
          day={swapFor}
          meal={state.currentPlan.meals[swapFor]}
          onClose={() => setSwapFor(null)}
          onSwap={(reason) => handleSwap(swapFor, reason)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
