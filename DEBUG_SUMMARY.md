# Recipe Scaling Issue - Debug Summary

## What Was Done

I've analyzed the code and added comprehensive debugging features to help identify why recipe weight/cost scaling works correctly in test but not in production.

## The Problem

When viewing a 6-serving recipe with 1 serving selected:
- **Test environment**: Correctly requests `GET /api/recipes/12/weight?scale=0.16666666666666666`
- **Production**: Incorrectly requests `GET /api/recipes/12/weight?scale=1`

The scale factor calculation should be: `current_servings / base_servings = 1 / 6 = 0.1666...`

For production to send `scale=1`, the calculation must be: `1 / 1 = 1`

This means `base_servings` is either:
1. `undefined` (API not returning it)
2. `null` (database has NULL)
3. `0` (wrong database value)
4. `1` (wrong database value)

## Changes Made to Help Debug

### 1. Visual Debug Banner (Yellow Box)
A prominent yellow banner now appears above recipe details showing:
- **Recipe Base Servings**: The value from the database
- **Current Servings Display**: What you've selected
- **Scale Factor**: The calculated value being sent to the API (with formula shown)

This makes it instantly visible what values are being used.

### 2. Console Logging
Detailed `[DEBUG]` messages in the browser console (F12 → Console) showing:
- Recipe data received from API (including `base_servings` value and type)
- Step-by-step scale factor calculation
- API calls with the scale parameter being sent
- All API request/response data

### 3. Environment Variable Fix
Fixed a mismatch where:
- Frontend code expects: `VITE_API_BASE_URL`
- Docker config was setting: `VITE_API_URL`

This shouldn't have caused the issue (it defaults correctly), but it's now consistent.

### 4. Documentation
Created `TROUBLESHOOTING_SCALING.md` with:
- Detailed deployment instructions
- Browser cache clearing steps (critical!)
- Common issues and solutions
- API testing commands
- How to interpret debug output

## What You Need to Do

### Step 1: Deploy the Debug Version

```bash
cd /path/to/recipes/docker
git fetch
git checkout copilot/debug-recipe-weight-scaling
docker-compose build frontend
docker-compose up -d frontend
```

Verify deployment:
```bash
docker-compose ps frontend  # Should show "Up"
docker-compose logs frontend  # Check for errors
```

### Step 2: Clear Browser Cache (CRITICAL!)

**Why this is critical**: Production caches JavaScript files for 1 year. You MUST clear the cache!

**Best option - Use Incognito/Private mode**:
- Chrome: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
- Firefox: Ctrl+Shift+P
- Edge: Ctrl+Shift+N

**Alternative - Hard refresh**:
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5

### Step 3: Test and Observe

1. Open the application in Incognito mode
2. Open Developer Tools (F12)
3. Go to Console tab
4. Navigate to "Browse Recipes"
5. Select a recipe (preferably one you know has 6 base servings)

### Step 4: Record Findings

**From the Yellow Debug Banner**, note:
- Recipe Base Servings: ___________
- Current Servings Display: ___________
- Scale Factor: ___________

**From the Browser Console**, copy:
- All lines starting with `[DEBUG]`
- Any error messages

**Take screenshots**:
- The yellow debug banner
- The console output

### Step 5: Share Results

Share the following:
1. What does the debug banner show?
2. Console output (copy/paste text)
3. Screenshots if helpful

## Interpreting the Results

### Scenario 1: Banner shows "Recipe Base Servings: undefined"
**Root cause**: API not returning `base_servings` field

**Solutions**:
- Check backend logs for errors
- Test API directly: `curl -b cookies.txt http://localhost:8000/api/recipes/12 | jq .base_servings`
- Check if backend `serialize_recipe` function includes `base_servings`

### Scenario 2: Banner shows "Recipe Base Servings: 1"
**Root cause**: Database has incorrect value

**Solutions**:
- Check database: `SELECT recipe_id, name, base_servings FROM Recipes WHERE recipe_id = 12;`
- Update database: `UPDATE Recipes SET base_servings = 6 WHERE recipe_id = 12;`
- Check if migration was run to set correct values

### Scenario 3: Banner shows "Recipe Base Servings: 6" but Scale Factor is wrong
**Root cause**: Calculation or timing issue (less likely)

**Solutions**:
- Check console logs for multiple API calls
- Look for race conditions in log timestamps
- Check if state is being updated correctly

### Scenario 4: Banner shows correct values but API still called with scale=1
**Root cause**: Something modifying the value after calculation

**Solutions**:
- Check console logs for sequence of events
- Look for unexpected state updates
- Check network tab in DevTools for actual API call

## After Identifying the Issue

Once we know the root cause:

1. **I'll create a proper fix** based on the findings
2. **We'll remove the debug code** (yellow banner and console logs)
3. **Deploy the fix** to production
4. **Verify** it works correctly

## Common Pitfalls

### ❌ Not clearing browser cache
**Symptom**: Yellow banner doesn't appear
**Fix**: Use Incognito mode or completely clear cache

### ❌ Looking at old logs
**Symptom**: No [DEBUG] messages in console
**Fix**: Refresh the page after clearing cache

### ❌ Testing wrong recipe
**Symptom**: Can't reproduce issue
**Fix**: Use recipe ID 12 or confirm base_servings value first

### ❌ Cached Docker image
**Symptom**: Changes not appearing
**Fix**: `docker-compose build --no-cache frontend`

## Technical Details (for reference)

The scale factor calculation happens in `UserView.jsx`:
```javascript
const scaleFactor = DEFAULT_SERVINGS / (full.base_servings || 1)
```

Where:
- `DEFAULT_SERVINGS = 1` (constant)
- `full.base_servings` comes from API response
- `|| 1` is the fallback if `base_servings` is falsy

For a 6-serving recipe with 1 serving selected:
- `scaleFactor = 1 / 6 = 0.16666666666666666` ✓ Correct
- If `base_servings` is missing: `scaleFactor = 1 / 1 = 1` ✗ Wrong (what we're seeing)

## Questions?

If you encounter any issues:
1. Check `TROUBLESHOOTING_SCALING.md` for detailed solutions
2. Share screenshots and console output
3. Include output from `docker-compose ps` and `docker-compose logs frontend`

## Files Modified

- `frontend/src/components/UserView.jsx` - Added debug banner and console logging
- `frontend/src/api.js` - Added API request/response logging
- `docker/Dockerfile.frontend` - Fixed environment variable name
- `docker/docker-compose.yml` - Fixed environment variable name
- `docker/.env.example` - Updated documentation
- `TROUBLESHOOTING_SCALING.md` - Comprehensive troubleshooting guide
- `DEBUG_SUMMARY.md` - This file
