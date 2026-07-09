# Imperium Player 

A player companion PWA for **Dune: Adventures in the Imperium** (Modiphius 2d20):
character + House creation wizards, a full in-play tracker, and a native 2d20 dice
engine. Installable on phone, tablet, and desktop; works fully offline.

## Run it

No build step. Serve the folder with any static server and open it:

```sh
cd dune
python3 -m http.server 8321
# → http://localhost:8321
```

Everything runs in **local mode** by default — characters live in your browser's
localStorage, no account or network needed. Install it from your browser's
"Add to Home Screen" / "Install app" prompt.

## Hosted on GitHub Pages

The app is published straight from this repo (no build step) at:

**https://arti47.github.io/dune-player/**

Deployment is automated by `.github/workflows/pages.yml`, which runs on every push
to `main`. First-time setup (once per repo): **Settings → Pages → Build and
deployment → Source → "GitHub Actions"**. The workflow attempts to enable this
automatically on its first run; if the site 404s, set the source manually and
re-run the workflow. All paths in the app are relative, so it works correctly from
the `/dune-player/` sub-path.

## Cloud sync (optional, Phase 5)

1. Create a Firebase project with **Realtime Database**, **Storage**, and
   **Anonymous Authentication** enabled.
2. Paste your web-app config into `firebase-config.js` and set
   `FIREBASE_ENABLED = true`.
3. Deploy `database.rules.json` as your Realtime Database security rules.
4. Never commit real keys to a public repository.

## Tests

```sh
npm test        # static + data-invariant checks (no install needed)
```

The full headless-browser regression harness lands in the Hardening phase
(dev-only `playwright-core`; `node_modules` is gitignored).

## Project spec

`CLAUDE.md` is the canonical living spec: the completed System Profile, the data
extraction ledger, the roadmap, and the changelog. Every code change updates it in
the same change.

## Licensing note

This app is a **personal play aid** built from the owner's own rulebooks. It
contains paraphrased rules mechanics only — no book text, art, or logos. If you
publish or distribute this app or its data files, licensing is **your**
responsibility; openly licensed material is the only safe basis for anything
public. *Dune: Adventures in the Imperium* is © its respective rights holders.
