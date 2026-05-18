import { useState } from "react";

const DAY_LABELS = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };

export default function SwapModal({ day, meal, onClose, onSwap }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await onSwap(reason.trim() || "user wants a different pick"); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.classList.contains("modal-bg") && !busy) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2 style={{ marginBottom: 4 }}>Swap {DAY_LABELS[day]}</h2>
        <div style={{ color: "var(--muted)", marginBottom: 16 }}>
          Current: <strong>{meal.name}</strong>{meal.side?.name ? ` + ${meal.side.name}` : ""}
        </div>

        <h3 style={{ marginTop: 0 }}>What should change?</h3>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. too spicy for the kid — pick something milder. Or: keep the cuisine but make it quicker. Or just: try something new."
          style={{ minHeight: 100 }}
        />
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
          The planner will only replace this one day. Your reason is sent verbatim to the model.
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button className="ghost" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="primary" disabled={busy} onClick={submit}>
            {busy ? "Swapping…" : "Swap this day"}
          </button>
        </div>
      </div>
    </div>
  );
}
