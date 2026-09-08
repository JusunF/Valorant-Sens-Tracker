# Sens Finder — Valorant Sensitivity Generator

A small web-based tool that turns two short aim tests into a recommended Valorant sensitivity (plus cm/360 and eDPI) you can drop straight into the game's settings. No install, no `.exe` — just static HTML/CSS/JS that runs in any browser.

![status](https://img.shields.io/badge/status-active-3b82ff) ![type](https://img.shields.io/badge/type-static%20site-ff3b4e)

## What it does

The flow is a single-page wizard with four steps, tracked by a step indicator at the top:

1. **Setup** — enter your mouse DPI and current in-game sensitivity. Both are validated (must be positive numbers) before you can continue.
2. **Grid Shot** (30s, red arena) — targets spawn one at a time inside the arena; move your crosshair over a target to "hit" it (no clicking) and the next one spawns immediately. While running it tracks:
   - **Hits** — total targets acquired
   - **Avg reaction** — mean time from a target spawning to it being hit
   - **Targets/min** — hit rate extrapolated from elapsed time
3. **Tracking** (20s, blue arena) — a single target drifts smoothly between random waypoints; hold your crosshair on it as continuously as possible. Tracks **% time on-target**, sampled continuously as you move.
4. **Result** — combines both signals into a recommended sensitivity, cm/360, and eDPI, along with the exact steps to enter it into Valorant, a copy-to-clipboard button, and a short written explanation of how your result was derived. A "Retake tests" button resets everything back to Setup.

Both arenas render a custom crosshair that follows the mouse/touch position (the real OS cursor is hidden via `cursor: none`), and hit/on-target detection is done by comparing cursor position to the target's center against its radius — not by DOM click events.

The countdowns are driven by `requestAnimationFrame` + `performance.now()` rather than a plain `setInterval`, so they stay accurate and won't freeze or drift under load.

## Project structure

```
sens-finder/
├── Index.html   # page structure/markup
├── style.css    # all styling
├── script.js    # test logic + sensitivity calculation
├── run.py       # starts a local server and opens the browser automatically
└── README.md
```

## Running it locally

**Easiest — auto-opens your browser:**

```bash
python run.py
```

This starts a local server on port 8000 and opens `http://localhost:8000` in your default browser automatically. Press `Ctrl+C` in the terminal to stop it.

**Manual alternatives:**

You can also just open `Index.html` directly in a browser — it works fine over `file://` since everything is local and relative. Or run a plain server yourself and open the URL by hand:

```bash
# Python (does NOT auto-open a browser — visit http://localhost:8000 yourself)
python -m http.server 8000
```

## How the sensitivity math works

Valorant's raw mouse input scales using a fixed constant (`0.07`), so any sensitivity/DPI pair maps to a specific physical distance per 360° turn:

```
cm/360 = 2.54 × 360 ÷ (sensitivity × DPI × 0.07)
```

The tool converts your **current** sensitivity/DPI into a baseline cm/360, then nudges that baseline based on two adjustments (each computed in `computeAndShowResults()` in `script.js`):

- **Tracking accuracy** vs. a 75% benchmark — `adjust = (75 − trackingPct) × 0.5`. Worse tracking than benchmark pushes the adjustment positive → a *higher* cm/360 (less sensitive). Better tracking pushes it negative → lower cm/360 (more sensitive). If the tracking test produced no samples, tracking defaults to 50%.
- **Average reaction time** vs. a 550ms benchmark — `adjust = −((avgReaction − 550) / 550) × 15`. Slower-than-benchmark reactions push the adjustment negative → a *lower* cm/360 (more sensitive), on the theory that a faster-turning setup helps compensate. If Grid Shot produced no hits, reaction time defaults to 700ms.

The two adjustments are summed and clamped to **±20%**, then applied to your baseline cm/360 to get the new cm/360, which is converted back into a sensitivity value at your DPI (`eDPI = DPI × sensitivity`, rounded).

This is a heuristic starting point, not a guarantee — the results screen says as much and suggests fine-tuning cm/360 up or down from there based on whether your flicks overshoot or fall short.

## Deploying

Since it's fully static, it'll run as-is on GitHub Pages, Netlify, Vercel, or any static host — no build step required.

**GitHub Pages:**
1. Push this folder to a GitHub repo.
2. Go to **Settings → Pages**.
3. Under **Source**, select the branch (e.g. `main`) and `/ (root)`.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## License

Feel free to use, modify, and share.
