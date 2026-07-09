# Pocket Ledger — GitHub Pages deploy

Static, no-build version of the Pocket Ledger app (React + Babel loaded from
CDN, transpiled in-browser), packaged for GitHub Pages so it can be installed
on your phone's home screen like an app.

## What changed from the Claude artifact version

- **Storage**: the Claude artifact version saves through `window.storage`,
  which is tied to your Claude account and syncs across devices. That API
  doesn't exist outside Claude.ai, so `storage-shim.js` reimplements the same
  `get/set/delete/list` calls on top of **browser `localStorage`** instead.
  This means data here is **per-device, per-browser** — your phone and laptop
  won't share entries, and it won't match what's in the Claude artifact.
  Excel stays the actual source of truth either way, so this only affects
  what's sitting in the "waiting for Excel" queue at any moment.
- Everything else — Log/Import/Export/Status/Settings, the CSV importer, the
  KPI status-string parser — is unchanged.

## What's new in v2 (this package)

- **Status tab now shows per-category "left this month"** (groceries, eating
  out, transport, ...) with progress bars. It reads the new `cats=` field in
  the Dashboard B136 KPI cell (tracker file _5_4 or later) and subtracts
  anything logged in the app but not yet exported.
- **Comma-decimal proof**: Dutch Excel emits `316,02` — the parser now accepts
  both comma and period decimals.
- **NL bank keywords** added to the auto-categorize rules (Albert Heijn,
  AH to go, Jumbo, Amazing Oriental, doner/kebap, "Supermar").
- `CACHE_NAME` bumped to `pocket-ledger-v2`.

## 1. Push to a repo

Create a new GitHub repo (public — GitHub Pages is free only on public repos
unless you're on GitHub Pro/Team), then push these files to the repo root:

```
index.html
app.js
storage-shim.js
manifest.json
sw.js
.nojekyll
icons/
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  icon-512-maskable.png
```

```bash
git init
git add .
git commit -m "Pocket Ledger — static build"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 2. Enable Pages

Repo → **Settings → Pages** → under "Build and deployment", set **Source** to
`Deploy from a branch`, branch `main`, folder `/ (root)` → Save.

Wait ~1 minute, then your app is live at:

```
https://<your-username>.github.io/<repo-name>/
```

## 3. Install on your iPhone

1. Open that URL in **Safari** (not Chrome — iOS only allows home-screen
   install from Safari).
2. Tap the Share icon → **Add to Home Screen**.
3. It launches full-screen, with the navy/yellow icon and no browser chrome.

## 4. Redeploying after changes

Every time you (or I) update `app.js`, bump `CACHE_NAME` in `sw.js` (e.g.
`pocket-ledger-v2`) before pushing — otherwise the service worker may keep
serving the old cached version to an already-installed phone.

## Optional: custom domain

If you have a domain, add a `CNAME` file at the repo root containing just the
domain (e.g. `ledger.yourdomain.com`), then point a DNS `CNAME` record at
`<your-username>.github.io`. GitHub Pages settings will confirm once it's
detected.
