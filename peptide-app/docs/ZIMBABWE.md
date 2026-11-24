# Launch plan: Zimbabwe first

*Drafted 24 Nov 2026. Items marked **verify** were found in news or secondary sources and must be confirmed with the authority before relying on them.*

## 1. Why Zimbabwe is a good first market

- **The problem is officially recognised.** In June 2025 the Medicines Control Authority of Zimbabwe (MCAZ) and the Health Professions Authority (HPA) jointly warned about the illegal sale and use of Ozempic as a "skinny jab". They said it is a prescription medicine to be used only under a registered professional, and that selling it without a licence is a criminal offence. ([Health Times](https://healthtimes.co.zw/zimbabwe-authorities-warn-against-illegal-use-of-ozempic-as-weight-loss-skinny-jab/), [The Herald](https://www.heraldonline.co.zw/skinny-jab-scandal-ozempic-weight-loss-craze-sparks-health-alarm-as-illegal-sales-flood-streets-socials/))
- **Grey market at high prices.** The Herald reported pens sold on social media for up to US$150, one Bulawayo seller asking US$600 a pen, counterfeits circulating, and sales through "fly-by-night beauty clinics". Doctors quoted warned of dehydration, kidney injury and heart problems. ([Herald](https://www.heraldonline.co.zw/perilous-quest-for-a-slender-look-diabetes-meds-abused-for-weight-loss/), [Herald](https://www.heraldonline.co.zw/slim-waists-sagging-skin-hollow-faces-the-skinny-jab-craze-sweeping-zimbabwe/))
- **Registration status is unclear (verify).** A private website says Ozempic was not MCAZ-registered as of Jan 2026, so much local supply may be imported from South Africa or be fake. Our *cross-border* source option and cold-chain warnings target exactly this.
- **Small, connected market.** It is easy to reach clinicians and pharmacies in Harare and Bulawayo, WhatsApp is the default channel, and there is a large diaspora in South Africa and the UK that already pays for family healthcare.
- **USD pricing** avoids currency risk for subscriptions and vendor costs (Shen.AI bills in USD/EUR).

## 2. What is already built for Zimbabwe (this commit)

- Zimbabwe is the default country, with MCAZ and HPA reporting routes and emergency numbers: 999, 994 (ambulance), 112 (Econet), 114 (NetOne). **Verify** these with the authorities before launch; sources disagree on whether 112 is reliable.
- Zimbabwe-specific counterfeit guidance, plus new "where did you get it" options: *Brought from another country (e.g. South Africa)* (cold-chain warning) and *Beauty / slimming clinic* (high risk; ask for the licence and practising certificate).
- A **Send on WhatsApp** button for the clinician summary.
- **Power cuts and keeping pens cold** guidance in Learn.
- Verify checklist: "receipt and pharmacy-level price" replaces "not suspiciously cheap", because local fakes are often sold *expensive*.

## 3. Legal and regulatory checklist

| # | Item | Who | Notes |
|---|---|---|---|
| 1 | **Register the company** (Zimbabwe Pvt Ltd, or operate through a SA/UK entity with a local partner) | You + lawyer | Needed for contracts with pharmacies and medical aids. |
| 2 | **POTRAZ data controller licence** (Form DP1) and appoint a **Data Protection Officer** | You + lawyer | Required under the Cyber and Data Protection Act [Ch 12:07] and S.I. 155 of 2024. POTRAZ is enforcing in 2026. Fees reported at US$50–2,000/yr. Health data needs **written consent** and, per one guide, processing under a health professional's supervision. ([MISA](https://zimbabwe.misa.org/2025/03/14/navigating-the-data-protection-act-requirements-ensuring-compliance-for-zimbabwean-data-controllers), [DLA Piper Africa](https://www.dlapiperafrica.com/en/zimbabwe/insights/2024/A-Quick-Start-Guide-to-Zimbabwes-Data-Protection-Regulations), [NewsDay](https://www.newsday.co.zw/news/article/200059372/doctors-decry-exhorbitant-new-data-levies)) |
| 3 | **MCAZ pre-submission meeting**: is the app a medical device (software)? | You + clinical advisor | Present it as safety information and referral, never dosing. Also ask about the GLP-1 registration status and the best channel for in-app ADR reports. A partnership on counterfeit reporting is a real win for them. |
| 4 | **HPA**: check that a partner clinic's premises are licensed | Partner | For the pilot sites. |
| 5 | **Clinical advisor**: a Zimbabwe-registered doctor (MDPCZ) and/or pharmacist (Pharmacists Council of Zimbabwe) | You | Signs off every rule and message. Ideally someone already treating diabetes or obesity. |
| 6 | **Privacy policy and consent screens** in English, Shona and Ndebele | Lawyer + translators | Written consent for health data, done in-app with a checkbox and timestamp (the timestamp already exists). |
| 7 | **No drug advertising** | Everyone | Market *safety* ("Is your skinny jab real?"), never brands or weight-loss results. |

v0.1 stores everything on the phone, so no health data reaches our servers. That keeps the pilot simple, but take legal advice on whether the licence is needed anyway. It definitely is once cloud sync or the clinician portal launches.

## 4. Product work before the pilot

1. **Shona and Ndebele.** Use native-speaker medical translators, then clinician review. Do not machine-translate safety warnings. The app needs a translation framework first so translated strings can be dropped in.
2. **Shen.AI.** Get a quote and pilot pricing. Ask for validation data on darker skin tones and the size of the Web SDK download (data costs matter here). Test on the cheap Android phones common in Zimbabwe.
3. **Dose reminders** (push, plus an SMS fallback via a local gateway).
4. **Payments** for premium: EcoCash, InnBucks or OneMoney via a local aggregator, plus card for diaspora buyers.
5. **"Gift to family" diaspora plan.** Someone in Johannesburg or London pays for a parent or sibling in Harare.

## 5. Business model and numbers

- **Free tier:** dose log, safety checks, Verify, Learn, manual readings.
- **Premium, about US$3/month:** face scans, reminders, WhatsApp clinician reports.
- **Shen.AI cost:** about $0.10 per scan, so 4 scans a month cost $0.40 per user. Reported platform fees of $750+/month mean **about 250 paying users just to cover the fee**. Negotiate startup or pilot pricing, or get a partner to sponsor scans.
- **Better route, B2B2C:** a medical aid (e.g. CIMAS, PSMAS, First Mutual Health; **verify** interest) or a pharmacy group pays per monitored member. That gives distribution, a clinician in the loop, and legitimacy with MCAZ.

## 6. Pilot (8 weeks)

- **Sites:** 1–2 licensed pharmacies and 1 diabetes or weight-management practice in Harare, with Bulawayo as a second wave.
- **Users:** 50–100 adults on, or starting, GLP-1 medicines under a clinician.
- **Measure:** weekly check-in rate; number of red-flag alerts and how many led to contact with a clinician; suspected fakes reported; double-dose catches; 8-week retention; user feedback on language and data usage.
- **Exit criteria for public launch:** clinical sign-off, the POTRAZ licence, translations done, Shen accuracy acceptable on the pilot group (compared against a cuff), and no safety incidents attributable to the app.

## 7. Open questions to resolve

- Are semaglutide or tirzepatide currently registered with MCAZ? Which brands, and at what pharmacy price?
- Which emergency number reliably reaches an ambulance from each mobile network today?
- Does MCAZ have an online ADR form or API we can link to directly?
- Is a POTRAZ licence needed for a fully on-device app, or only once data is collected?
