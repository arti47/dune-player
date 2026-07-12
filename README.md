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

## Cloud sync (optional) — real-time multiplayer

The app runs fully offline by default. Turn on cloud mode to share a campaign,
pools, and conflict across devices in real time. You only need a free Google
account. Steps:

**1. Create a Firebase project**
Go to <https://console.firebase.google.com> → **Add project** → name it (e.g.
`imperium-player`) → Google Analytics is optional (you can turn it off) →
**Create project**.

**2. Add a Web app and copy the config**
In the project overview, click the **Web** icon (`</>`) → register the app with
any nickname (you do **not** need Firebase Hosting) → copy the `firebaseConfig`
object it shows you (apiKey, authDomain, databaseURL, projectId, …).

**3. Enable Anonymous Authentication**
Left menu → **Build → Authentication → Get started → Sign-in method** → enable
**Anonymous** → Save. (Optional, for account linking later: also enable
**Google**.)

**4. Create the Realtime Database**
**Build → Realtime Database → Create Database** → pick a location → start in
**locked mode** (you'll deploy your own rules next) → Enable. Copy the database
URL it gives you and make sure it matches `databaseURL` in your config.

**5. Deploy the security rules**
Realtime Database → **Rules** tab → replace everything with the contents of
[`database.rules.json`](database.rules.json) from this repo → **Publish**. These
rules are what actually protect your data (role-based, per-node).

**6. (Optional) Storage for portraits**
**Build → Storage → Get started** — only needed later for character portraits.

**7. Turn it on in the app**
Open [`firebase-config.js`](firebase-config.js), paste your config values, and
set `FIREBASE_ENABLED = true`.

**8. Test with two devices**
Open the app on two browsers/devices. On one, **Settings → Campaign & party →
Create a campaign**, then share the join code. On the other, join with that
code — party, roles, and shared pools should sync live.

### Security — read this

- **Firebase web config is not a secret.** The `apiKey` identifies your project;
  it is not a password. It is normal and safe for it to be visible in your site's
  source — access is enforced by **Anonymous Auth + the Realtime Database rules
  you deployed in step 5**, not by hiding the config. (This is Google's own
  guidance.)
- Because GitHub Pages serves `firebase-config.js` publicly, committing real
  values makes them visible. That's acceptable *with the rules in place*. To
  reduce abuse, in **Google Cloud console → APIs & Services → Credentials**
  restrict your Browser API key to your Pages domain (HTTP-referrer restriction),
  and consider enabling **App Check**.
- If you'd rather not expose the config at all, keep a **local, uncommitted**
  `firebase-config.js` (add it to `.gitignore`) and only run cloud mode locally.
  Leave the committed file as the placeholder (`FIREBASE_ENABLED = false`) so
  clone-and-run stays keyless for anyone else.
- **Never commit a config with `FIREBASE_ENABLED = true`** to a repo you don't
  control the access rules for.

> **Status:** the local-first layer (campaigns, roles, memorable join codes,
> party) works today with no setup. The cloud sync adapter (`src/cloud.js`) is
> new and **has not been tested against a live Firebase backend** — this guide
> gets your project ready; expect a short debugging pass the first time you
> enable it.

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
