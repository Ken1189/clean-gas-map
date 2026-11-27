# Shen.AI face scan: setup

The app uses the real Shen.AI Web SDK (`@shenai/sdk` 3.2.0). Without a licence it falls back to a clearly labelled demo scan.

## What the integration does

| Feature | Shen.AI API used | Where |
|---|---|---|
| 60 s (or 30 s) face scan: heart rate, blood pressure, HRV, breathing rate | `CreateShenaiSDK`, `initialize`, `setOperatingMode(MEASURE)`, `getMeasurementState`, `getMeasurementProgressPercentage`, `getMeasurementResults` | `js/shen.js` → Check-in tab |
| Guidance while scanning ("face a window", "rest the phone") | `MeasurementState` values | Check-in status line |
| Per-scan BP error estimate (±mmHg) | `quality_metrics.expected_sbp_mean_abs_error_mmHg` | shown under the readings |
| **Cuff calibration**: a cuff reading taken right after a scan improves future BP estimates | `submitCalibrationReading` | "These numbers are from a cuff" checkbox |
| **Read a BP machine photo** at a pharmacy | `readBpMonitorPhoto` | "Photo of a BP machine" button |
| Low-end phone check | WebGL 2 + `navigator.deviceMemory` | before download |
| Data-cost warning before the one-time ~35–40 MB download, then cached for 30 days | n/a | confirm dialog, server cache headers, service worker |

The SDK API names come from the package's own `index.d.ts` and Shen's official examples at github.com/mxlaboratories/shenai-sdk. The developer portal was unreachable from the build environment.

## Turn it on (local test)

```bash
cd peptide-app
npm run shen:install                     # downloads @shenai/sdk into node_modules (git-ignored)
SHEN_API_KEY=<your 32-hex WEB key> npm run start:shen
# open http://localhost:4173 → Check-in → Start face scan
```

Tested in this repo: the SDK downloads, runs in cross-origin-isolated mode, and reaches licence activation. A dummy key is rejected with `INVALID_API_KEY`, which is the expected behaviour. A real scan needs a real key.

## Before a pilot

1. **Sign the Shen.AI agreement.** The SDK licence forbids redistribution, so never commit `node_modules/@shenai` or copy it into the repo.
2. **Replace key passthrough with short-lived tokens.** `start:shen` sends the raw key to the browser, which is fine on localhost only. In production, `/api/shen-token` in `server.js` must mint a temporary token as described at developer.shen.ai/getting-started/authorization. That spot is marked in the code and returns 501 until it is done.
3. **Use the Web key** (a mobile key gives `INVALID_API_KEY` on web).
4. **Validate in Zimbabwe before trusting BP.** Shen's own study reports a systolic error of about 10 mmHg, with no breakdown by skin tone, and an independent Nigerian study of a different camera-BP product missed almost all hypertension in the darkest skin types. Run the pilot with a cuff alongside every scan, and keep the app's rule that camera BP is "confirm with a cuff", never a diagnosis.
5. **Device floor.** Shen needs a fairly capable phone (Android 8+, 64-bit, about 4 GB RAM). Many budget phones in Zimbabwe will fall back to manual or BP-machine-photo entry, which the app already supports.
6. **Native app later.** The same API exists in the Flutter and React Native SDKs (with a *mobile* key), which handle low-end Android and app-store distribution better.
