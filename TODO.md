# TODO

## User self-registration

Currently accounts can only be created by an admin. Add a self-service sign-up flow.

**Action:**
1. Add a `POST /api/auth/register` endpoint that creates a new `user`-role account (username + password, bcrypt hashed). Consider whether email verification or admin approval is needed before the account is active.
2. Add a registration form/page in the frontend, linked from the login screen.
3. Decide on open vs. invite-only registration (e.g., a registration token or admin-approval queue).


## Frontend UI theme exploration

The current UI has a single look. Try out some alternative visual styles to compare.

**Action:** Prototype 2–3 distinct themes or layout variations (e.g., different color palette, typography, card vs. list layout for the browse view). Could be done via CSS variables/theming, a theme switcher, or separate prototype branches.


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
