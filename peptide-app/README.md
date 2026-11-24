# PeptiSafe Africa (prototype v0.1)

An offline-first phone web app (PWA) that helps people in Africa use peptide medicines **more safely**.
It is a safety companion, not a dosing tool: it never recommends a dose.

## What it does

| Area | What the user gets |
|---|---|
| **Health check-in** | Shen.AI-style 30-second face scan (heart rate, blood pressure, HRV) or manual entry from a cuff and scale, plus a symptom checklist. |
| **Safety engine** | BMI and weight-trend rules, blood pressure and heart rate thresholds, GLP-1 contraindications (thyroid cancer/MEN2, pregnancy, pancreatitis, type 1 diabetes, eating disorders), hypoglycaemia risk with insulin or sulfonylureas, dehydration combos, red-flag symptoms. Each result gets one of five levels, from *All clear* to *Emergency*, with the country's emergency number. |
| **Dose log** | Logs the prescribed dose and catches double doses (weekly < 72 h, daily < 20 h), more-than-double jumps (mg/mL/unit slips), unit changes and repeated injection sites. Suggests the next injection site. |
| **Vial converter** | Turns a *prescribed* mg dose and vial strength into mL and U-100 syringe units, with sanity warnings. |
| **Verify** | Country-specific counterfeit checklist and side-effect reporting for South Africa (SAHPRA), Nigeria (NAFDAC), Kenya (PPB) and Ghana (FDA Ghana). |
| **Learn** | Plain-language facts on semaglutide, tirzepatide and liraglutide. BPC-157, TB-500 and GH secretagogues are clearly marked *not approved*. |
| **Clinician summary** | A one-tap text summary of doses, readings, symptoms and flags to share with a clinician (WhatsApp/SMS via the share sheet). |
| **Privacy** | All data stays on the phone (localStorage). Backup download and delete-all are built in. |

Built for African conditions: no build step, under 100 KB, works offline after the first load, installs to the home screen, and works on low-end Android.

## Run it

```bash
cd peptide-app
npm start          # http://localhost:4173  (sends COOP/COEP headers for Shen.AI)
npm test           # safety-engine unit tests (node:test, no dependencies)
```

The camera needs `localhost` or HTTPS.

## Turning on real Shen.AI scans

Scans run in **demo mode** (simulated values, clearly labelled) until Shen.AI is wired in. See the steps at the top of `js/shen.js`. In short:

1. Get a **Web** licence key from Shen.AI (a mobile key fails on web).
2. Add a backend endpoint that mints short-lived Shen tokens. The permanent key never goes to the browser.
3. Self-host the Web SDK, set `shenTokenUrl` and `shenSdkUrl` in `index.html`, and complete `startShen()`.

## Layout

```
peptide-app/
  index.html, css/styles.css, manifest.webmanifest, sw.js, icon.svg
  js/app.js       UI (tabs: Home, Check-in, Doses, Verify, Learn, Me)
  js/safety.js    pure safety rules (no DOM), unit tested
  js/data.js      countries, peptides, symptoms, conditions, sites
  js/shen.js      vitals provider (demo / Shen.AI)
  js/storage.js   on-device storage
  tests/          node:test suite
  docs/RESEARCH.md  market scan, Shen.AI notes, regulation, roadmap
```

## Before any public launch

All safety thresholds and wording must be reviewed and signed off by a clinician, and the regulatory data re-verified per country. See `docs/RESEARCH.md`, section *Launch blockers*.
