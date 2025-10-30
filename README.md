# Recipes Frontend (React + Vite)

This is a minimal React frontend for the recipes app. It provides:

- Admin dashboard: create/update/delete recipes and ingredients.
- User view: browse recipes, scale servings, choose versions (if supported by backend).

Assumptions:
- Your Flask backend exposes a REST API under /api, e.g.:
  - GET /api/recipes
  - GET /api/recipes/:id
  - POST /api/recipes
  - PUT /api/recipes/:id
  - DELETE /api/recipes/:id
  - GET /api/ingredients
  - POST /api/ingredients
  - PUT /api/ingredients/:id
  - DELETE /api/ingredients/:id
  - Optionally: GET /api/recipes/:id/versions

If your endpoints or field names differ, update src/api.js and adjust component field mapping.

Getting started:

1. From the repo root:
   cd frontend
   npm install

2. Run frontend dev server:
   npm run dev

   The Vite dev server proxies /api to http://localhost:5000 by default. Make sure your Flask backend runs on port 5000:
   flask run --port 5000

3. Open the frontend in the browser (Vite prints the URL, typically http://localhost:5173).

Notes:
- To change the backend base path, set VITE_API_BASE_URL in your environment or update src/api.js.
- This is intentionally lightweight; you can extend forms, validation, and add authentication for admin routes as needed.