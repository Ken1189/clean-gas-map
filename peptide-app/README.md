# PeptiSafe Africa (prototype v0.1)

An offline-first phone web app (PWA) that helps people in Africa use peptide medicines **more safely**.
It is a safety companion, not a dosing tool: it never recommends a dose.

## What it does

| Area | What the user gets |
|---|---|
| **Health check-in** | Shen.AI face scan (heart rate, blood pressure, HRV, breathing rate), a photo of a pharmacy BP machine, or manual entry, plus a symptom checklist. Cuff readings can calibrate future face scans. |
| **Safety engine** | BMI and weight-trend rules, blood pressure and heart rate thresholds, GLP-1 contraindications (thyroid cancer/MEN2, pregnancy, pancreatitis, type 1 diabetes, eating disorders), hypoglycaemia risk with insulin or sulfonylureas, dehydration combos, red-flag symptoms. Each result gets one of five levels, from *All clear* to *Emergency*, with the country's emergency number. |
| **Dose log** | Logs the prescribed dose and catches double doses (weekly < 72 h, daily < 20 h), more-than-double jumps (mg/mL/unit slips), unit changes and repeated injection sites. Suggests the next injection site. |
| **Vial converter** | Turns a *prescribed* mg dose and vial strength into mL and U-100 syringe units, with sanity warnings. |
| **Verify** | Country-specific counterfeit checklist and side-effect reporting for Zimbabwe (MCAZ, HPA; the launch market), South Africa (SAHPRA), Nigeria (NAFDAC), Kenya (PPB) and Ghana (FDA Ghana). |
| **Learn** | Plain-language facts on semaglutide, tirzepatide and liraglutide. BPC-157, TB-500 and GH secretagogues are clearly marked *not approved*. |
| **Clinician summary** | A one-tap text summary of doses, readings, symptoms and flags, sent straight to WhatsApp or via the share sheet. |
| **Privacy** | All data stays on the phone (localStorage). Backup download and delete-all are built in. |

Built for African conditions: no build step, under 100 KB, works offline after the first load, installs to the home screen, and works on low-end Android.

## Run it

```bash
cd peptide-app
npm start          # http://localhost:4173  (sends COOP/COEP headers for Shen.AI)
npm test           # safety-engine unit tests (node:test, no dependencies)
```

The camera needs `localhost` or HTTPS.

## Shen.AI face scan

The app integrates the real Shen.AI Web SDK. It does face scans, calibration against a cuff reading, and reading the numbers off a photo of a BP machine. Without a licence key it falls back to a labelled demo scan.

```bash
npm run shen:install                                  # SDK into node_modules (never committed)
SHEN_API_KEY=<your WEB key> npm run start:shen        # local test only
```

See `docs/SHEN.md` for what it does, what was tested, and what to do before a pilot (short-lived tokens, Zimbabwe validation, device limits).

## Layout

```
peptide-app/
  index.html, css/styles.css, manifest.webmanifest, sw.js, icon.svg
  js/app.js       UI (tabs: Home, Check-in, Doses, Verify, Learn, Me)
  js/safety.js    pure safety rules (no DOM), unit tested
  js/data.js      countries, peptides, symptoms, conditions, sites
  js/shen.js      vitals provider (Shen.AI Web SDK / demo)
  js/storage.js   on-device storage
  tests/          node:test suite
  docs/RESEARCH.md  market scan, Shen.AI notes, regulation, roadmap
  docs/ZIMBABWE.md  launch plan for the first market
  docs/SHEN.md      Shen.AI integration and setup
  docs/COMPETITORS.md  competitor and rPPG vendor research
```

## Before any public launch

All safety thresholds and wording must be reviewed and signed off by a clinician, and the regulatory data re-verified per country. See `docs/RESEARCH.md`, section *Launch blockers*.
