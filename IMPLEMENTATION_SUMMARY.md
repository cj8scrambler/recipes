# Implementation Summary: Recipe Scaling Debug Solution

## Overview
This document summarizes the implementation for debugging the recipe scaling issue where production shows `scale=1` instead of the expected `scale=0.1666...` for a 1-serving portion of a 6-serving recipe.

## Problem Analysis

### The Issue
```
Test environment:  GET /api/recipes/12/weight?scale=0.16666666666666666  ✓ Correct
Production:        GET /api/recipes/12/weight?scale=1                      ✗ Wrong
```

### The Code
```javascript
// In selectRecipe() function (UserView.jsx:96)
const scaleFactor = DEFAULT_SERVINGS / (full.base_servings || 1)
loadRecipeCost(recipe.recipe_id, scaleFactor)
loadRecipeWeight(recipe.recipe_id, scaleFactor)
```

Where:
- `DEFAULT_SERVINGS = 1` (constant defined at top of file)
- `full.base_servings` comes from `api.getRecipe()` response
- `|| 1` provides fallback if `base_servings` is falsy

### Why Production Shows scale=1
For `scale=1`, the calculation must be: `1 / 1 = 1`

This happens when `base_servings` is:
- `undefined` → `1 / (undefined || 1) = 1 / 1 = 1`
- `null` → `1 / (null || 1) = 1 / 1 = 1`
- `0` → `1 / (0 || 1) = 1 / 1 = 1`
- `1` → `1 / 1 = 1`

### Key Clue
User said: "I tried point the production code, to the test database and still see the same issue."

This rules out:
- ❌ Database having wrong values
- ❌ Backend returning different data

This suggests:
- ✅ Frontend code issue (most likely)
- ✅ Browser cache serving old code
- ✅ Build/deployment issue
- ✅ Environment-specific behavior

## Implementation Details

### 1. Visual Debug Banner
**File**: `frontend/src/components/UserView.jsx` (lines 534-548)

Added a yellow banner above recipe details that displays:
```
🐛 DEBUG INFO:
Recipe Base Servings: {value}
Current Servings Display: {value}
Scale Factor (for API): {value} (= current / base)
```

**Benefits**:
- Immediately visible without opening DevTools
- Shows exact values being used
- Non-technical users can report what they see
- Clear visual indicator that debug version is running

### 2. Console Logging

**In UserView.jsx** (lines 93-108):
- Logs full recipe data received
- Shows `base_servings` value and type
- Logs calculation: `${current} / ${base} = ${result}`

**In api.js** (lines 4-21):
- Logs all API requests (URL)
- Logs API responses (optimized for large objects)
- For recipe endpoints, logs only essential fields

**Benefits**:
- Detailed diagnostic information
- Can trace data flow
- Identifies timing issues
- Performance-optimized logging

### 3. Environment Variable Fix
**Files**: `docker/Dockerfile.frontend`, `docker/docker-compose.yml`, `docker/.env.example`

**Problem**: Mismatch between:
- Code expects: `VITE_API_BASE_URL`
- Docker sets: `VITE_API_URL`

**Fix**: Changed all Docker configurations to use `VITE_API_BASE_URL`

**Impact**: 
- Low - the code defaults to `/api` which works correctly
- But good for consistency and future maintenance
- Eliminates potential confusion

### 4. Documentation

**DEBUG_SUMMARY.md**:
- Quick-start guide for user
- Step-by-step deployment instructions
- What to look for
- How to share findings

**TROUBLESHOOTING_SCALING.md**:
- Comprehensive reference
- Common issues and solutions
- Scenario-based interpretation
- API testing commands
- Docker debugging tips

## Technical Considerations

### Why Not Just Fix It?

Without knowing the root cause, we could:
1. Assume it's database → waste time checking database
2. Assume it's backend → waste time checking serialization
3. Assume it's frontend → make wrong changes
4. Try multiple fixes → create more issues

**Better approach**: Debug first, then fix precisely.

### Browser Caching Challenge

Production configuration (nginx-frontend.conf):
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Impact**:
- JavaScript files cached for 1 year
- Even with new deployment, browser may serve old cached files
- **Critical**: User MUST clear cache or use Incognito mode

**Mitigation**:
- Vite generates content-hashed filenames (e.g., `index-D5UBx9vD.js`)
- When code changes, filename changes
- Should bust cache automatically
- BUT: HTML file might be cached
- **Solution**: Clear cache or use Incognito mode

### React State Management

The code uses React state:
```javascript
const [selected, setSelected] = useState(null)
const [scale, setScale] = useState(DEFAULT_SERVINGS)
```

**Potential issue**: If there's a race condition or timing issue, state might not be ready when used.

**Debug addresses this**: Logs show timing and sequence of events.

## Expected Outcomes

### Scenario 1: base_servings is undefined
```
DEBUG INFO:
Recipe Base Servings: undefined
Scale Factor: N/A
```

**Root cause**: API not returning `base_servings`

**Fix needed**: 
- Check backend `serialize_recipe()` function
- Ensure `base_servings` is included in response
- Check database schema

### Scenario 2: base_servings is 1
```
DEBUG INFO:
Recipe Base Servings: 1
Scale Factor: 1.000000 (= 1 / 1)
```

**Root cause**: Database has wrong value

**Fix needed**:
- Update database: `UPDATE Recipes SET base_servings = 6 WHERE recipe_id = 12`
- Check if migration needed
- Verify all recipes have correct values

### Scenario 3: base_servings is correct but scale is wrong
```
DEBUG INFO:
Recipe Base Servings: 6
Scale Factor: 1.000000 (= 1 / 6)  <-- Shows 0.166667 in banner but 1 in network
```

**Root cause**: Timing or state management issue

**Fix needed**:
- Check console logs for sequence
- Look for race condition
- Check if scale is recalculated somewhere
- Verify state updates

### Scenario 4: Everything looks correct
```
DEBUG INFO:
Recipe Base Servings: 6
Scale Factor: 0.166667 (= 1 / 6)

But Network tab shows: scale=1
```

**Root cause**: Something modifying value after calculation

**Fix needed**:
- Check console logs for all API calls
- Look for duplicate calls
- Check if loadRecipeWeight is called multiple times
- Verify no other code is calling the API

## Code Quality

### Security
- ✅ CodeQL scan: 0 alerts
- ✅ No sensitive data logged
- ✅ Debug code can be safely removed
- ✅ No new dependencies

### Performance
- ✅ Logging optimized for large responses
- ✅ Only logs essential fields for recipe data
- ✅ No impact on production performance
- ✅ Can be completely removed after debugging

### Maintainability
- ✅ Well-documented
- ✅ Clear comments
- ✅ Consistent with existing code style
- ✅ Easy to remove when done

## Next Steps

### Immediate (User's action)
1. Deploy debug version
2. Clear browser cache or use Incognito
3. Test with a 6-serving recipe
4. Share debug banner values and console output

### After Receiving Debug Info
1. Analyze the specific scenario
2. Implement targeted fix
3. Test fix locally
4. Create clean PR (without debug code)
5. Deploy and verify

### Cleanup
1. Remove debug banner code
2. Remove console.log statements
3. Remove debug documentation files
4. Keep only the actual fix
5. Update to next version

## Files Modified

### Frontend Code
- `frontend/src/components/UserView.jsx` - Debug banner and logging
- `frontend/src/api.js` - API request/response logging

### Docker Configuration
- `docker/Dockerfile.frontend` - Fixed env variable
- `docker/docker-compose.yml` - Fixed env variable
- `docker/.env.example` - Updated documentation

### Documentation
- `DEBUG_SUMMARY.md` - Quick-start guide (NEW)
- `TROUBLESHOOTING_SCALING.md` - Comprehensive guide (NEW)
- `IMPLEMENTATION_SUMMARY.md` - This file (NEW)

## Build Information

**Build command**: `npm run build`
**Build output**: `frontend/dist/`
**Main bundle**: `index-B4kAUeKb.js` (636.67 kB)
**CSS**: `index-lBgkRad7.css` (16.90 kB)

**Note**: Bundle hash changes with each code change, ensuring cache bust.

## Lessons Learned

1. **Always debug before fixing**: Understanding the problem saves time
2. **Browser cache is critical**: Must be addressed in testing instructions
3. **Visual feedback helps**: Non-technical users can report what they see
4. **Document thoroughly**: Future maintainers will thank you
5. **Environment variables matter**: Small mismatches can cause confusion

## References

- Issue: Recipe scaling doesn't work in production
- Branch: `copilot/debug-recipe-weight-scaling`
- Base: v0.9.0 (commit 24f81fa)
- Related fix: PR #28 (original scale factor fix)
