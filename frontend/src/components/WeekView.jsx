import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_LABELS = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };

export default function WeekView({ plan, busy, onSwap, onFeedback, onEditRecipe, onGenerate }) {
  const [instruction, setInstruction] = useState("");

  if (!plan) {
    return (
      <div className="card">
        <h2>No plan yet</h2>
        <p>Click <strong>Generate this week</strong> above to make a fresh weekly plan, or give an instruction:</p>
        <div className="row">
          <input
            type="text"
            placeholder="e.g. avoid shellfish, keep it simple this week"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <button className="primary" disabled={busy} onClick={() => onGenerate(instruction || undefined)}>
            Generate
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {plan.headerNote && <div className="card"><em>{plan.headerNote}</em></div>}
      <div className="meals">
        {DAYS.map((day) => {
          const meal = plan.meals?.[day];
          if (!meal) return null;
          const feedback = plan.feedback?.[day];
          return (
            <div className="meal" key={day}>
              <div className="badges">
                <span className="badge">{DAY_LABELS[day]}</span>
                {meal.cuisine && meal.cuisine !== "—" && <span className="badge">{meal.cuisine}</span>}
                {meal.timeMin != null && <span className="badge">{meal.timeMin} min</span>}
                {meal.kidFriendly === false && <span className="badge" style={{ background: "#fff2e0", color: "#b26a00" }}>⚠️ adult-leaning</span>}
              </div>
              <h3>{meal.name}</h3>
              {meal.side?.name && (
                <div className="meta">
                  + <strong>Side:</strong> {meal.side.name}
                  {meal.side.timeMin != null ? ` (${meal.side.timeMin} min)` : ""}
                </div>
              )}
              {meal.pantryUsed?.length > 0 && (
                <div className="meta">Pantry: {meal.pantryUsed.join(", ")}</div>
              )}
              {feedback && (
                <div className={feedback === "loved" ? "feedback-loved" : "feedback-bad"}>
                  {feedback === "loved" ? "❤ Loved it" : feedback === "too-complicated" ? "⚠ Too complicated" : `Feedback: ${feedback}`}
                </div>
              )}
              <div className="actions">
                <button className="ghost small" disabled={busy} onClick={() => onEditRecipe(day)}>Recipe</button>
                <button className="ghost small" disabled={busy} onClick={() => onFeedback(day, "loved")}>❤ Loved</button>
                <button className="ghost small" disabled={busy} onClick={() => onFeedback(day, "too-complicated")}>Too hard</button>
                {day !== "Fri" && (
                  <button className="ghost small" disabled={busy} onClick={() => onSwap(day, "user requested")}>Swap</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Tweak this week</h2>
        <div className="row">
          <input
            type="text"
            placeholder="e.g. simpler this week, no fish, more pasta"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <button className="primary" disabled={busy} onClick={() => onGenerate(instruction)}>
            Regenerate with note
          </button>
        </div>
      </div>
    </>
  );
}
