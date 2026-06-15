# TODO

## Implement food allergies / allergen feature

The `Ingredients` table has a `contains_peanuts` boolean and a `gluten_status` enum
(`Contains` / `Gluten-Free` / `GF_Available`), but neither is surfaced in the UI or
included in `serialize_ingredient()`.

**Action:**
1. Add `contains_peanuts` to `serialize_ingredient()` output.
2. Display allergen badges (peanuts, gluten status) on the ingredient editor and on recipe
   ingredient lists in the user view.
3. Show a recipe-level allergen summary (e.g., "Contains: peanuts, gluten") derived from
   its ingredient list — compute this on the backend in `serialize_recipe()` or as a
   dedicated `/api/recipes/<id>/allergens` endpoint.
4. Consider expanding the allergen model beyond peanuts/gluten (e.g., a many-to-many
   `Ingredient_Allergens` table with a reference `Allergens` table) for the full set of
   major food allergens (tree nuts, dairy, eggs, soy, wheat, shellfish, fish, sesame).
