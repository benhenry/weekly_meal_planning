import { useEffect, useState } from "react";

export default function ShoppingList({ plan, busy, onPushToTodoist }) {
  const [checked, setChecked] = useState({});

  useEffect(() => {
    const key = `dinners.shopping.${plan?.weekOf || "none"}`;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      setChecked(stored);
    } catch { setChecked({}); }
  }, [plan?.weekOf]);

  const toggle = (id) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const key = `dinners.shopping.${plan?.weekOf || "none"}`;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  if (!plan?.shopping) {
    return <div className="empty">No shopping list yet — generate a plan first.</div>;
  }

  const { buyThisWeek = [], checkStock = [] } = plan.shopping;

  return (
    <>
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>
        Send this list to Todoist so it syncs to your phone for the store.
      </div>
      <button className="primary" disabled={busy} onClick={onPushToTodoist}>
        {busy ? "Sending…" : "Send to Todoist"}
      </button>
    </div>
    <div className="shopping">
      <div className="card">
        <h3>Buy this week</h3>
        {buyThisWeek.length === 0 && <div className="empty">Nothing extra needed.</div>}
        <ul>
          {buyThisWeek.map((entry, i) => {
            const id = `b-${i}-${entry.item}`;
            const isDone = !!checked[id];
            return (
              <li key={id} className={isDone ? "done" : ""}>
                <input type="checkbox" checked={isDone} onChange={() => toggle(id)} />
                <span>
                  <strong>{entry.item}</strong>
                  {entry.quantity ? ` — ${entry.quantity}` : ""}
                  {entry.neededDays?.length > 0 ? <em style={{ color: "var(--muted)" }}> · {entry.neededDays.join(", ")}</em> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="card">
        <h3>Check stock</h3>
        <ul>
          {checkStock.map((item, i) => {
            const id = `s-${i}-${item}`;
            const isDone = !!checked[id];
            return (
              <li key={id} className={isDone ? "done" : ""}>
                <input type="checkbox" checked={isDone} onChange={() => toggle(id)} />
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
    </>
  );
}
