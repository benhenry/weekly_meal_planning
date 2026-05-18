import { useState } from "react";

const DAY_LABELS = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };

const RATINGS = [
  { value: "loved", label: "❤ Loved it" },
  { value: "ok", label: "👌 It was fine" },
  { value: "too-complicated", label: "⚠ Too complicated" },
  { value: "disliked", label: "🚫 Don't repeat" },
];

function normalize(fb) {
  if (!fb) return { rating: null, notes: "" };
  if (typeof fb === "string") return { rating: fb, notes: "" };
  return { rating: fb.rating || null, notes: fb.notes || "" };
}

export default function FeedbackModal({ day, meal, existing, onClose, onSave }) {
  const init = normalize(existing);
  const [rating, setRating] = useState(init.rating);
  const [notes, setNotes] = useState(init.notes);

  const save = () => onSave({ rating, notes: notes.trim() });

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.classList.contains("modal-bg")) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2 style={{ marginBottom: 4 }}>Feedback — {DAY_LABELS[day]}</h2>
        <div style={{ color: "var(--muted)", marginBottom: 16 }}>{meal.name}{meal.side?.name ? ` · ${meal.side.name}` : ""}</div>

        <h3 style={{ marginTop: 0 }}>How was it?</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {RATINGS.map((r) => (
            <label key={r.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", background: rating === r.value ? "var(--accent-soft)" : "white" }}>
              <input type="radio" name="rating" value={r.value} checked={rating === r.value} onChange={() => setRating(r.value)} />
              {r.label}
            </label>
          ))}
          {rating && (
            <button className="ghost small" style={{ alignSelf: "flex-start" }} onClick={() => setRating(null)}>
              Clear rating
            </button>
          )}
        </div>

        <h3>Notes for next time</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Kid liked the broccoli but wanted ranch. Main was bland — needs more salt. Took 70 min, not 40."
          style={{ minHeight: 100 }}
        />
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
          These notes feed into future plans — the planner reads them when picking next week's meals.
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save}>Save feedback</button>
        </div>
      </div>
    </div>
  );
}
