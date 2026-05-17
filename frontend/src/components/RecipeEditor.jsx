import { useState } from "react";

function clone(meal) {
  return JSON.parse(JSON.stringify({
    name: meal.name || "",
    cuisine: meal.cuisine || "",
    timeMin: meal.timeMin ?? 30,
    kidFriendly: meal.kidFriendly !== false,
    pantryUsed: meal.pantryUsed || [],
    recipe: {
      servings: meal.recipe?.servings ?? 3,
      ingredients: meal.recipe?.ingredients?.length ? meal.recipe.ingredients : [{ item: "", quantity: "" }],
      steps: meal.recipe?.steps?.length ? meal.recipe.steps : [""],
      notes: meal.recipe?.notes || "",
    },
    side: {
      name: meal.side?.name || "",
      timeMin: meal.side?.timeMin ?? 15,
      ingredients: meal.side?.ingredients?.length ? meal.side.ingredients : [{ item: "", quantity: "" }],
      steps: meal.side?.steps?.length ? meal.side.steps : [""],
    },
  }));
}

export default function RecipeEditor({ day, meal, onClose, onSave }) {
  const [draft, setDraft] = useState(() => clone(meal));

  const updateRecipe = (patch) => setDraft((d) => ({ ...d, recipe: { ...d.recipe, ...patch } }));
  const updateIngredient = (i, patch) => {
    const next = draft.recipe.ingredients.map((row, idx) => (idx === i ? { ...row, ...patch } : row));
    updateRecipe({ ingredients: next });
  };
  const removeIngredient = (i) => updateRecipe({ ingredients: draft.recipe.ingredients.filter((_, idx) => idx !== i) });
  const addIngredient = () => updateRecipe({ ingredients: [...draft.recipe.ingredients, { item: "", quantity: "" }] });
  const updateStep = (i, value) => updateRecipe({ steps: draft.recipe.steps.map((s, idx) => (idx === i ? value : s)) });
  const removeStep = (i) => updateRecipe({ steps: draft.recipe.steps.filter((_, idx) => idx !== i) });
  const addStep = () => updateRecipe({ steps: [...draft.recipe.steps, ""] });

  const updateSide = (patch) => setDraft((d) => ({ ...d, side: { ...d.side, ...patch } }));
  const updateSideIngredient = (i, patch) => {
    const next = draft.side.ingredients.map((row, idx) => (idx === i ? { ...row, ...patch } : row));
    updateSide({ ingredients: next });
  };
  const removeSideIngredient = (i) => updateSide({ ingredients: draft.side.ingredients.filter((_, idx) => idx !== i) });
  const addSideIngredient = () => updateSide({ ingredients: [...draft.side.ingredients, { item: "", quantity: "" }] });
  const updateSideStep = (i, value) => updateSide({ steps: draft.side.steps.map((s, idx) => (idx === i ? value : s)) });
  const removeSideStep = (i) => updateSide({ steps: draft.side.steps.filter((_, idx) => idx !== i) });
  const addSideStep = () => updateSide({ steps: [...draft.side.steps, ""] });

  const save = () => {
    const cleaned = {
      ...draft,
      recipe: {
        ...draft.recipe,
        ingredients: draft.recipe.ingredients.filter((r) => r.item.trim()),
        steps: draft.recipe.steps.map((s) => s.trim()).filter(Boolean),
      },
      side: {
        ...draft.side,
        ingredients: draft.side.ingredients.filter((r) => r.item.trim()),
        steps: draft.side.steps.map((s) => s.trim()).filter(Boolean),
      },
    };
    onSave(cleaned);
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target.classList.contains("modal-bg")) onClose(); }}>
      <div className="modal">
        <h2>Edit {day} recipe</h2>

        <label>Name</label>
        <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

        <div className="row" style={{ marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Cuisine</label>
            <input type="text" value={draft.cuisine} onChange={(e) => setDraft({ ...draft, cuisine: e.target.value })} />
          </div>
          <div style={{ width: 110 }}>
            <label>Time (min)</label>
            <input type="text" value={draft.timeMin} onChange={(e) => setDraft({ ...draft, timeMin: Number(e.target.value) || 0 })} />
          </div>
          <div style={{ width: 110 }}>
            <label>Servings</label>
            <input type="text" value={draft.recipe.servings} onChange={(e) => updateRecipe({ servings: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input type="checkbox" checked={draft.kidFriendly} onChange={(e) => setDraft({ ...draft, kidFriendly: e.target.checked })} />
          Kid-friendly
        </label>

        <h3 style={{ marginTop: 18 }}>Ingredients</h3>
        {draft.recipe.ingredients.map((row, i) => (
          <div className="recipe-row" key={i}>
            <input type="text" placeholder="Item" value={row.item} onChange={(e) => updateIngredient(i, { item: e.target.value })} />
            <input type="text" placeholder="Quantity" value={row.quantity} onChange={(e) => updateIngredient(i, { quantity: e.target.value })} />
            <button className="ghost small" onClick={() => removeIngredient(i)}>×</button>
          </div>
        ))}
        <button className="ghost small" onClick={addIngredient}>+ ingredient</button>

        <h3 style={{ marginTop: 18 }}>Steps</h3>
        {draft.recipe.steps.map((step, i) => (
          <div className="step-row" key={i}>
            <span style={{ paddingTop: 8, color: "var(--muted)" }}>{i + 1}.</span>
            <textarea value={step} onChange={(e) => updateStep(i, e.target.value)} />
            <button className="ghost small" onClick={() => removeStep(i)}>×</button>
          </div>
        ))}
        <button className="ghost small" onClick={addStep}>+ step</button>

        <h3 style={{ marginTop: 18 }}>Notes</h3>
        <textarea value={draft.recipe.notes} onChange={(e) => updateRecipe({ notes: e.target.value })} />

        <hr style={{ margin: "24px 0", border: 0, borderTop: "1px solid var(--border)" }} />
        <h2 style={{ marginBottom: 6 }}>Side dish</h2>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g. Roasted broccoli with lemon"
              value={draft.side.name}
              onChange={(e) => updateSide({ name: e.target.value })}
            />
          </div>
          <div style={{ width: 110 }}>
            <label>Time (min)</label>
            <input
              type="text"
              value={draft.side.timeMin}
              onChange={(e) => updateSide({ timeMin: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <h3 style={{ marginTop: 18 }}>Side ingredients</h3>
        {draft.side.ingredients.map((row, i) => (
          <div className="recipe-row" key={i}>
            <input type="text" placeholder="Item" value={row.item} onChange={(e) => updateSideIngredient(i, { item: e.target.value })} />
            <input type="text" placeholder="Quantity" value={row.quantity} onChange={(e) => updateSideIngredient(i, { quantity: e.target.value })} />
            <button className="ghost small" onClick={() => removeSideIngredient(i)}>×</button>
          </div>
        ))}
        <button className="ghost small" onClick={addSideIngredient}>+ ingredient</button>

        <h3 style={{ marginTop: 18 }}>Side steps</h3>
        {draft.side.steps.map((step, i) => (
          <div className="step-row" key={i}>
            <span style={{ paddingTop: 8, color: "var(--muted)" }}>{i + 1}.</span>
            <textarea value={step} onChange={(e) => updateSideStep(i, e.target.value)} />
            <button className="ghost small" onClick={() => removeSideStep(i)}>×</button>
          </div>
        ))}
        <button className="ghost small" onClick={addSideStep}>+ step</button>

        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save}>Save recipe</button>
        </div>
      </div>
    </div>
  );
}
