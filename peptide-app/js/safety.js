// Safety engine. Pure functions, no DOM, so it runs in the browser and in Node tests.
//
// Design rule: this engine never recommends a dose. It flags risk, explains
// why, and tells the user who to talk to. Doses come from the user's prescriber.
//
// Thresholds are deliberately conservative and must be reviewed and signed off
// by a clinical advisor before launch (see docs/RESEARCH.md → Clinical governance).

import { peptideById, SYMPTOMS, SOURCES, INJECTION_SITES } from './data.js';

export const LEVELS = ['info', 'caution', 'clinician', 'urgent', 'emergency'];
const rank = (level) => LEVELS.indexOf(level);

export const LEVEL_TEXT = {
  info: 'All clear',
  caution: 'Take care',
  clinician: 'Talk to your clinician',
  urgent: 'Get medical care today',
  emergency: 'Emergency: call for help now',
};

// ---------- Body metrics ----------

export function bmi(heightCm, weightKg) {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!(h > 0.5 && h < 2.8) || !(w > 20 && w < 400)) return null;
  return Math.round((w / (h * h)) * 10) / 10;
}

export function bmiCategory(value) {
  if (value == null) return null;
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Overweight';
  if (value < 35) return 'Obesity class 1';
  if (value < 40) return 'Obesity class 2';
  return 'Obesity class 3';
}

const DAY = 24 * 60 * 60 * 1000;

// Average % body-weight change per week over the most recent window.
// Returns null if there are not two weigh-ins at least 7 days apart within ~5 weeks.
export function weeklyWeightChangePct(weights, now = Date.now()) {
  const pts = (weights || [])
    .filter((w) => w && w.kg > 0 && w.date)
    .map((w) => ({ t: new Date(w.date).getTime(), kg: Number(w.kg) }))
    .filter((p) => !Number.isNaN(p.t) && p.t <= now && p.t >= now - 35 * DAY)
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  // earliest point that is at least 7 days before the latest one
  const first = pts.find((p) => last.t - p.t >= 7 * DAY);
  if (!first) return null;
  const weeks = (last.t - first.t) / (7 * DAY);
  const pct = ((last.kg - first.kg) / first.kg) * 100;
  return Math.round((pct / weeks) * 100) / 100;
}

// ---------- Main assessment ----------

/**
 * @param {object} input
 * @param {object} input.profile   { heightCm, conditions: string[], hasPrescriber: boolean }
 * @param {object} [input.vitals]  latest { date, source:'shen'|'manual', heartRate, systolic, diastolic, hrv, weightKg }
 * @param {Array}  [input.weights] [{ date, kg }]
 * @param {object} [input.regimen] { peptideId, source }
 * @param {string[]} [input.symptoms] symptom ids reported in the last 72h
 * @param {number} [input.now]
 */
export function assess({ profile = {}, vitals = null, weights = [], regimen = null, symptoms = [], now = Date.now() }) {
  const alerts = [];
  const add = (level, code, title, detail) => alerts.push({ level, code, title, detail });
  const conditions = new Set(profile.conditions || []);
  const peptide = regimen && regimen.peptideId ? peptideById(regimen.peptideId) : null;
  const estimated = vitals && vitals.source === 'shen';
  const confirmNote = estimated
    ? ' This reading is a camera estimate. Confirm it with a blood pressure cuff (most pharmacies have one).'
    : '';

  // --- Symptoms ---
  for (const id of symptoms) {
    const s = SYMPTOMS.find((x) => x.id === id);
    if (!s) continue;
    add(s.level === 'common' ? 'info' : s.level, `symptom:${s.id}`, s.label, s.advice);
  }

  // --- Vitals ---
  if (vitals) {
    const sys = Number(vitals.systolic);
    const dia = Number(vitals.diastolic);
    const hr = Number(vitals.heartRate);

    if (sys >= 180 || dia >= 120) {
      add('urgent', 'bp:crisis', `${estimated ? 'Face scan suggests very' : 'Very'} high blood pressure (${sys}/${dia})`,
        'Sit quietly for 5 minutes and measure again. If it is still this high, or you have chest pain, headache, weakness or vision changes, get care now.' + confirmNote);
    } else if (sys >= 140 || dia >= 90) {
      add('clinician', 'bp:high', `High blood pressure (${sys}/${dia})`,
        'Book a check with your clinician, especially before increasing your dose.' + confirmNote);
    } else if (sys > 0 && sys < 90) {
      add('caution', 'bp:low', `Low blood pressure (${sys}/${dia})`,
        'Drink fluids, particularly if you have had vomiting or diarrhoea. If you feel faint or dizzy, get care.' + confirmNote);
    }

    if (hr > 120) {
      add('urgent', 'hr:very_high', `Very fast resting heart rate (${hr} bpm)`,
        'Rest and measure again. If it stays above 120, or you feel unwell, get care today.');
    } else if (hr > 100) {
      add('clinician', 'hr:high', `Fast resting heart rate (${hr} bpm)`,
        'GLP-1 medicines can raise heart rate a little, and dehydration can raise it more. Mention this to your clinician.');
    } else if (hr > 0 && hr < 50) {
      add('caution', 'hr:low', `Slow resting heart rate (${hr} bpm)`,
        'This can be normal for very fit people. If you feel dizzy or faint, see a clinician.');
    }

    const gi = symptoms.some((id) => ['vomiting', 'diarrhoea', 'no_fluids'].includes(id));
    if (gi && (hr > 100 || (sys > 0 && sys < 100))) {
      add('clinician', 'combo:dehydration', 'Possible dehydration',
        'Stomach symptoms plus a fast pulse or low blood pressure can mean dehydration, which can harm the kidneys. Drink oral rehydration solution and talk to a clinician.');
    }
  }

  // --- BMI and weight trend ---
  const latestKg = (vitals && vitals.weightKg) || latestWeight(weights);
  const b = bmi(profile.heightCm, latestKg);
  const comorbid = ['type2', 'hypertension', 'heart'].some((c) => conditions.has(c));

  if (peptide && peptide.weightLoss && b != null) {
    if (b < 18.5) {
      add('urgent', 'bmi:underweight', `BMI ${b}: underweight`,
        'Weight-loss medicines should not be used when underweight. Stop and talk to a clinician before your next dose.');
    } else if (b < 25 && !conditions.has('type2')) {
      add('clinician', 'bmi:healthy', `BMI ${b}: healthy range`,
        'Weight-loss medicines are not usually prescribed at this BMI. Check with your prescriber whether you should continue.');
    } else if (b < 27 || (b < 30 && !comorbid)) {
      if (!conditions.has('type2')) {
        add('caution', 'bmi:below_threshold', `BMI ${b}`,
          'Weight-loss prescriptions usually need a BMI of 30 or more, or 27 or more with a weight-related condition. Make sure a clinician agreed this is right for you.');
      }
    }
  }

  const rate = weeklyWeightChangePct(weights, now);
  if (rate != null && rate <= -2.5) {
    add('clinician', 'weight:very_rapid', `Losing ${Math.abs(rate)}% of body weight per week`,
      'This is faster than expected and can cause gallstones, muscle loss and dehydration. Talk to your clinician.');
  } else if (rate != null && rate <= -1.5) {
    add('caution', 'weight:rapid', `Losing ${Math.abs(rate)}% of body weight per week`,
      'Fairly fast. Make sure you eat enough protein, drink enough fluids and keep active.');
  }

  // --- Medical history vs product ---
  if (peptide && peptide.glp1Class) {
    if (conditions.has('mtc_men2')) add('clinician', 'contra:mtc', 'Not suitable with this thyroid history',
      'GLP-1 medicines are not recommended for people with a personal or family history of medullary thyroid cancer or MEN2. Talk to your prescriber before the next dose.');
    if (conditions.has('pregnant')) add('clinician', 'contra:pregnancy', 'Not recommended in pregnancy or breastfeeding',
      'Stop and talk to your clinician. Weight-loss GLP-1 medicines are normally stopped at least 2 months before trying to conceive.');
    if (conditions.has('pancreatitis')) add('clinician', 'contra:pancreatitis', 'Past pancreatitis',
      'GLP-1 medicines need extra care after pancreatitis. Make sure your prescriber knows.');
    if (conditions.has('type1')) add('clinician', 'contra:type1', 'Type 1 diabetes',
      'These medicines are not a replacement for insulin. Use only under specialist care.');
    if (conditions.has('insulin_su')) add('caution', 'interaction:hypo', 'Low blood sugar risk',
      'Combined with insulin or a sulfonylurea, these medicines can cause low blood sugar. Your prescriber may need to lower those doses. Check your glucose more often.');
    if (conditions.has('eating_disorder')) add('clinician', 'contra:eating_disorder', 'Eating disorder history',
      'Appetite-suppressing medicines can be harmful with an eating disorder history. Please involve a clinician.');
    if (conditions.has('gallbladder')) add('caution', 'caution:gallbladder', 'Gallbladder history',
      'Watch for pain in the upper right belly, fever or yellow eyes.');
    if (conditions.has('kidney')) add('caution', 'caution:kidney', 'Kidney disease',
      'Vomiting and diarrhoea can strain the kidneys. Stay hydrated and keep your kidney checks up to date.');
    if (conditions.has('retinopathy')) add('caution', 'caution:retinopathy', 'Diabetic eye disease',
      'Rapid improvements in blood sugar can briefly worsen eye disease. Keep your eye checks up to date.');
  }

  if (peptide && peptide.status === 'unapproved') {
    add('caution', 'product:unapproved', `${peptide.name} is not an approved medicine`,
      'There is no verified safe human dose, and products sold online often contain the wrong amount, the wrong substance, or bacteria. This app will not suggest a dose.');
    if (conditions.has('pregnant')) add('clinician', 'unapproved:pregnancy', 'Unapproved product in pregnancy',
      'Please stop and talk to a clinician.');
  }

  if (peptide && peptide.status === 'approved-rx' && profile.hasPrescriber === false) {
    add('caution', 'rx:none', 'This is a prescription medicine',
      'It should be started and adjusted by a clinician who can check for side effects and interactions.');
  }

  if (regimen && regimen.source) {
    const src = SOURCES.find((s) => s.id === regimen.source);
    if (src && src.risk === 'high') {
      add('caution', 'source:high', 'High risk of a fake or contaminated product', src.warning);
    } else if (src && src.risk === 'medium') {
      add('caution', `source:${src.id}`, src.id === 'cross_border' ? 'Imported product: check it stayed cold' : 'Compounded product', src.warning);
    }
  }

  // --- Freshness ---
  if (!vitals || !vitals.date || now - new Date(vitals.date).getTime() > 14 * DAY) {
    add('info', 'checkin:stale', 'Time for a health check-in',
      'Do a face scan or enter your blood pressure, heart rate and weight. Regular readings help catch problems early.');
  }

  alerts.sort((a, b2) => rank(b2.level) - rank(a.level));
  const level = alerts.reduce((m, a) => (rank(a.level) > rank(m) ? a.level : m), 'info');
  return { level, alerts, bmi: b, bmiCategory: bmiCategory(b), weeklyWeightChangePct: rate };
}

function latestWeight(weights) {
  const sorted = [...(weights || [])].filter((w) => w.kg > 0).sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted.length ? Number(sorted[0].kg) : null;
}

// ---------- Dose logging checks ----------

const MIN_GAP_HOURS = { weekly: 72, daily: 20 };

/**
 * Checks a dose the user is about to log against their history.
 * Never suggests a dose; it only catches likely mistakes (double doses, unit slips).
 * @returns {Array<{level, code, title, detail}>}
 */
export function checkDose(newDose, history = []) {
  const warnings = [];
  const peptide = peptideById(newDose.peptideId);
  const same = history
    .filter((d) => d.peptideId === newDose.peptideId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const prev = same[0];

  if (prev) {
    const gapH = (new Date(newDose.date) - new Date(prev.date)) / 36e5;
    const minGap = MIN_GAP_HOURS[peptide.frequency];
    if (minGap && gapH >= 0 && gapH < minGap) {
      warnings.push({ level: 'urgent', code: 'dose:too_soon',
        title: 'Possible double dose',
        detail: `Your last ${peptide.name} dose was ${Math.round(gapH)} hours ago. A ${peptide.frequency} medicine should not be taken again this soon. Do not take another dose; ask your pharmacist or prescriber what to do.` });
    }
    if (Number(prev.amount) > 0 && Number(newDose.amount) > 2 * Number(prev.amount) && newDose.unit === prev.unit) {
      warnings.push({ level: 'clinician', code: 'dose:big_jump',
        title: 'Big dose increase',
        detail: `This is more than double your last dose (${prev.amount} ${prev.unit}). Check the number and the unit with your prescription. A slip between mg, mL and syringe units is a common cause of overdose.` });
    }
    if (prev.unit && newDose.unit && prev.unit !== newDose.unit) {
      warnings.push({ level: 'caution', code: 'dose:unit_change',
        title: 'Unit changed',
        detail: `Your last dose was logged in ${prev.unit}, this one in ${newDose.unit}. Make sure you have converted correctly.` });
    }
  }

  if (newDose.siteId && prev && prev.siteId === newDose.siteId) {
    warnings.push({ level: 'caution', code: 'site:repeat',
      title: 'Same injection site as last time',
      detail: 'Rotating sites helps prevent lumps and skin damage. Try the suggested site.' });
  }

  if (peptide.status === 'unapproved') {
    warnings.push({ level: 'caution', code: 'dose:unapproved',
      title: 'No verified dose exists for this product',
      detail: 'The app records what you take but cannot tell you whether the amount is safe.' });
  }
  return warnings;
}

export function nextDueDate(lastDoseDate, frequency) {
  if (!lastDoseDate) return null;
  const days = frequency === 'weekly' ? 7 : frequency === 'daily' ? 1 : null;
  if (!days) return null;
  return new Date(new Date(lastDoseDate).getTime() + days * DAY);
}

// Suggest the least recently used injection site.
export function suggestSite(history = []) {
  const lastUsed = new Map(INJECTION_SITES.map((s) => [s.id, 0]));
  for (const d of history) {
    if (d.siteId && lastUsed.has(d.siteId)) {
      lastUsed.set(d.siteId, Math.max(lastUsed.get(d.siteId), new Date(d.date).getTime()));
    }
  }
  let best = INJECTION_SITES[0];
  for (const s of INJECTION_SITES) if (lastUsed.get(s.id) < lastUsed.get(best.id)) best = s;
  return best;
}

// ---------- Unit converter (prescribed dose → what to draw up) ----------

/**
 * Converts a prescribed dose in mg to the volume to draw up, for a vial of known strength.
 * For pens, follow the pen's dial; this is for vials only.
 */
export function mgToVolume(doseMg, concentrationMgPerMl) {
  const dose = Number(doseMg);
  const conc = Number(concentrationMgPerMl);
  if (!(dose > 0) || !(conc > 0)) return { error: 'Enter the prescribed dose and the vial strength.' };
  const ml = dose / conc;
  const units = ml * 100; // U-100 insulin syringe: 100 units = 1 mL
  const warnings = [];
  if (units > 100) warnings.push('More than 1 mL: this will not fit in a standard 1 mL (100-unit) syringe. Re-check the numbers with your pharmacist.');
  if (units < 2) warnings.push('Very small volume (under 2 units). Small measuring errors make a big difference. Ask your pharmacist to show you how to measure it.');
  return { ml: Math.round(ml * 1000) / 1000, units: Math.round(units * 10) / 10, warnings };
}
