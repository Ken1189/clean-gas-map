# Camera-based vitals (rPPG) SDK vendors: Shen.AI vs alternatives, for a peptide/GLP-1 safety app (Zimbabwe, then Africa)

Research date: 27 Nov 2026. Method note: shen.ai, pricing.shen.ai, developer.shen.ai, context7.com, medrxiv.org and pmc.ncbi.nlm.nih.gov could not be reached from this research session (the network blocked them), so Shen.AI facts come from search-engine extracts of those pages plus pages fetched directly from pub.dev. The pub.dev API names were verified by fetching the pages. Treat figures from search extracts as "vendor-stated, extract-verified" and re-check them on the live pages before signing a contract.

## 1. Shen.AI (MX Labs): metrics, validation, regulatory status, data handling

### Takeaway
Shen.AI sells a broad camera SDK that it markets as covering "30+ health markers", including HR, HRV, BP, breathing rate, BMI and risk indices. The vendor says video is processed on the device. A CE Class IIa "Medical SDK" (TÜV Rheinland, July 2026) covers vitals including BP, and the company also cites ANVISA (Brazil) Class II. The vendor's own BP accuracy figures are modest: systolic MAE 10.18 mmHg and diastolic MAE 6.22 mmHg. That is well outside the ISO 81060-2 cuff-replacement threshold (mean error ≤5 ± 8 mmHg), so BP should be presented as an estimate or trend, not a diagnostic reading. I found no independent (non-vendor) validation and no skin-tone breakdown.

### Cited Findings
- Shen.AI markets "30+ health markers" from a face scan, including heart rate, blood pressure and BMI, plus derived indices such as body fat percentage and basal metabolic rate. The SDK integrates into web or mobile apps. — [Shen.AI health markers](https://shen.ai/health-markers) (search extract)
- The Flutter SDK API confirms these result and risk surfaces: `getHeartRate10s()`, `getHeartRate4s()`, `getMeasurementResults() → Future<MeasurementResults?>`, `getRealtimeMetrics(double period_sec)`, `getHealthRisks() → Future<HealthRisks>`, `computeHealthRisks(RisksFactors healthRisksFactors)`, `getFullPpgSignal()`, `getResultAsFhirObservation()`, `sendResultFhirObservation(String url)`, `setBpCalibrationOffset(double systolic_offset, double diastolic_offset)`, `setPrecisionMode(PrecisionMode mode)`, `getMeasurementResultsPdfUrl()`, `sendMeasurementResultsPdfToEmail(String email)`. The library also exports enums `HealthIndex` and `Metric`. — [pub.dev ShenaiSdk class](https://pub.dev/documentation/shenai_sdk/latest/shenai_sdk/ShenaiSdk-class.html); [pub.dev shenai_sdk library](https://pub.dev/documentation/shenai_sdk/latest/shenai_sdk/)
- **Regulatory:** the Medical SDK received CE certification from TÜV Rheinland in July 2026 as a Class IIa device under the EU MDR. The certified scope includes systolic and diastolic BP. Shen AI Vitals is also registered with ANVISA (Brazil) as a Class II medical device. — [Shen.AI blog "now CE certified"](https://shen.ai/blog/now-ce-certified); [Shen.AI medical device page](https://shen.ai/medical-device) (search extracts). Shen.AI also has a GitHub repo for the ANVISA variant. — [github.com/mxlaboratories/shenai-anvisa](https://github.com/mxlaboratories/shenai-anvisa)
- **ISO 13485 (conflicting):** an older blog post says Shen.AI is "ISO27001 compliant, GDPR compliant, and on the way to being compliant with ISO 13485". The clinical-trials page says Shen AI "operates under ISO 13485 and GDPR". The July 2026 CE IIa certification implies a certified QMS, but I did not see the certificate. — [Shen.AI blog](https://shen.ai/blog/leaving-devices-behind); [Shen.AI clinical trials page](https://shen.ai/use-cases/clinical-trials)
- **FDA:** I found no FDA 510(k) for Shen.AI in any result.
- **Accuracy (vendor figures):** systolic BP MAE 10.18 mmHg (ME 4.60) and diastolic MAE 6.22 mmHg (ME 2.57). The latest study had 132 adults over two clinical visits, and the vendor says individual calibration improves agreement with a cuff. BP needs a single 60-second recording. — [Shen.AI medical device page](https://shen.ai/medical-device); [How accurate is Shen AI?](https://shen.ai/blog/how-accurate-is-shen-ai); [Shen AI Clinical Trial Report PDF](https://cdn.prod.website-files.com/680280c18df8e68403545b30/69442890c0ea75659d0412a9_Shen_AI_Clinical_Trial_Report%20(2).pdf)
- A registered trial (NCT06829615) studies contactless HR, HRV, breathing rate and BP against auscultatory BP. — [ClinicalTrials.gov NCT06829615](https://clinicaltrials.gov/study/NCT06829615)
- **Data handling:** the vendor says camera processing runs "100% on the user's device, with no cloud dependency". The clinical-trials page says "the video never leaves the phone" and nothing goes to the Shen AI cloud. The docs say video analysis runs locally on the device or in the browser. — [Shen.AI SDK page](https://shen.ai/sdk); [Shen.AI clinical trials](https://shen.ai/use-cases/clinical-trials); [developer.shen.ai](https://developer.shen.ai/) (search extracts)
- **HIPAA:** I found no vendor statement. Only a third-party directory lists HIPAA next to GDPR. — [healthaidb Shen.AI](https://www.healthaidb.com/software/shen-ai/)
- **Customers:** Wellx, a MENA health platform, reported nearly 500,000 vital checks in 2025. It says Shen.AI BP estimates "closely matched cuff readings in internal comparisons", which is a vendor case study, not independent validation. — [Shen.AI customer story](https://shen.ai/customer-story/turning-daily-engagement-into-preventive-health)
- **Africa:** a directory lists Africa among Shen.AI's available regions, but I found no named African customer or partnership. — [healthaidb Shen.AI](https://www.healthaidb.com/software/shen-ai/)

### Inferences
- With BP MAE around 10 mmHg systolic, a GLP-1 safety app should not use the Shen.AI BP number to gate dosing decisions. HR and resting-HR trend (GLP-1 agonists raise resting HR) is the more defensible use. BP should be framed as "estimated, confirm with a cuff". The SDK's `setBpCalibrationOffset` supports a cuff-calibration workflow, which would improve per-user accuracy.
- CE IIa status helps with credibility and could support a medical-device claim in markets that recognise CE. It does not by itself give registration in Zimbabwe (see section 7).

### Gaps
- I could not open the clinical trial report to check participant skin-tone (Fitzpatrick) distribution, HR, HRV or breathing-rate MAE, or how participants were selected.
- I did not see the exact list of metrics in the CE certificate scope, for example whether HRV and breathing rate are certified or wellness-only.
- I found no independent peer-reviewed validation of Shen.AI.

## 2. Shen.AI platforms and integration mechanics (license keys, tokens, SDK size, offline use)

### Takeaway
Shen.AI supports Android, iOS, Web (WebAssembly), Flutter, React Native, Capacitor and MAUI. I verified the Flutter `initialize(apiKey, userId, ...)` signature on pub.dev. Every SDK needs an internet connection the first time it runs, to activate the license and download models. On mobile, the license can then be cached for a limited offline period. I could not verify Web-SDK-specific function names, web-versus-mobile keys, short-lived tokens or bundle size from a primary source.

### Cited Findings
- Supported platforms: Android, iOS, Web, Flutter, React Native, Capacitor and MAUI. — [developer.shen.ai system requirements](https://developer.shen.ai/getting-started/system-requirements) (search extract)
- **Flutter package** `shenai_sdk` v3.2.0 (published about 27 Nov 2026), from a verified publisher (shen.ai), for Android and iOS. Install with `flutter pub add shenai_sdk`. It needs iOS deployment target 15.0 or later. The native SDK resolves through Maven Central (Android) and Swift Package Manager (iOS), with CocoaPods as a fallback. The changelog entry for 3.2.0 reads "Pre-release validation build for package-manager staging". The license is listed as "unknown". — [pub.dev shenai_sdk](https://pub.dev/packages/shenai_sdk); [changelog](https://pub.dev/packages/shenai_sdk/changelog)
- Exact init signature (Flutter): `initialize(String apiKey, String userId, {InitializationSettings? settings}) → Future<InitializationResult>`. Related calls: `isInitialized()`, `deinitialize()`, `startMeasurement()`, `stopMeasurement()`, `isReadyToStartMeasurement()`, `setOperatingMode(OperatingMode mode)`, `setMeasurementPreset(MeasurementPreset preset)`, `setCustomMeasurementConfig(CustomMeasurementConfig config)`, `setShowUserInterface(bool show)`, `setEventCallback(EventCallback callback)`, `setLanguage(String language)`, `areRequiredModelsDownloaded()`, `getRequiredModelsDownloadProgressPercentage()` (documented as "Required model download percentage (0–100); 100 when ready, 0 before initialization"), `getCurrentSignalQualityMetric()`, `getBlockingMeasurementConditions()` and `getCurrentViolatedMeasurementEnvironmentCondition()` (environment checks such as lighting). — [pub.dev ShenaiSdk class](https://pub.dev/documentation/shenai_sdk/latest/shenai_sdk/ShenaiSdk-class.html)
- The `areRequiredModelsDownloaded` and model-download-progress calls show that the ML models are downloaded at runtime, not bundled with the app. — [pub.dev ShenaiSdk class](https://pub.dev/documentation/shenai_sdk/latest/shenai_sdk/ShenaiSdk-class.html)
- **Licensing:** the first initialization needs internet access to retrieve the license. On mobile, the license can be stored locally "for a limited period", so the SDK keeps working offline during that time. Integration examples need an API key from the Shen.AI Developer Portal. The Android app needs camera and internet permissions. — [developer.shen.ai system requirements / Android](https://developer.shen.ai/platforms/android) (search extract)
- **Web SDK:** it runs as WebAssembly and needs OffscreenCanvas with a WebGL 2 context, plus WebAssembly SIMD and exception handling. It uses the network to activate the license and download models and other assets. The docs recommend serving SDK JavaScript and WebAssembly assets with Brotli compression. — [developer.shen.ai system requirements](https://developer.shen.ai/getting-started/system-requirements) (search extract)
- A hosted playground exists. — [playground.shen.ai](https://playground.shen.ai/)
- The npm page for `shenai-sdk` returned HTTP 403, so I could not verify it. — [npmjs shenai-sdk](https://www.npmjs.com/package/shenai-sdk)

### Inferences
- A Flutter or React Native app gets native performance. A Web or PWA approach adds WebGL 2 and WASM-SIMD requirements, which many budget Android browsers and older WebViews may not meet.
- Because model download and licensing are network-dependent, the app should prefetch models over Wi-Fi at onboarding and design for the offline license grace window.

### Gaps
- I could not verify Web SDK init and result function names from a primary source, because developer.shen.ai and npm were blocked. Do not quote Web API names in specs until they are checked against developer.shen.ai/platforms/web.
- Whether separate web and mobile keys or short-lived server-minted tokens exist was unverified.
- SDK binary size, model download size and per-scan data usage: no figures found.
- The length of the offline license grace period was not stated in the extracts.

## 3. Shen.AI pricing: current truth vs conflicting public figures

### Takeaway
The official pricing site (pricing.shen.ai, seen through a search extract) shows Core at **€500/month**, billed monthly, with 500 scans included. Annual Core is €5,400/year. Pro and Enterprise are custom-priced, and there is a 30-day free trial. The extract has an internal conflict on overage (€0.20/scan in the plan detail vs €0.10 flat). Third-party figures (€900/month, $750, €1,500) do not match and look stale. Pricing is per-scan or per-user.

### Cited Findings
- pricing.shen.ai: plans are per-scan or per-user. Core is €500/month billed monthly with 500 scans/month included. The page gives extra scans at €0.20 each in one place and a flat €0.10 on every plan in another. Annual Core is €5,400/year. Pro and Enterprise are custom-priced. There is a 30-day free trial. — [pricing.shen.ai](https://pricing.shen.ai/) (search extract; the page itself was unreachable)
- G2 lists Core, Standard and Pro at $500, $1,000 and $1,500 per month, attributed to Shen.AI. — [G2 Shen.AI](https://www.g2.com/products/shen-ai/reviews)
- SourceForge and Slashdot list a starting price of €900/month with a free trial. — [SourceForge](https://sourceforge.net/software/product/Shen-AI/); [Slashdot](https://slashdot.org/software/p/Shen-AI/)
- Shen.AI's LinkedIn mentions a 30-day free SDK trial. — [LinkedIn Shen.AI](https://ee.linkedin.com/company/shenai)
- healthaidb says to contact the vendor for pricing. — [healthaidb](https://www.healthaidb.com/software/shen-ai/)

### Inferences
- At €500 for 500 scans, entry cost is about €1/scan until volume grows, which is expensive for a low-ARPU African market. Negotiating a per-scan or emerging-market deal under Pro or Enterprise is likely needed.
- The "$750/month Core" and "€1,500/month" figures in the brief were not found in any current source. €1,500 may be a garbled form of G2's $1,500 "Pro" tier.

### Gaps
- I found no dedicated startup or pilot program and no NGO or emerging-market pricing.
- Whether the Medical (CE) SDK costs more than the wellness SDK was not determined.
- The €0.10 vs €0.20 overage conflict needs direct confirmation.

## 4. Competitors: metrics, regulatory status, pricing, platforms, Africa presence

### Takeaway
Only NuraLogix has a confirmed FDA 510(k), K253650 (June 2026), and it covers only pulse rate and respiration rate. Lifelight has the strongest BP regulatory claim (CE Class IIa per its site) and is the only vendor validated in an African population, where it performed poorly for BP. Binah positions its core product as wellness. Its partner Comestai holds a CE MDR Class I certification for a Binah-powered app. No vendor publishes pricing except Shen.AI.

### Cited Findings
- **NuraLogix (Anura / DeepAffex):** the FDA 510(k) K253650 clears the Anura Mobile Core SDK for pulse rate and respiration rate. Coverage is limited to adults 18+ who are relaxed, still and seated upright, and the device is "not designed to treat or diagnose". — [MPO Mag](https://www.mpo-mag.com/breaking-news/fda-clears-nuralogixs-anura-mobile-core-sdk-for-heart-respiration-rate-measurement/); [Med-Tech Insights, 17 Jun 2026](https://med-techinsights.com/2026/06/17/nuralogix-anura-mobile-core-sdk-receives-fda-clearance-for-contactless-measurement/); [Citeline](https://insights.citeline.com/medtech-insight/market-intelligence/data-trackers/us-510k-clearances/nuralogix-wins-fda-clearance-for-two-contactless-vital-sign-measurements-3GNUXFCSENA73K2JI74R42ZYY4/). DeepAffex was described in a 2022 brochure as a cloud-based SaaS with cloud APIs, unlike Shen.AI's on-device processing. — [NuraLogix brochure 2022](https://www.nuralogix.ai/wp-content/uploads/2022/01/Final_Product_Brochure_Jan4.21.pdf)
- **FaceHeart (Taiwan):** FDA 510(k) for heart rate on the FaceHeart app (2023), with a later clearance for the respiratory-rate component of its SDK. It runs on edge devices without a cloud service. — [MobiHealthNews](https://www.mobihealthnews.com/news/asia/taiwanese-ai-company-obtains-510k-video-based-respiratory-rate-gauge)
- **Binah.ai:** its January 2026 announcement describes its own product as intended for general wellness. A CE MDR Class I certification belongs to Comestai's Binah-powered app, web platform and SDK. It is offered as an SDK for spot and continuous monitoring. — [Upvio blog 2026](https://upvio.com/blog/10-best-ai-powered-remote-health-monitoring-platforms-2026); [MedCity News 2022](https://medcitynews.com/2022/01/turning-the-smartphone-camera-into-a-blood-pressure-monitor/)
- **Lifelight (Xim, UK):** its site claims an EU MDR CE Class IIa mark and "medically certified" cuff-equivalent BP. It describes the basis inconsistently (MDD in one place, UK MDR in another), and trade press calls it "Class II". — [lifelight.ai](https://lifelight.ai/); [Med-Tech Insights 2025](https://med-techinsights.com/2025/06/25/lifelight-becomes-world-first-smartphone-app-to-replace-blood-pressure-cuffs/); [ERGO 2026](https://www.ergo.com/en/radar-magazine/digitalisation-and-technology/2026/lifelight-start-up-health-monitoring-blood-pressure-measurement-smartphone). The VISION-D and VISION-V studies reported 70.1% sensitivity and 71.7% specificity. — [ResearchGate VISION-D/V](https://www.researchgate.net/publication/365412155_Measurement_of_Vital_Signs_Using_Lifelight_Remote_Photoplethysmography_Results_of_the_VISION-D_and_VISION-V_Observational_Studies)
- **IntelliProve (Belgium):** CE Class I under the EU MDR, working toward IIa. It raised a €2.7M seed round in Nov 2026 and is pivoting partly to humanoid robots. — [The Next Web](https://thenextweb.com/news/intelliprove-2-7m-seed-face-scan-humanoid-robots); [TFN](https://techfundingnews.com/intelliprove-raises-e2-7m-from-miles-ahead-to-turn-any-camera-into-a-health-sensor/)
- **Vastmindz (UK):** SDKs for iOS, Android and Web. The technology page is about 3 years old, and I found no CE claim. — [Vastmindz technology](https://www.vastmindz.com/technology)
- **Vitalera (Spain):** this is primarily a device-integration and RPM platform covering 30+ medical devices. Its SDK v2 is Kotlin Multiplatform, plus Web. CE classification is inconsistent (MDR "CE-marked" in the docs, "Class IIb" on the homepage). — [Vitalera docs](https://docs-v2.vitalera.io/getting-started/introduction); [SDK overview](https://docs-v2.vitalera.io/sdks/overview); [vitalera.io](https://www.vitalera.io/)
- **Upvio Vitals AI:** says it was evaluated across Fitzpatrick I–VI and claims a CE MDR Class IIa model. — [Upvio Vitals AI](https://upvio.com/vitals-ai)
- **Circadify:** runs smartphone rPPG work in Uganda (community screening plus darker-skin data collection) and has hired a Head of Global Health Research. This is the only vendor I found with active sub-Saharan field work. — [Circadify blog](https://circadify.com/blog/rppg-technology-global-health-sub-saharan-africa); [Circadify hire](https://circadify.com/blog/circadify-welcomes-travor-nkolo-head-global-health-research)
- A market report claims FDA clearances for Oxehealth, NuraLogix and Cardiomo. This is a low-reliability source, and only the NuraLogix clearance is independently confirmed above. — [Dataintelo](https://dataintelo.com/report/ai-powered-remote-vital-sign-camera-market)

### Inferences
- For a BP-centred safety feature, no vendor offers independently proven, cuff-equivalent accuracy on dark skin. Shen.AI's advantages are on-device processing, the broadest platform list (Flutter, React Native, Capacitor) and transparent entry pricing. NuraLogix has the cleanest FDA story but only for HR and RR, and its processing is cloud-based (bad for Zimbabwe bandwidth).

### Gaps
- Docsun and Veyetals: no results found.
- Pricing for Binah, NuraLogix, FaceHeart, Lifelight, Vastmindz and IntelliProve: none published. The vendors must be contacted.
- I found no confirmed African deployments for Binah, NuraLogix or Vastmindz. I did not check EUDAMED or MHRA databases directly.

## 5. Accuracy on darker skin (Fitzpatrick V–VI) and African validation

### Takeaway
The evidence shows a real but variable skin-tone gap, which is worse for older algorithms and in low light. The only African field study (Lifelight in Nigeria, BMJ Open 2026) found near-zero sensitivity for detecting hypertension: 0.04 systolic overall and 0.00 for Fitzpatrick VI. Rural use also failed because of bandwidth. No Shen.AI skin-tone-stratified data was found.

### Cited Findings
- An audit of 100 rPPG studies in npj Digital Medicine found darker skin tones significantly under-represented. It cites Dasari et al.: chrominance methods rose from about 5.2 bpm MAE on Fitzpatrick I–III to 14.1 bpm on V–VI, and deep-learning methods rose from 6.0 to 9.5 bpm. — [Nature npj Digital Medicine](https://www.nature.com/articles/s41746-025-01973-9); [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12491395/)
- A 2026 webcam rPPG study found darker skin associated with lower accuracy. The gap narrowed significantly under moderate-to-high illumination. — [Behavior Research Methods 2026](https://link.springer.com/article/10.3758/s13428-026-02953-x)
- Public datasets MMSE-HR, AFRL and UBFC-RPPG contain about 10%, 0% and 5% dark-skinned subjects respectively. — [arXiv 2106.06007](https://arxiv.org/pdf/2106.06007)
- Lifelight VISION-MD found no skin-tone effect on ME or MAE. The authors note that the Fitzpatrick 5–6 subgroups were underpowered. — [Nature npj audit context](https://www.nature.com/articles/s41746-025-01973-9) (search extract); an older medRxiv study also reported no significant skin-tone differences. — [medRxiv 2023](https://www.medrxiv.org/content/10.1101/2023.04.02.23288057v1.full.pdf)
- **Nigeria field study (Lifelight; Dasa and Davies, BMJ Open 2026;16(6):e119311).** The study was run at 3 hospitals in Kebbi State and enrolled 306 patients and 30 staff. Valid readings were obtained for 81.4% of participants. Agreement with the cuff was poor. Specificity was high (systolic 0.99) but systolic sensitivity was 0.04 overall and 0.00 for Fitzpatrick VI. The tool worked for most urban participants but failed at the rural site because of bandwidth. Patients and staff found it acceptable, but it is "not recommended for population screening without further algorithmic and operational improvements". — [PubMed 42331583](https://pubmed.ncbi.nlm.nih.gov/42331583/); [Bournemouth eprints](https://eprints.bournemouth.ac.uk/42099/); [medRxiv preprint](https://www.medrxiv.org/content/10.1101/2025.10.13.25337878v1.full) (search extracts; the full text was unreachable)
- Smartwatch PPG reviews are mixed, with several studies finding no skin-tone effect. — [ResearchGate](https://www.researchgate.net/publication/396296472_Photoplethysmography_in_Diverse_Skin_Tones_Evaluating_Bias_in_Smartwatch_Health_Monitoring)

### Inferences
- The Nigeria result is the most decision-relevant evidence for Zimbabwe. A CE-marked rPPG BP tool almost entirely missed hypertension in very dark skin. Shen.AI's BP should be assumed to have a similar risk until Shen.AI provides Fitzpatrick V–VI-stratified data. A local validation pilot in Zimbabwe (rPPG vs validated cuff, n≈100+, Fitzpatrick-stratified) should come before any BP-based safety alerting.
- HR is likely more robust than BP on dark skin, especially with good lighting. Shen.AI's environment-condition checks (`getBlockingMeasurementConditions`) can enforce lighting.

### Gaps
- Shen.AI's validation cohort skin-tone distribution and Fitzpatrick-stratified MAE: not found.
- I found no validation of any rPPG vendor in Zimbabwe or southern Africa.

## 6. Do peptide/GLP-1/weight-loss apps or telehealth firms use Shen.AI or other rPPG?

### Takeaway
Shen.AI explicitly markets a GLP-1 and weight-management use case: BMI estimate in about 5 seconds, BP and resting HR within 30 seconds, vitals at each dose step, with the clinician making the final call. I found no named GLP-1 telehealth customer of Shen.AI or any other rPPG vendor.

### Cited Findings
- The Shen.AI weight-management use-case page describes screening before prescribing, capturing vitals at each dose step, and using the BMI estimate alongside self-reported height and weight, with the clinician making the final call. — [Shen.AI weight management](https://shen.ai/use-cases/weight-management)
- Shen.AI blog on AI tools for obesity control. — [Shen.AI modern obesity control](https://shen.ai/blog/modern-obesity-control)
- Wellx (MENA insurance and wellness) uses Shen.AI at scale, with about 500,000 checks in 2025. It is not a GLP-1 provider. — [Shen.AI customer story](https://shen.ai/customer-story/turning-daily-engagement-into-preventive-health)

### Inferences
- The vendor's own framing ("informs, not replaces, clinical decisions") matches a safety app's needs: trend resting HR and BP across GLP-1 dose escalation and flag for clinician review.

### Gaps
- I found no public evidence of named GLP-1 or peptide telehealth companies (for example Hims, Ro or Noom) using any rPPG SDK.

## 7. Practical concerns for Zimbabwe: low-end Android, data, lighting, connectivity, licensing

### Takeaway
Shen.AI's minimum spec is Android 8.0 or later, a 64-bit ARM CPU, 4 GB RAM and OpenGL ES 3.1, with 30 fps at 640×480 or more. Many entry-level phones common in Zimbabwe (2–3 GB RAM) will be excluded. Network is needed for the first license activation and model download, but not for per-scan video upload. That is an advantage over cloud-processed vendors, given the rural bandwidth failure in Nigeria.

### Cited Findings
- Android requirements: Android 8.0 (API 26) or later, arm64-v8a CPU, at least 4 GB RAM and OpenGL ES 3.1. On older phones the native SDK may run better than the Web SDK. The camera must deliver a steady 30 fps at 640×480 or higher, uncompressed. — [developer.shen.ai system requirements](https://developer.shen.ai/getting-started/system-requirements); [Shen.AI blog system and hardware requirements](https://shen.ai/blog/system-and-hardware-requirements) (search extracts)
- iOS deployment target 15.0 or later (Flutter plugin). — [pub.dev shenai_sdk](https://pub.dev/packages/shenai_sdk)
- First initialization needs internet for the license. The license is cached on mobile for a limited offline period. Models are downloaded at runtime. — [developer.shen.ai Android](https://developer.shen.ai/platforms/android); [pub.dev ShenaiSdk class](https://pub.dev/documentation/shenai_sdk/latest/shenai_sdk/ShenaiSdk-class.html)
- In the Nigeria Lifelight study, the rural site failed because of bandwidth. — [PubMed 42331583](https://pubmed.ncbi.nlm.nih.gov/42331583/) (search extract). Circadify reports that weaker bandwidth correlated with higher failure rates. — [Circadify blog](https://circadify.com/blog/rppg-technology-global-health-sub-saharan-africa)
- Lighting: accuracy differences across Fitzpatrick types narrow under moderate-to-high illumination. — [Behavior Research Methods 2026](https://link.springer.com/article/10.3758/s13428-026-02953-x)
- A BP measurement needs a 60-second recording. — [Shen AI Clinical Trial Report](https://cdn.prod.website-files.com/680280c18df8e68403545b30/69442890c0ea75659d0412a9_Shen_AI_Clinical_Trial_Report%20(2).pdf)

### Inferences
- Prefer a native or Flutter/React Native build over Web/PWA for Zimbabwe. Prefetch models on Wi-Fi. Add in-app lighting coaching. Expect to exclude phones under 4 GB RAM, and possibly offer a manual-entry (cuff) fallback.
- On regulation, CE IIa and ANVISA do not automatically register a device in Zimbabwe. Local registration with MCAZ (the Medicines Control Authority of Zimbabwe) would need to be checked; I did not research this, so it is an inference only. A wellness-framed claim ("estimate, not diagnosis") likely lowers the regulatory burden.

### Gaps
- Exact model and asset download size, and per-scan data use: not found.
- I did not research MCAZ or other African regulators' treatment of software medical devices or rPPG.
- I found no published performance benchmarks on specific low-end Android models common in Zimbabwe (for example Tecno, Itel, Infinix, Samsung A0x).
- Shen.AI license terms for operating in African countries (territory restrictions, data residency): not found.
