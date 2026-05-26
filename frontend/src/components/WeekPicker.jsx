function fmt(weekOf) {
  if (!weekOf) return "—";
  const d = new Date(`${weekOf}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function WeekPicker({ weeks, selectedWeekOf, currentWeekOf, onSelect }) {
  const sorted = [...weeks].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  const idx = sorted.findIndex((w) => w.weekOf === selectedWeekOf);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const isCurrent = selectedWeekOf === currentWeekOf;
  const hasCurrent = sorted.some((w) => w.weekOf === currentWeekOf);

  return (
    <div className="week-picker">
      <button
        className="ghost small"
        disabled={!prev}
        onClick={() => prev && onSelect(prev.weekOf)}
        aria-label="Previous week"
      >
        ‹
      </button>
      <select value={selectedWeekOf || ""} onChange={(e) => onSelect(e.target.value)}>
        {[...sorted].reverse().map((w) => (
          <option key={w.weekOf} value={w.weekOf}>
            Week of {fmt(w.weekOf)}{w.weekOf === currentWeekOf ? " · current" : ""}
          </option>
        ))}
      </select>
      <button
        className="ghost small"
        disabled={!next}
        onClick={() => next && onSelect(next.weekOf)}
        aria-label="Next week"
      >
        ›
      </button>
      {!isCurrent && hasCurrent && (
        <button className="ghost small" onClick={() => onSelect(currentWeekOf)}>
          Jump to current
        </button>
      )}
    </div>
  );
}
