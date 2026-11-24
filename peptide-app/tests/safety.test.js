import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bmi, bmiCategory, assess, checkDose, suggestSite, mgToVolume, weeklyWeightChangePct, nextDueDate,
} from '../js/safety.js';

const NOW = new Date('2026-11-24T08:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();
const codes = (r) => r.alerts.map((a) => a.code);

test('bmi and category', () => {
  assert.equal(bmi(170, 72.25), 25);
  assert.equal(bmiCategory(bmi(170, 72.25)), 'Overweight');
  assert.equal(bmi(0, 70), null);
  assert.equal(bmiCategory(17), 'Underweight');
});

test('hypertensive crisis is urgent; camera reading asks for cuff confirmation', () => {
  const r = assess({ profile: {}, vitals: { date: daysAgo(0), source: 'shen', systolic: 185, diastolic: 100, heartRate: 80 }, now: NOW });
  assert.equal(r.level, 'urgent');
  assert.ok(codes(r).includes('bp:crisis'));
  assert.match(r.alerts[0].detail, /cuff/);
});

test('emergency symptom outranks everything', () => {
  const r = assess({ profile: {}, symptoms: ['breathing'], vitals: { date: daysAgo(0), systolic: 150, diastolic: 95 }, now: NOW });
  assert.equal(r.level, 'emergency');
  assert.equal(r.alerts[0].code, 'symptom:breathing');
});

test('underweight on a weight-loss peptide is urgent', () => {
  const r = assess({ profile: { heightCm: 170 }, vitals: { date: daysAgo(0), weightKg: 50 }, regimen: { peptideId: 'semaglutide', source: 'pharmacy_rx' }, now: NOW });
  assert.ok(codes(r).includes('bmi:underweight'));
  assert.equal(r.level, 'urgent');
});

test('BMI 28 without comorbidity is a caution, with comorbidity it is not flagged', () => {
  const base = { vitals: { date: daysAgo(0), weightKg: 81 }, regimen: { peptideId: 'tirzepatide', source: 'pharmacy_rx' }, now: NOW };
  assert.ok(codes(assess({ ...base, profile: { heightCm: 170, conditions: [] } })).includes('bmi:below_threshold'));
  assert.ok(!codes(assess({ ...base, profile: { heightCm: 170, conditions: ['hypertension'] } })).includes('bmi:below_threshold'));
});

test('BMI rules do not apply to non-weight-loss peptides', () => {
  const r = assess({ profile: { heightCm: 170 }, vitals: { date: daysAgo(0), weightKg: 50 }, regimen: { peptideId: 'bpc157' }, now: NOW });
  assert.ok(!codes(r).includes('bmi:underweight'));
  assert.ok(codes(r).includes('product:unapproved'));
});

test('GLP-1 contraindications are flagged', () => {
  const r = assess({ profile: { conditions: ['mtc_men2', 'pregnant', 'insulin_su'] }, regimen: { peptideId: 'semaglutide' }, now: NOW });
  for (const c of ['contra:mtc', 'contra:pregnancy', 'interaction:hypo']) assert.ok(codes(r).includes(c), c);
});

test('high-risk source and no prescriber are flagged', () => {
  const r = assess({ profile: { hasPrescriber: false }, regimen: { peptideId: 'tirzepatide', source: 'gym_salon' }, now: NOW });
  assert.ok(codes(r).includes('source:high'));
  assert.ok(codes(r).includes('rx:none'));
});

test('GI symptoms + fast pulse => dehydration flag', () => {
  const r = assess({ profile: {}, symptoms: ['vomiting'], vitals: { date: daysAgo(0), heartRate: 108, systolic: 110, diastolic: 70 }, now: NOW });
  assert.ok(codes(r).includes('combo:dehydration'));
});

test('weight trend', () => {
  const weights = [{ date: daysAgo(14), kg: 100 }, { date: daysAgo(7), kg: 97 }, { date: daysAgo(0), kg: 94 }];
  assert.equal(weeklyWeightChangePct(weights, NOW), -3);
  const r = assess({ profile: { heightCm: 175 }, weights, regimen: { peptideId: 'semaglutide' }, now: NOW });
  assert.ok(codes(r).includes('weight:very_rapid'));
  assert.equal(weeklyWeightChangePct([{ date: daysAgo(2), kg: 90 }, { date: daysAgo(0), kg: 89 }], NOW), null);
});

test('stale vitals prompt a check-in', () => {
  assert.ok(codes(assess({ profile: {}, now: NOW })).includes('checkin:stale'));
  assert.ok(!codes(assess({ profile: {}, vitals: { date: daysAgo(1), systolic: 120, diastolic: 80, heartRate: 70 }, now: NOW })).includes('checkin:stale'));
});

test('healthy reading with approved product from pharmacy is all clear', () => {
  const r = assess({ profile: { heightCm: 170, conditions: ['type2'], hasPrescriber: true }, vitals: { date: daysAgo(0), source: 'manual', systolic: 122, diastolic: 78, heartRate: 72, weightKg: 95 }, regimen: { peptideId: 'semaglutide', source: 'pharmacy_rx' }, now: NOW });
  assert.equal(r.level, 'info');
  assert.equal(r.alerts.length, 0);
});

test('checkDose catches a weekly double dose and unit slips', () => {
  const history = [{ peptideId: 'semaglutide', date: daysAgo(2), amount: 0.25, unit: 'mg', siteId: 'abd_ul' }];
  const w = checkDose({ peptideId: 'semaglutide', date: daysAgo(0), amount: 25, unit: 'mg', siteId: 'abd_ul' }, history);
  const c = w.map((x) => x.code);
  assert.ok(c.includes('dose:too_soon'));
  assert.ok(c.includes('dose:big_jump'));
  assert.ok(c.includes('site:repeat'));
});

test('checkDose is quiet for a normal weekly dose', () => {
  const history = [{ peptideId: 'tirzepatide', date: daysAgo(7), amount: 2.5, unit: 'mg', siteId: 'abd_ul' }];
  assert.deepEqual(checkDose({ peptideId: 'tirzepatide', date: daysAgo(0), amount: 5, unit: 'mg', siteId: 'abd_ur' }, history), []);
});

test('suggestSite picks least recently used site', () => {
  const s = suggestSite([{ siteId: 'abd_ul', date: daysAgo(1) }]);
  assert.notEqual(s.id, 'abd_ul');
});

test('mgToVolume converts and warns', () => {
  assert.deepEqual(mgToVolume(0.25, 2.5), { ml: 0.1, units: 10, warnings: [] });
  assert.equal(mgToVolume(5, 2.5).warnings.length, 1);
  assert.ok(mgToVolume(0, 1).error);
});

test('nextDueDate', () => {
  assert.equal(nextDueDate(daysAgo(7), 'weekly').getTime(), NOW);
  assert.equal(nextDueDate(daysAgo(7), 'unknown'), null);
});

test('Zimbabwe sources: cross-border import warns about cold chain, beauty clinic is high risk', () => {
  const xb = assess({ profile: {}, regimen: { peptideId: 'semaglutide', source: 'cross_border' }, now: NOW });
  const a = xb.alerts.find((x) => x.code === 'source:cross_border');
  assert.ok(a);
  assert.match(a.detail, /cold/);
  const bc = assess({ profile: {}, regimen: { peptideId: 'semaglutide', source: 'beauty_clinic' }, now: NOW });
  assert.match(bc.alerts.find((x) => x.code === 'source:high').detail, /licence/);
});

test('every non-low-risk source has warning text', async () => {
  const { SOURCES, COUNTRIES, DEFAULT_COUNTRY } = await import('../js/data.js');
  for (const s of SOURCES.filter((x) => x.risk !== 'low')) assert.ok(s.warning, s.id);
  assert.equal(DEFAULT_COUNTRY, 'ZW');
  assert.equal(Object.keys(COUNTRIES)[0], 'ZW');
});
