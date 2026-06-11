# TODO

## Unify duplicate admin/user API endpoints

The frontend `api.js` calls the general `/api/recipes`, `/api/ingredients`, etc. endpoints
for both regular users and admins. However, `auth.py` also contains a parallel set of
`/api/admin/recipes`, `/api/admin/ingredients`, and `/api/admin/ingredient-groups` endpoints
that largely duplicate the same logic (some with subtle differences, e.g., the admin version
of ingredient update in `auth.py` is missing `group_id` support).

**Action:** Remove the duplicate `/api/admin/recipes`, `/api/admin/ingredients`, and
`/api/admin/ingredient-groups` route handlers from `auth.py`. Consolidate authorization
logic (admin-only operations like creating/deleting tags, managing users) directly onto the
shared endpoints using role checks already available via `g.current_user.role`. The
`/api/admin/users` endpoints in `auth.py` are fine to keep as they have no counterpart.


## Strengthen auth.py initialization pattern

`User` and `Session` ORM models are defined inside `init_auth()` and stored in module-level
globals via `globals()['User'] = User`. This is fragile: calling `init_auth()` twice
redefines the classes (breaking SQLAlchemy's mapper), and the globals pattern makes it
impossible to import the models from `auth.py` at module level (e.g., in tests or other
modules).

**Action:** Refactor `auth.py` so `User` and `Session` are defined at module level, using a
pattern where `db` is injected (e.g., via an `init_app`-style function that only sets the
`db` reference, not redefines the classes). This is the standard Flask extension pattern and
will make the auth module importable and testable in isolation.


## Fix ingredient weight calculation unit mismatch

`calculate_ingredient_weight()` in `app.py` computes weight as
`ingredient.weight × recipe_ingredient.quantity`, treating `ingredient.weight` as
"grams per recipe unit." However, the field semantics are actually "grams per
`ingredient.default_unit_id`." If a recipe uses a different unit than the ingredient's
`default_unit_id`, the result is silently wrong.

**Action:** Update `calculate_ingredient_weight()` to:
1. Look up both the recipe unit and the ingredient's `default_unit_id` unit.
2. Convert `recipe_ingredient.quantity` from the recipe unit to the default unit using
   `convert_unit_quantity()`.
3. Multiply the converted quantity by `ingredient.weight`.
Return `has_weight: False` (or surface a warning) when the units are incompatible (e.g.,
a volume recipe unit vs. a weight default unit).


## Add unit tests

There are currently zero automated tests in the project. Key areas to cover:

- **Backend (pytest):**
  - Unit conversion math: `convert_unit_quantity()`, `can_convert_units()`
  - Cost calculation: `calculate_ingredient_cost()`, `calculate_recipe_cost()`
  - Weight calculation: `calculate_ingredient_weight()` (including the unit-mismatch fix above)
  - Auth helpers: password hashing/verification, session creation/expiry
  - API endpoints: use Flask's test client with a SQLite in-memory DB

- **Frontend (Vitest or Jest):**
  - `unitConversions.js`: `convertUnit()`, `getDisplayUnit()`, `toBaseUnit()`/`fromBaseUnit()`
  - `utils.js`: `formatRecipeUnits()`
  - `pdfGenerator.js`: basic smoke test

Add a `pytest.ini` (or `pyproject.toml` test config) and a frontend `vitest.config.js`.
Run backend tests from `backend/`, frontend tests from `frontend/`.


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
