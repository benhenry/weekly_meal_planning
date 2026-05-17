import { useEffect, useState } from "react";

function ListField({ label, items, onChange, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || items.includes(v)) { setInput(""); return; }
    onChange([...items, v]);
    setInput("");
  };
  return (
    <div className="list-editor" style={{ marginBottom: 16 }}>
      <h3>{label}</h3>
      <div>
        {items.map((it) => (
          <span key={it} className="chip">
            {it}
            <button onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`Remove ${it}`}>×</button>
          </span>
        ))}
        {items.length === 0 && <div className="empty">None yet.</div>}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
        />
        <button className="ghost" onClick={add}>Add</button>
      </div>
    </div>
  );
}

export default function PreferencesEditor({ prefs, onSave }) {
  const [draft, setDraft] = useState(prefs);
  useEffect(() => { setDraft(prefs); }, [prefs]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(prefs);

  return (
    <div className="card">
      <h2>Preferences</h2>
      <ListField
        label="❤ Liked meals (rotate back in every 4–6 weeks)"
        items={draft.liked || []}
        onChange={(liked) => setDraft({ ...draft, liked })}
        placeholder="e.g. Moroccan Chicken Tagine"
      />
      <ListField
        label="✗ Disliked meals (never suggest)"
        items={draft.disliked || []}
        onChange={(disliked) => setDraft({ ...draft, disliked })}
        placeholder="e.g. Brussels sprouts"
      />
      <div style={{ marginTop: 16 }}>
        <h3>Notes</h3>
        <textarea
          value={draft.notes || ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Any constraints, dietary notes, family quirks…"
        />
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary" disabled={!dirty} onClick={() => onSave(draft)}>
          Save preferences
        </button>
        {dirty && <button className="ghost" onClick={() => setDraft(prefs)}>Reset</button>}
      </div>
    </div>
  );
}
