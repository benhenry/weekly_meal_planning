---
name: weekly-meal-planner
description: >
  Generates a weekly dinner plan (Sun–Thu) + shopping list for a family of 3
  with a picky 8-year-old. Respects pantry inventory, disliked meals, and
  previous rotation history. Runs every Monday morning via cron or on-demand.
  Supports feedback iteration: "too complicated", "we loved that", "skip fish".
trigger_phrases:
  - "generate this week's meal plan"
  - "what should we cook this week"
  - "meal plan monday"
  - "dinner plan"
  - "shopping list this week"
---

# Weekly Meal Planner Skill

## Context

Family of 3: two adults + one picky 8-year-old. Cook time hard cap: **45 minutes
on weeknights, 90 minutes on Sundays**. Friday and (usually) Thursday are
leftovers from earlier in the week.

### Weekly schedule

| Day | Theme | Max cook time |
|-----|-------|--------------|
| Sunday | Featured dish — weekend project | 90 min |
| Monday | Quick & fresh | 40 min |
| Tuesday | Taco night (family tradition) | 35 min |
| Wednesday | International rotation (Mediterranean / Thai / Asian) | 45 min |
| Thursday | Noodles / comfort | 40 min |
| Friday | Leftovers — repurpose Sunday or Wednesday | 15 min |

---

## Persistent State Files

This skill reads and writes three JSON files in the project root:

```
.meal-planner/
  pantry.json       # { items: string[] }
  history.json      # { weeks: Week[] }
  preferences.json  # { liked: string[], disliked: string[], notes: string }
```

If the files don't exist yet, create them with empty defaults.

### Week shape
```json
{
  "weekOf": "2025-10-14",
  "meals": {
    "Sun": { "name": "Moroccan Chicken Tagine", "cuisine": "Mediterranean", "timeMin": 75 },
    "Mon": { "name": "Greek Chicken Bowls", "cuisine": "Mediterranean", "timeMin": 35 },
    "Tue": { "name": "Fish Tacos", "cuisine": "Mexican", "timeMin": 30 },
    "Wed": { "name": "Thai Green Curry", "cuisine": "Thai", "timeMin": 35 },
    "Thu": { "name": "Mushroom Udon", "cuisine": "Japanese", "timeMin": 30 }
  },
  "feedback": {
    "Sun": "liked",
    "Wed": "too-complicated"
  }
}
```

---

## Step-by-Step Instructions

### Step 1 — Read state

Read `.meal-planner/pantry.json`, `.meal-planner/history.json`, and
`.meal-planner/preferences.json`. Extract:

- `pantryItems`: list of pantry staples available this week
- `recentMeals`: meals served in the last 3 weeks (avoid repeating)
- `dislikedMeals`: names to exclude from suggestions
- `likedMeals`: names to weight higher (repeat every 4–6 weeks)
- `notes`: freeform preference notes (e.g. "no shellfish in March")

### Step 2 — Generate plan

For each day (Sun → Thu), select a meal using this priority order:

1. **Liked meals** not served in the last 4 weeks
2. **Pantry-first meals** — uses at least one item from `pantryItems`
3. **Novel meals** — not in `recentMeals`
4. Any meal that fits the day's theme and time cap

**Hard constraints:**
- No meal from `dislikedMeals`
- Cook time must be ≤ day's max (see schedule above)
- Tuesday is always tacos — only vary the protein and toppings
- At least one kid-friendly meal each day (or flag with ⚠️)

**Pantry items to use when possible:**
Read from `pantry.json`. Common defaults if file is empty:
Golden Raisins, Mushrooms, Candy Cap Mushrooms, Dried Chilis, Cornmeal,
Almond Flour, Chia Seeds, Paella Broth, Udon/Soba Broth, Mole Concentrate,
Frozen Fish (2 types), Moroccan Spice, Red Lentils, Green Lentils.

### Step 3 — Build shopping list

From the selected meals, extract unique ingredients needed. Separate into:

**Buy this week** — ingredients specific to this week's meals, with quantities
**Always keep stocked** — pantry check: Tortillas, Garlic, Onions, Limes,
Olive oil, Soy sauce, Rice, Chicken stock, Eggs, Butter, Canned tomatoes

De-duplicate across days (e.g. garlic used Mon + Wed = buy once, 2 heads).
Note which day each ingredient is needed.

### Step 4 — Output format

Produce two sections:

```markdown
## 🗓 Week of [DATE] — Dinner Plan

| Day | Dish | Cuisine | Time | Notes |
|-----|------|---------|------|-------|
| Sun | [dish] | [cuisine] | [X] min | [pantry items used] |
| Mon | ...   |           |         |                     |
| Tue | Tacos: [protein] | Mexican | X min | |
| Wed | ...   |           |         |       |
| Thu | ...   |           |         |       |
| Fri | Leftovers | — | 15 min | Suggest: [remix idea] |

Pantry items used this week: [list]

---

## 🛒 Shopping List

### Buy this week
- [ ] [ingredient] — [quantity] — needed: [days]
- [ ] ...

### Check stock
- [ ] Tortillas
- [ ] Garlic
- [ ] ...
```

### Step 5 — Save plan

Append the new week to `.meal-planner/history.json`. Do not overwrite past weeks.

---

## Feedback Handling

When the user says things like:
- "that was too complicated" → add meal to `dislikedMeals`, set feedback field
- "we loved the tagine" → add to `likedMeals`
- "skip anything with shellfish" → append to `notes` in preferences.json
- "swap Wednesday" → re-run Step 2 for Wednesday only, excluding current pick
- "make it simpler" → re-run with time cap reduced by 10 min for all days

After any feedback, update the relevant state files and show the revised plan or
confirm what was saved.

---

## Cron / Monday Automation

To run this automatically every Monday at 8am, add to your system crontab:

```bash
0 8 * * 1 cd /path/to/project && claude -p "Generate this week's meal plan" >> .meal-planner/logs/$(date +%Y-%m-%d).log 2>&1
```

Or with Claude Code's task runner (if configured):

```yaml
# .claude/tasks.yml
tasks:
  - name: weekly-meal-plan
    schedule: "0 8 * * 1"
    prompt: "Generate this week's meal plan and shopping list"
    skill: weekly-meal-planner
```

---

## Example Invocations

```
"Generate this week's meal plan"
→ Runs full flow, produces plan + shopping list

"That green curry was too complicated, swap it"
→ Re-runs Wed selection excluding Thai Green Curry, updates history feedback

"We loved the tagine, keep rotating that in"
→ Adds Moroccan Chicken Tagine to likedMeals in preferences.json

"Generate a plan but avoid anything with shellfish this week"
→ Temporarily filters shellfish dishes, notes it in the plan header

"What should I buy today?"
→ If current week plan exists, outputs shopping list only
```

---

## Recipe Rotation Pool (Reference)

This is a reference list to draw from. Claude may suggest meals outside this
list if they fit the constraints and a user asks for variety.

### Sunday (60–90 min)
- Moroccan Chicken Tagine (uses: Moroccan Spice, Golden Raisins)
- Korean BBQ Short Ribs
- Seafood Paella (uses: Paella Broth, Frozen Fish)
- Homemade Lasagna
- Mole Chicken (uses: Mole Concentrate)
- Pot Roast
- Greek Moussaka

### Monday (30–40 min)
- Greek Chicken Bowls
- Caprese Chicken
- Shrimp Stir-Fry
- Mediterranean Grain Bowls
- Banh Mi Bowls (adult-leaning)

### Tuesday — Tacos (25–35 min)
Protein rotation: Ground beef, Chicken/Carnitas, Fish (uses: Frozen Fish),
Black Bean & Sweet Potato, Shrimp. Standard bar: lettuce, tomato, cheese,
sour cream, salsa, guacamole, cilantro, lime.

### Wednesday (35–45 min)
- Thai Green Curry
- Shakshuka (uses: Dried Chilis)
- Turkish Kofta Bowls
- Thai Basil Chicken
- Lentil Dal (uses: Red Lentils, Dried Chilis)
- Chicken Shawarma Bowls

### Thursday — Noodles/Comfort (30–40 min)
- Pad Thai (uses: Udon/Soba Broth)
- Spaghetti Carbonara
- Dan Dan Noodles (adult-leaning; uses: Udon/Soba Broth)
- Mushroom Udon (uses: Mushrooms, Candy Cap Mushrooms, Udon/Soba Broth)
- Pesto Pasta with Sausage
- Corn Polenta with Mushrooms (uses: Cornmeal, Mushrooms)
