# Original Homescreen Snapshot

**Saved:** February 14, 2025

This folder preserves the original homescreen of the Pantry Recipe App before any modifications.

## Layout & Structure

### Header
- **Title:** "🍳 Pantry Recipe App" (white text, 2.5rem, text shadow)
- **Error message** (if any): Red-tinted background, white text
- **Diagnostics button:** Toggle to show/hide Supabase connection status

### Main Content (when question flow is NOT shown)
- **Start Recipe Generator** button: Full-width purple button (#667eea) at top
- **Two-column grid** (responsive, min 300px per column):
  1. **My Pantry** section
  2. **Recipes** section

### My Pantry Section
- White card with rounded corners (12px), shadow
- Add item: text input + "Add" button
- List of pantry items with delete (×) buttons
- Empty state: "No items in pantry yet"
- Loading state: "Loading pantry items..."

### Recipes Section
- White card matching pantry style
- List of recipe cards (title, description, ingredients)
- Empty state: "No recipes yet"

### Question Flow (overlay when active)
- Full-screen purple gradient overlay
- White question card with 7-step flow:
  1. How many people? (number)
  2. Meal type? (Hot Food, Cold Dishes, Appetizers, Dessert)
  3. Dietary restrictions? (text)
  4. Time available? (Quick, 30 min, 1 hour, Slow Cooker)
  5. Cuisine preference? (text)
  6. Budget? (number)
  7. What's in your pantry? (textarea)

## Color Scheme
- **Background:** Purple gradient (#667eea → #764ba2)
- **Primary accent:** #667eea (purple)
- **Secondary accent:** #764ba2 (darker purple)
- **Cards:** White with shadow
- **Delete button:** #ff4444 (red)

## Files
- `App.jsx.backup` — Full React component code
- `App.css.backup` — All styles

## To Restore
Copy `App.jsx.backup` → `src/App.jsx` and `App.css.backup` → `src/App.css`
