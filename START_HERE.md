# 🚀 START HERE - Recipe Scaling Debug Guide

## What This Is

This is a **debug version** of your recipes app that will help us figure out why recipe scaling doesn't work in production.

**This is NOT the final fix** - it's a diagnostic tool. Once we see what's happening, we'll implement the actual fix.

---

## What You'll See

When you deploy this version, you'll see a **bright yellow box** above your recipes that shows:
```
🐛 DEBUG INFO:
Recipe Base Servings: 6
Current Servings Display: 1
Scale Factor (for API): 0.166667 (= 1 / 6)
```

This tells us exactly what values are being used!

---

## Quick Steps

### 1. Deploy (5 minutes)
```bash
cd /path/to/your/recipes/docker
git fetch
git checkout copilot/debug-recipe-weight-scaling
docker-compose build frontend
docker-compose up -d frontend
```

### 2. Test (2 minutes)

**IMPORTANT: You MUST clear your cache or use Incognito mode!**

Why? Your browser caches JavaScript files for 1 year. Even with new code deployed, your browser might show the old version.

**Best option:**
- Open a new **Incognito/Private window**
  - Chrome: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
  - Firefox: Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac)
  - Edge: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)

**Or:**
- Clear your browser cache
- Do a "hard refresh" with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### 3. Look (1 minute)

1. Open your recipes app in the Incognito window
2. Go to "Browse Recipes"
3. Click on any recipe (preferably one with 6 servings)
4. **Look at the yellow box** above the recipe
5. Open browser Developer Tools (press F12)
6. Click the "Console" tab
7. Look for lines starting with `[DEBUG]`

### 4. Share (1 minute)

Tell me what you see:

**From the yellow box:**
- Recipe Base Servings: `_______`
- Scale Factor: `_______`

**From the console:**
- Copy/paste any lines that start with `[DEBUG]`

**Bonus:**
- Take a screenshot of the yellow box
- Take a screenshot of the console

---

## What We'll Learn

Based on what the yellow box shows:

### If it shows "Recipe Base Servings: undefined"
→ The API isn't sending the `base_servings` value
→ We need to fix the backend

### If it shows "Recipe Base Servings: 1"
→ The database has the wrong value
→ We need to update the database

### If it shows "Recipe Base Servings: 6"
→ The value is correct!
→ We need to check why the calculation is wrong

---

## Troubleshooting

### "I don't see a yellow box"
→ Your browser is still using cached code
→ Try Incognito mode
→ Or clear cache and do a hard refresh (Ctrl+Shift+R)

### "I don't see [DEBUG] messages in console"
→ Same issue - browser cache
→ Try Incognito mode

### "Docker container won't start"
→ Check logs: `docker-compose logs frontend`
→ Try rebuilding: `docker-compose build --no-cache frontend`

### "I need more help"
→ Read `DEBUG_SUMMARY.md` for detailed instructions
→ Read `TROUBLESHOOTING_SCALING.md` for common issues

---

## What Happens Next

1. You share what the yellow box shows
2. I identify the root cause
3. I create a proper fix
4. You deploy the fix (no more yellow box)
5. Everything works! 🎉

---

## Why This Approach?

Instead of me guessing what's wrong and potentially trying multiple fixes:
- ✅ You deploy once
- ✅ Yellow box shows exactly what's happening
- ✅ I implement the correct fix first time
- ✅ Faster resolution
- ✅ No trial and error

---

## Questions?

Just ask! Or check:
- `DEBUG_SUMMARY.md` - Detailed deployment guide
- `TROUBLESHOOTING_SCALING.md` - Common issues
- `IMPLEMENTATION_SUMMARY.md` - Technical details

---

## TL;DR

1. Deploy with `docker-compose build frontend && docker-compose up -d frontend`
2. **Test in Incognito mode** (important!)
3. Look at yellow box
4. Tell me what it says
5. I'll fix it!

**Let's solve this! 🚀**
