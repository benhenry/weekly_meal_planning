import { useEffect, useState } from "react";

export default function PantryEditor({ items, onSave }) {
  const [draft, setDraft] = useState(items);
  const [input, setInput] = useState("");

  useEffect(() => { setDraft(items); }, [items]);

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (draft.includes(v)) { setInput(""); return; }
    setDraft([...draft, v]);
    setInput("");
  };

  const remove = (item) => setDraft(draft.filter((x) => x !== item));

  const dirty = JSON.stringify(draft) !== JSON.stringify(items);

  return (
    <div className="card list-editor">
      <h2>Pantry</h2>
      <p className="empty" style={{ textAlign: "left", padding: 0, marginTop: 0 }}>
        Items the planner should prefer to use this week.
      </p>
      <div>
        {draft.map((item) => (
          <span key={item} className="chip">
            {item}
            <button onClick={() => remove(item)} aria-label={`Remove ${item}`}>×</button>
          </span>
        ))}
        {draft.length === 0 && <div className="empty">No pantry items yet.</div>}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Add an item (e.g. Red Lentils)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <button className="ghost" onClick={add}>Add</button>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary" disabled={!dirty} onClick={() => onSave(draft)}>
          Save changes
        </button>
        {dirty && <button className="ghost" onClick={() => setDraft(items)}>Reset</button>}
      </div>
    </div>
  );
}
