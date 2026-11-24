# PeptiSafe Africa: research, positioning and roadmap

*Compiled 24 Nov 2026. Re-verify anything regulatory before relying on it.*

## 1. Shen.AI: what it gives us

- **What it is:** a B2B SDK, not a consumer app. It uses remote photoplethysmography (rPPG) to estimate 30+ health markers from a ~30-second selfie-camera face scan, including heart rate, HRV, blood pressure, breathing rate and a face-based BMI estimate. ([shen.ai/sdk](https://shen.ai/sdk))
- **Platforms:** Web SDK (needs a *Web* key, cross-origin isolation headers) plus iOS, Android, Flutter, React Native, Capacitor and MAUI (need a *mobile* key). The backend can mint short-lived tokens so the permanent key is never shipped. ([developer.shen.ai](https://developer.shen.ai/))
- **Pricing:** published figures conflict: a 30-day free trial, "from $0.10 per scan" plus a platform fee, a Core plan around $750/month, and other listings at €900 or €1,500/month. **Get a written quote.** ([shen.ai/pricing](https://shen.ai/pricing))
- **Accuracy caveat:** the vendor calls it clinically validated, but an earlier vendor post said BP validation was still underway in 2025. rPPG is also known to be less accurate on darker skin tones in some studies, so **ask Shen.AI for validation data on African populations (Fitzpatrick V–VI)** before marketing BP numbers. Until then the app treats camera BP as an *estimate* and asks users to confirm high readings with a cuff (already built into the safety engine).
- **How we use it:** Shen gives the vitals; *we* own the peptide-specific safety logic. For BMI we use measured height and weight, which is more reliable than a face estimate.

## 2. Competitor landscape

The App Store has dozens of GLP-1 and peptide trackers (PepTrack, Injex, Regimen, PeptiPal, PepDose, Peptide Stack Tracker, DoneDose and others). Common features: dose log, reminders, body-map site rotation, half-life "drug level" curves, reconstitution calculators. Typical price is $9.99/month or $59.99/year.

**Gaps we fill:**
1. **No vitals.** None of them measure anything; they are logbooks. We add a camera check-in plus BP/HR/BMI safety rules.
2. **No triage.** They do not turn symptoms and readings into "call your doctor today" guidance.
3. **US-centric.** No African regulators, emergency numbers, counterfeit checks, offline mode or low-data design.
4. **Several actively help with dosing of unapproved "research" peptides** (reconstitution calculators for BPC-157 etc.). That is a regulatory and liability risk we deliberately avoid.

## 3. The African context

- **Demand is booming and the grey market is large.** South Africa's regulator SAHPRA and the Pharmacy Council raided a Pretoria producer of "compounded" semaglutide/tirzepatide in May 2026, seized stock, and issued a Class I recall. There are reports of jabs sold in gyms and hair salons and smuggled API from China. SAHPRA launched a WHO-backed 2026–2030 action plan on illicit GLP-1s. ([SAHPRA](https://www.sahpra.org.za/press-releases/sahpra-and-the-sapc-crack-down-on-unlawful-manufacturing-of-unregistered-glp-1-medicines/), [TimesLIVE](https://www.timeslive.co.za/news/south-africa/2026-05-25-sahpra-cracks-down-on-illegal-weight-loss-drugs-as-glp-1-demand-booms/), [Cliffe Dekker Hofmeyr](https://www.cliffedekkerhofmeyr.com/en/news/publications/2026/South-Africa/Healthcare-Pharmaceuticals/Healthcare-and-pharmaceuticals-alert-27-may-Compounded-GLP-1-medicines-under-sustained-scrutiny-in-South-Africa-as-SAHPRA-and-SAPC-take-enforcement-action))
- **Kenya:** the Pharmacy and Poisons Board warned (after an INTERPOL alert) about fake "Ozempic" pens that were really relabelled insulin, a hypoglycaemia risk. ([Kenyans.co.ke](https://www.kenyans.co.ke/news/102899-pharmacy-and-poisons-board-cautions-kenyans-over-ozempic-after-interpol-alert))
- **Nigeria:** no NAFDAC GLP-1 notice was found in this scan. Research it before launching there.
- **So the strongest value proposition in Africa is safety and authenticity, not tracking.** The *Verify* tab and "where did you buy it" risk flag are core features, not extras.

## 4. Positioning

> **"Know it's real. Know you're OK."** The safety companion for GLP-1 and peptide users in Africa.

- **B2C:** free core safety features; premium (~R49 / ₦3,000 / KSh 300 per month) for unlimited face scans, reminders and clinician sharing. Scan costs (~$0.10) must be covered by the premium price.
- **B2B2C (likely the better business):** license to pharmacies (Dis-Chem, Clicks, Medplus, Goodlife), telehealth weight-loss clinics and medical schemes (Discovery Vitality-style). They get remote monitoring of GLP-1 patients; we get distribution and a prescriber in the loop.
- **Pharma / regulator angle:** anonymised counterfeit reports and adverse-event signals are valuable to SAHPRA's action plan and to Novo Nordisk and Lilly brand protection.

## 5. Roadmap

| Phase | Scope |
|---|---|
| **0: Prototype (this repo)** | PWA, safety engine + tests, demo scan, dose log, verify, clinician summary. |
| **1: Pilot (6–8 wks)** | Wire the Shen Web SDK and token backend. Clinical advisor review of all rules. Languages: English, isiZulu, Afrikaans, Swahili, Yoruba, Hausa, French. Dose reminders (push + SMS fallback). WhatsApp share. Pilot with 1 pharmacy group or telehealth clinic in South Africa. |
| **2: Clinician portal** | Opt-in encrypted sync (Supabase in an af-south region), clinician dashboard with flags, pharmacy-verified prescriptions, batch-number scan (barcode/QR) against regulator data where available. |
| **3: Native + scale** | Flutter app with the Shen mobile SDK, offline scans, Nigeria and Kenya launches, medical-scheme partnerships. |

## 6. Launch blockers (must do before real users)

1. **Clinical governance:** a registered clinician (doctor or pharmacist) reviews and signs off every threshold and message in `js/safety.js` and `js/data.js`. Keep a change log.
2. **Regulatory classification:** get a view on whether the triage features make this *software as a medical device* (SaMD) under SAHPRA's medical device rules (and the equivalents for NAFDAC and PPB). Positioning as "wellness and safety information that refers to clinicians" lowers the risk but does not remove it.
3. **Data protection:** POPIA (South Africa), NDPA 2023 (Nigeria), Kenya Data Protection Act 2019. Health data is special personal information. You need consent, an information officer, data residency and breach processes before any cloud sync. v0.1 keeps everything on-device, which keeps it simple.
4. **Shen.AI:** accuracy data on darker skin tones, the licence terms for health use in each country, and a cost per active user.
5. **Unapproved peptides:** a legal opinion on even *listing* BPC-157 and similar products. The current approach is harm reduction: it labels them unapproved, gives no dosing, and offers no reconstitution help for them.
6. **Advertising:** prescription-medicine advertising rules prohibit promoting brands to consumers in most of these markets. Marketing must be about safety, not about the drugs.
