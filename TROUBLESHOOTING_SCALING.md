# Troubleshooting Recipe Scaling Issues

This document helps diagnose why recipe cost and weight scaling might not work correctly in production.

## Problem Description

When viewing a recipe designed for 6 servings with the serving size set to 1:
- **Expected**: API request should be `GET /api/recipes/12/weight?scale=0.16666666666666666` (1/6)
- **Observed in production**: API request is `GET /api/recipes/12/weight?scale=1`

This indicates the `base_servings` value is not being used correctly in the scale factor calculation.

## Debug Version Features

This branch includes temporary debugging features:

### 1. Visual Debug Banner
A yellow banner above the recipe details showing:
- **Recipe Base Servings**: The `base_servings` value from the database
- **Current Servings**: The serving size you've selected
- **Scale Factor**: The calculated ratio (Current / Base)

### 2. Console Logging
Open browser DevTools (F12) → Console tab to see:
- `[DEBUG] Recipe data received`: Shows the full recipe object and `base_servings` value
- `[DEBUG] Scale factor calculation`: Shows the calculation step-by-step
- `[DEBUG API] getRecipeWeight called`: Shows what scale value is being sent
- `[DEBUG API] Request/Response`: Shows all API calls and responses

## Deployment Steps

### Using Docker

```bash
# Navigate to docker directory
cd /path/to/recipes/docker

# Pull the latest code
git fetch
git checkout copilot/debug-recipe-weight-scaling

# Rebuild the frontend container
docker-compose build frontend

# Restart the frontend
docker-compose up -d frontend

# Verify the container is running
docker-compose ps frontend
```

### Verify Deployment

1. **Check container logs**:
   ```bash
   docker-compose logs frontend
   ```

2. **Check the HTML file** to ensure it's the new build:
   ```bash
   docker-compose exec frontend cat /usr/share/nginx/html/index.html
   ```
   Look for the script tag - it should reference a file like `index-DlCwQj_8.js`

## Testing Steps

### 1. Clear Browser Cache (Critical!)

The frontend JavaScript files are cached for 1 year in production. You MUST clear the cache:

**Option A: Hard Refresh**
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

**Option B: Clear Cache**
- Chrome: Settings → Privacy → Clear browsing data → Cached images and files
- Firefox: Settings → Privacy → Cookies and Site Data → Clear Data
- Edge: Settings → Privacy → Clear browsing data

**Option C: Incognito/Private Mode** (Recommended for testing)
- This ensures no cached files are used

### 2. Open Developer Tools

1. Press F12 (or Right-click → Inspect)
2. Go to the "Console" tab
3. Keep it open while testing

### 3. Test with a Recipe

1. Navigate to "Browse Recipes"
2. Select a recipe (preferably one with 6 base servings)
3. Observe:
   - **Yellow debug banner** should appear above the recipe
   - **Console** should show [DEBUG] messages

### 4. Record the Information

Take note of:
- What does "Recipe Base Servings" show in the debug banner?
- What does "Scale Factor" show?
- What do the console logs show?
- Take screenshots if possible

## Common Issues and Solutions

### Issue 1: Debug Banner Not Appearing

**Cause**: Old cached JavaScript still being served

**Solutions**:
1. Try Ctrl+Shift+R (hard refresh)
2. Clear browser cache completely
3. Try incognito/private mode
4. Check network tab in DevTools - does it show 304 (cached) or 200 (new)?

### Issue 2: Console Shows No [DEBUG] Messages

**Cause**: Old JavaScript or console filtering

**Solutions**:
1. Clear cache and refresh
2. Check console filter settings - ensure "All levels" is selected
3. Try a different browser

### Issue 3: base_servings Shows as "undefined"

**Possible Causes**:
1. Database missing `base_servings` column
2. Backend not serializing `base_servings` field
3. Frontend parsing issue

**Next Steps**:
1. Check database: `SELECT recipe_id, name, base_servings FROM Recipes LIMIT 5;`
2. Check backend logs for errors
3. Test API directly: `curl -b cookies.txt http://localhost:8000/api/recipes/12`

### Issue 4: base_servings Shows as "1" Instead of Expected Value

**Possible Causes**:
1. Database has incorrect values
2. Migration not run to set correct values

**Next Steps**:
1. Check database: `SELECT recipe_id, name, base_servings FROM Recipes WHERE recipe_id = 12;`
2. Update if needed: `UPDATE Recipes SET base_servings = 6 WHERE recipe_id = 12;`

### Issue 5: Scale Factor Calculates Correctly But Wrong Value Sent to API

**Possible Causes**:
1. Timing/race condition
2. State management issue in React
3. Multiple API calls with different values

**Next Steps**:
1. Check console logs for multiple API calls
2. Note the order of log messages
3. Check if `base_servings` changes between messages

## API Testing

Test the backend API directly to rule out frontend issues:

```bash
# Login first to get session cookie
curl -c cookies.txt -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Get recipe details
curl -b cookies.txt http://localhost:8000/api/recipes/12

# Check what base_servings value is returned
# Should show: "base_servings": 6

# Test weight endpoint with correct scale
curl -b cookies.txt "http://localhost:8000/api/recipes/12/weight?scale=0.16666666666666666"
```

## Environment Variables

The frontend build uses these environment variables:

- `VITE_API_BASE_URL`: Base URL for API calls (default: `/api`)
  - In production: Should be `/api` (uses nginx proxy)
  - Only change if API is on different server

Check your `.env` file:
```bash
cat docker/.env | grep VITE
```

## Next Steps After Debugging

Once you've identified the issue from the debug output:

1. **Share the findings**: Post console output and debug banner values
2. **We'll create a fix** based on the root cause
3. **Deploy the fix** to production
4. **Remove debug code** (the yellow banner and console logs)

## Cleaning Up Debug Code

After the issue is resolved, we'll:
1. Remove the debug banner
2. Remove console.log statements
3. Deploy the clean version
4. Verify the fix works without debug code

## Additional Resources

- Check nginx access logs: `docker-compose logs nginx | grep /api/recipes`
- Check backend logs: `docker-compose logs backend`
- Monitor network requests in DevTools Network tab
- Use React DevTools to inspect component state

## Contact

If you're still seeing issues after following these steps, please share:
1. Screenshots of the debug banner
2. Console log output (copy/paste text)
3. Output from: `docker-compose ps`
4. Output from: `curl` API tests
5. Any error messages from browser or server logs
