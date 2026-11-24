// Reference data: countries, peptides, symptoms, injection sites.
// IMPORTANT: Regulatory status changes. Every entry here must be re-verified
// against the national regulator's register before launch (see docs/RESEARCH.md).

export const COUNTRIES = {
  ZA: {
    name: 'South Africa',
    emergency: '10177 (ambulance) · 112 from a mobile',
    regulator: 'SAHPRA',
    regulatorUrl: 'https://www.sahpra.org.za',
    reportSideEffect: 'Report side effects and suspected fakes with the SAHPRA Med Safety app or at sahpra.org.za.',
    verifyTip: 'Buy only from a registered pharmacy with a prescription. Check the pack has a SAHPRA registration number. Compounded semaglutide/tirzepatide products have been seized and recalled by SAHPRA (2026).',
    currency: 'ZAR',
  },
  NG: {
    name: 'Nigeria',
    emergency: '112',
    regulator: 'NAFDAC',
    regulatorUrl: 'https://www.nafdac.gov.ng',
    reportSideEffect: 'Report side effects and suspected fakes to NAFDAC (pharmacovigilance e-reporting) or the nearest NAFDAC office.',
    verifyTip: 'Check the NAFDAC registration number on the pack and use the scratch-code Mobile Authentication Service where available. Buy only from a licensed pharmacy.',
    currency: 'NGN',
  },
  KE: {
    name: 'Kenya',
    emergency: '999 · 112',
    regulator: 'Pharmacy and Poisons Board (PPB)',
    regulatorUrl: 'https://web.pharmacyboardkenya.org',
    reportSideEffect: 'Report side effects and suspected fakes on the PPB pharmacovigilance portal or at your nearest health facility.',
    verifyTip: 'The PPB has warned about falsified "Ozempic" pens that were really relabelled insulin. Check the product is registered with the PPB and buy from a licensed pharmacy.',
    currency: 'KES',
  },
  GH: {
    name: 'Ghana',
    emergency: '112 · 193 (ambulance)',
    regulator: 'Food and Drugs Authority (FDA Ghana)',
    regulatorUrl: 'https://fdaghana.gov.gh',
    reportSideEffect: 'Report side effects and suspected fakes to FDA Ghana.',
    verifyTip: 'Check the FDA Ghana registration number and buy only from a licensed pharmacy.',
    currency: 'GHS',
  },
  OTHER: {
    name: 'Other African country',
    emergency: '112 (works on most mobile networks)',
    regulator: 'your national medicines regulator',
    regulatorUrl: '',
    reportSideEffect: 'Report side effects and suspected fakes to your national medicines regulator or a health facility.',
    verifyTip: 'Buy only from a licensed pharmacy with a prescription and check the pack for a registration number.',
    currency: 'USD',
  },
};

// status:
//   'approved-rx'  – an approved prescription medicine in at least some markets
//   'unapproved'   – not approved for human use anywhere; no verified dosing
// weightLoss: true if mainly used for weight management (drives BMI rules)
// glp1Class: true for GLP-1 / GIP class (drives class contraindications)
export const PEPTIDES = [
  {
    id: 'semaglutide',
    name: 'Semaglutide',
    brands: 'Ozempic, Wegovy, Rybelsus (tablet)',
    status: 'approved-rx',
    glp1Class: true,
    weightLoss: true,
    frequency: 'weekly',
    summary: 'GLP-1 receptor agonist. Approved for type 2 diabetes and, as Wegovy, weight management. Prescription only.',
    commonEffects: ['Nausea', 'Vomiting', 'Diarrhoea', 'Constipation', 'Reduced appetite'],
    watchFor: ['Severe stomach pain (pancreatitis)', 'Gallbladder problems', 'Dehydration / kidney strain', 'Low blood sugar if also on insulin or sulfonylureas', 'Changes in vision'],
  },
  {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    brands: 'Mounjaro, Zepbound',
    status: 'approved-rx',
    glp1Class: true,
    weightLoss: true,
    frequency: 'weekly',
    summary: 'Dual GIP/GLP-1 receptor agonist. Approved for type 2 diabetes and weight management in many markets. Prescription only.',
    commonEffects: ['Nausea', 'Diarrhoea', 'Vomiting', 'Constipation', 'Reduced appetite'],
    watchFor: ['Severe stomach pain (pancreatitis)', 'Gallbladder problems', 'Dehydration / kidney strain', 'Low blood sugar if also on insulin or sulfonylureas'],
  },
  {
    id: 'liraglutide',
    name: 'Liraglutide',
    brands: 'Victoza, Saxenda',
    status: 'approved-rx',
    glp1Class: true,
    weightLoss: true,
    frequency: 'daily',
    summary: 'Daily GLP-1 receptor agonist. Approved for type 2 diabetes and, as Saxenda, weight management. Prescription only.',
    commonEffects: ['Nausea', 'Diarrhoea', 'Headache', 'Reduced appetite'],
    watchFor: ['Severe stomach pain (pancreatitis)', 'Gallbladder problems', 'Fast heart rate'],
  },
  {
    id: 'bpc157',
    name: 'BPC-157',
    brands: 'Sold online as a "research chemical"',
    status: 'unapproved',
    glp1Class: false,
    weightLoss: false,
    frequency: 'unknown',
    summary: 'Not approved for human use by any major regulator. Human safety data is very limited and products sold online are unregulated: purity, dose and sterility are unknown.',
    commonEffects: [],
    watchFor: ['Injection site infection', 'Allergic reaction', 'Any unexpected symptom: stop and see a clinician'],
  },
  {
    id: 'tb500',
    name: 'TB-500 (thymosin beta-4 fragment)',
    brands: 'Sold online as a "research chemical"',
    status: 'unapproved',
    glp1Class: false,
    weightLoss: false,
    frequency: 'unknown',
    summary: 'Not approved for human use. Banned in sport. No established human dosing. Products are unregulated.',
    commonEffects: [],
    watchFor: ['Injection site infection', 'Allergic reaction', 'Any unexpected symptom: stop and see a clinician'],
  },
  {
    id: 'ghs',
    name: 'CJC-1295 / Ipamorelin (GH secretagogues)',
    brands: 'Sold online as "research chemicals"',
    status: 'unapproved',
    glp1Class: false,
    weightLoss: false,
    frequency: 'unknown',
    summary: 'Not approved for human use. May affect blood sugar, fluid retention and hormone levels. Products are unregulated.',
    commonEffects: [],
    watchFor: ['High blood sugar symptoms (thirst, frequent urination)', 'Swelling of hands/feet', 'Injection site infection'],
  },
  {
    id: 'other',
    name: 'Other / not listed',
    brands: '',
    status: 'unapproved',
    glp1Class: false,
    weightLoss: false,
    frequency: 'unknown',
    summary: 'We have no safety information for this product. Talk to a clinician or pharmacist before using it.',
    commonEffects: [],
    watchFor: ['Any unexpected symptom: stop and see a clinician'],
  },
];

// Medical history flags captured at onboarding.
export const CONDITIONS = [
  { id: 'pregnant', label: 'Pregnant, breastfeeding or trying to conceive' },
  { id: 'mtc_men2', label: 'Personal or family history of medullary thyroid cancer or MEN2' },
  { id: 'pancreatitis', label: 'Past pancreatitis' },
  { id: 'type1', label: 'Type 1 diabetes' },
  { id: 'type2', label: 'Type 2 diabetes' },
  { id: 'insulin_su', label: 'Take insulin or a sulfonylurea (e.g. gliclazide, glimepiride)' },
  { id: 'kidney', label: 'Kidney disease' },
  { id: 'gallbladder', label: 'Gallbladder disease or gallstones' },
  { id: 'eating_disorder', label: 'Current or past eating disorder' },
  { id: 'hypertension', label: 'High blood pressure' },
  { id: 'heart', label: 'Heart disease' },
  { id: 'retinopathy', label: 'Diabetic eye disease (retinopathy)' },
];

// Symptoms the user can log. level: 'emergency' | 'urgent' | 'clinician' | 'common'
export const SYMPTOMS = [
  { id: 'breathing', label: 'Swelling of face/throat or trouble breathing', level: 'emergency',
    advice: 'Possible severe allergic reaction. Call emergency services now.' },
  { id: 'abdo_severe', label: 'Severe stomach pain that will not go away (may spread to the back)', level: 'urgent',
    advice: 'This can be pancreatitis. Stop the product and get medical care today.' },
  { id: 'ruq_pain', label: 'Pain in upper right belly, fever, or yellow skin/eyes', level: 'urgent',
    advice: 'This can be a gallbladder problem. Get medical care today.' },
  { id: 'no_fluids', label: 'Cannot keep fluids down for more than 24 hours', level: 'urgent',
    advice: 'Risk of dehydration and kidney injury. Get medical care today.' },
  { id: 'hypo', label: 'Shaky, sweaty, confused or faint (possible low blood sugar)', level: 'urgent',
    advice: 'If you have a glucose meter, check now. Take sugar if low. Get help if you do not improve quickly.' },
  { id: 'chest', label: 'Chest pain or fainting', level: 'emergency',
    advice: 'Call emergency services now.' },
  { id: 'vision', label: 'Sudden change in vision', level: 'urgent',
    advice: 'Get an eye or medical check today.' },
  { id: 'neck_lump', label: 'Lump in the neck, hoarse voice or trouble swallowing', level: 'clinician',
    advice: 'Book a clinician visit soon and mention the product you use.' },
  { id: 'site_infection', label: 'Injection site hot, red, swollen or leaking pus', level: 'clinician',
    advice: 'Possible infection. See a clinician. Do not inject into that area.' },
  { id: 'mood', label: 'Low mood or thoughts of self-harm', level: 'urgent',
    advice: 'Please talk to someone today: a clinician, a trusted person, or a crisis line.' },
  { id: 'nausea', label: 'Nausea', level: 'common',
    advice: 'Common, especially after a dose increase. Eat smaller meals, stop eating when full, avoid fatty food.' },
  { id: 'vomiting', label: 'Vomiting (a few times)', level: 'common',
    advice: 'Sip fluids often. If it continues or you cannot keep fluids down, get care.' },
  { id: 'diarrhoea', label: 'Diarrhoea', level: 'common',
    advice: 'Drink plenty of fluids (oral rehydration solution helps).' },
  { id: 'constipation', label: 'Constipation', level: 'common',
    advice: 'Drink water, add fibre. Ask a pharmacist if it lasts more than a few days.' },
  { id: 'fatigue', label: 'Tiredness', level: 'common',
    advice: 'Make sure you are eating enough protein and drinking enough fluids.' },
];

export const INJECTION_SITES = [
  { id: 'abd_ul', label: 'Belly – upper left' },
  { id: 'abd_ur', label: 'Belly – upper right' },
  { id: 'abd_ll', label: 'Belly – lower left' },
  { id: 'abd_lr', label: 'Belly – lower right' },
  { id: 'thigh_l', label: 'Left thigh' },
  { id: 'thigh_r', label: 'Right thigh' },
  { id: 'arm_l', label: 'Left upper arm' },
  { id: 'arm_r', label: 'Right upper arm' },
];

export const SOURCES = [
  { id: 'pharmacy_rx', label: 'Licensed pharmacy, with prescription', risk: 'low' },
  { id: 'clinic', label: 'Doctor / clinic', risk: 'low' },
  { id: 'compounding', label: 'Compounding pharmacy', risk: 'medium' },
  { id: 'online', label: 'Online shop / social media', risk: 'high' },
  { id: 'gym_salon', label: 'Gym, salon or friend', risk: 'high' },
  { id: 'unknown', label: 'Not sure', risk: 'high' },
];

export function peptideById(id) {
  return PEPTIDES.find((p) => p.id === id) || PEPTIDES.find((p) => p.id === 'other');
}
