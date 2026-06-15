# TODO

## Calculate nutritional information

Add per-ingredient nutritional data (calories, protein, fat, carbs, fiber, sodium) and
aggregate it at the recipe level, scaled to the current serving count.

**Action:**
1. Add a `Ingredient_Nutrition` table (calories, protein_g, fat_g, carbs_g, fiber_g, sodium_mg per 100g or per base unit).
2. Surface nutrition fields in the ingredient editor (admin).
3. Compute and display a nutrition facts panel on the recipe view, scaled by servings.
4. Consider sourcing data from a public nutrition API (e.g., USDA FoodData Central) to pre-populate values.

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
