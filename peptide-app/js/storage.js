// On-device storage. Health data never leaves the phone in this version.
// (Cloud sync must wait until consent, encryption and data-residency rules —
// POPIA, NDPA, Kenya DPA — are designed in; see docs/RESEARCH.md.)

const KEY = 'peptisafe.v1';

const EMPTY = {
  profile: null,          // { name, country, heightCm, conditions[], hasPrescriber, consentAt }
  regimen: null,          // { peptideId, source, prescribedDose, unit }
  vitals: [],             // [{ date, source, heartRate, systolic, diastolic, hrv, weightKg, demo }]
  weights: [],            // [{ date, kg }]
  doses: [],              // [{ date, peptideId, amount, unit, siteId, note }]
  symptoms: [],           // [{ date, ids[] }]
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...structuredClone(EMPTY), ...JSON.parse(raw) } : structuredClone(EMPTY);
  } catch {
    return structuredClone(EMPTY);
  }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}

export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return structuredClone(EMPTY);
}

export function exportJson(state) {
  return new Blob([JSON.stringify({ app: 'peptisafe', version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
}
