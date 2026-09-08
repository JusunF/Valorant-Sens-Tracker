# Sens Finder — Valorant Sensitivity Generator

A small web-based tool that turns two short aim tests into a Valorant sensitivity value (and cm/360) you can drop straight into the game's settings. No install, no `.exe` — just static HTML/CSS/JS that runs in any browser.

![status](https://img.shields.io/badge/status-active-3b82ff) ![type](https://img.shields.io/badge/type-static%20site-ff3b4e)

## What it does

1. **Setup** — enter your mouse DPI and current in-game sensitivity.
2. **Grid Shot** (30s) — targets spawn one at a time; just move your crosshair over one to hit it and spawn the next (no clicking). Tracks hit count, average reaction time, and targets/min.
3. **Tracking** (20s) — a single target drifts around the arena; hold your crosshair on it as continuously as possible. Tracks % time on-target.
4. **Result** — combines both signals into a recommended sensitivity, cm/360, and eDPI, with the exact steps to enter it into Valorant.

The countdowns are driven by `requestAnimationFrame` + `performance.now()` rather than a plain `setInterval`, so they stay accurate and won't freeze or drift under load.

## Project structure

```
sens-finder/
├── index.html   # page structure/markup
├── style.css    # all styling
├── script.js    # test logic + sensitivity calculation
├── run.py       # starts a local server and opens the browser automatically
└── README.md
```

## Running it locally

**Easiest — auto-opens your browser:**

```bash
python3 run.py
```

This starts a local server on port 8000 and opens `http://localhost:8000` in your default browser automatically. Press `Ctrl+C` in the terminal to stop it.

**Manual alternatives:**

You can also just open `index.html` directly in a browser — it works fine over `file://` since everything is local and relative. Or run a plain server yourself and open the URL by hand:

```bash
# Python 3 (does NOT auto-open a browser — visit http://localhost:8000 yourself)
python3 -m http.server 8000

```

## How the sensitivity math works

Valorant's raw mouse input scales using a fixed constant, so any sensitivity and DPI pair maps to a specific physical distance per 360° turn:

```
cm/360 = 2.54 × 360 ÷ (sensitivity × DPI × 0.07)
```

The tool takes your current cm/360 as a baseline, then nudges it based on:
- **Tracking accuracy** vs. a 75% benchmark — worse tracking pushes toward a *less* sensitive (higher cm/360) recommendation.
- **Average reaction time** vs. a 550ms benchmark — slower reactions push toward a *more* sensitive (lower cm/360) recommendation.

The total adjustment is capped at ±20%. This is a heuristic starting point, not a guarantee — the note in the results screen says as much, and encourages fine-tuning from there.

## Deploying

Since it's fully static, it'll run as-is on GitHub Pages, Netlify, Vercel, or any static host — no build step required.

**GitHub Pages:**
1. Push this folder to a GitHub repo.
2. Go to **Settings → Pages**.
3. Under **Source**, select the branch (e.g. `main`) and `/ (root)`.
4. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## License

Feel free to use, modify, and share.
