import { COUNTRIES, DEFAULT_COUNTRY, PEPTIDES, CONDITIONS, SYMPTOMS, INJECTION_SITES, SOURCES, peptideById } from './data.js';
import { assess, checkDose, suggestSite, nextDueDate, mgToVolume, LEVEL_TEXT, bmi, bmiCategory } from './safety.js';
import { load, save, wipe, exportJson } from './storage.js';
import { createVitalsProvider } from './shen.js';

let state = load();
let tab = 'home';
const view = document.getElementById('view');
const tabs = document.getElementById('tabs');
const provider = createVitalsProvider();

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel) => view.querySelector(sel);
const fmtDate = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const localInput = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const country = () => COUNTRIES[state.profile?.country] || COUNTRIES.OTHER;
const latest = (arr) => [...(arr || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
const persist = () => save(state);

function recentSymptoms(hours = 72) {
  const since = Date.now() - hours * 36e5;
  return [...new Set(state.symptoms.filter((s) => new Date(s.date).getTime() >= since).flatMap((s) => s.ids))];
}

function currentAssessment() {
  return assess({
    profile: state.profile || {},
    vitals: latest(state.vitals) || null,
    weights: state.weights,
    regimen: state.regimen,
    symptoms: recentSymptoms(),
  });
}

function alertsHtml(alerts) {
  if (!alerts.length) return '<p class="muted">No warnings.</p>';
  return alerts.map((a) => `<div class="alert ${a.level}"><b>${esc(a.title)}</b>${esc(a.detail)}</div>`).join('');
}

function statusHtml(level) {
  const c = country();
  const help = (level === 'urgent' || level === 'emergency')
    ? `<p>Emergency number in ${esc(c.name)}: <b>${esc(c.emergency)}</b></p>` : '';
  return `<div class="status ${level}" role="status"><div class="t">${esc(LEVEL_TEXT[level])}</div>${help}</div>`;
}

function render() {
  if (!state.profile || !state.profile.consentAt) { tabs.hidden = true; return renderOnboarding(); }
  tabs.hidden = false;
  tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  ({ home: renderHome, checkin: renderCheckin, doses: renderDoses, verify: renderVerify, learn: renderLearn, me: renderMe }[tab])();
  view.focus({ preventScroll: true });
}

tabs.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  provider.stop();
  tab = b.dataset.tab;
  render();
  window.scrollTo(0, 0);
});

// ---------- onboarding ----------
function renderOnboarding(step = state.profile ? 'profile' : 'consent') {
  if (step === 'consent') {
    view.innerHTML = `
      <h1>Welcome</h1>
      <div class="card">
        <p><b>PeptiSafe helps you use peptide medicines more safely.</b> It logs your doses, checks your health readings and side effects, and tells you when to get help.</p>
        <p>It does <b>not</b> prescribe or recommend doses, and it does not replace a doctor, nurse or pharmacist.</p>
        <p>Your information stays on this phone. Nothing is uploaded.</p>
      </div>
      <label class="check"><input type="checkbox" id="c18"> I am 18 or older.</label>
      <label class="check"><input type="checkbox" id="cmed"> I understand this app gives safety information, not medical advice. In an emergency I will call for help.</label>
      <button class="btn" id="go" disabled>Continue</button>`;
    const upd = () => { $('#go').disabled = !($('#c18').checked && $('#cmed').checked); };
    $('#c18').onchange = upd; $('#cmed').onchange = upd;
    $('#go').onclick = () => renderProfileForm(true);
    return;
  }
  renderProfileForm(true);
}

function renderProfileForm(isOnboarding = false) {
  const p = state.profile || {};
  const r = state.regimen || {};
  const w = latest(state.weights);
  view.innerHTML = `
    <h1>${isOnboarding ? 'About you' : 'Edit profile'}</h1>
    <p class="muted">We use this to check for risks. Only you can see it.</p>
    <form id="pf">
      <label for="country">Country</label>
      <select id="country" required>${Object.entries(COUNTRIES).map(([k, c]) => `<option value="${k}" ${(p.country || DEFAULT_COUNTRY) === k ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <div class="row">
        <div><label for="height">Height (cm)</label><input id="height" type="number" inputmode="decimal" min="100" max="250" required value="${esc(p.heightCm ?? '')}"></div>
        <div><label for="weight">Weight (kg)</label><input id="weight" type="number" inputmode="decimal" min="25" max="350" step="0.1" required value="${esc(w?.kg ?? '')}"></div>
      </div>
      <label for="peptide">Which product do you use (or plan to use)?</label>
      <select id="peptide">${PEPTIDES.map((x) => `<option value="${x.id}" ${r.peptideId === x.id ? 'selected' : ''}>${esc(x.name)}${x.status === 'unapproved' ? ' (not approved)' : ''}</option>`).join('')}</select>
      <label for="source">Where do you get it?</label>
      <select id="source">${SOURCES.map((s) => `<option value="${s.id}" ${r.source === s.id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>
      <label>Is a doctor or nurse supervising this?</label>
      <div class="btns">
        <label class="check"><input type="radio" name="rx" value="yes" ${p.hasPrescriber !== false ? 'checked' : ''}> Yes</label>
        <label class="check"><input type="radio" name="rx" value="no" ${p.hasPrescriber === false ? 'checked' : ''}> No</label>
      </div>
      <h2>Health history</h2>
      <p class="muted">Tick anything that applies.</p>
      ${CONDITIONS.map((c) => `<label class="check"><input type="checkbox" name="cond" value="${c.id}" ${(p.conditions || []).includes(c.id) ? 'checked' : ''}> ${esc(c.label)}</label>`).join('')}
      <button class="btn" type="submit">${isOnboarding ? 'Start' : 'Save'}</button>
    </form>`;
  $('#pf').onsubmit = (e) => {
    e.preventDefault();
    const kg = Number($('#weight').value);
    state.profile = {
      ...p,
      country: $('#country').value,
      heightCm: Number($('#height').value),
      hasPrescriber: view.querySelector('input[name=rx]:checked').value === 'yes',
      conditions: [...view.querySelectorAll('input[name=cond]:checked')].map((i) => i.value),
      consentAt: p.consentAt || new Date().toISOString(),
    };
    state.regimen = { ...r, peptideId: $('#peptide').value, source: $('#source').value };
    if (kg && (!w || Number(w.kg) !== kg)) state.weights.push({ date: new Date().toISOString(), kg });
    persist();
    tab = 'home';
    render();
  };
}

// ---------- home ----------
function renderHome() {
  const a = currentAssessment();
  const v = latest(state.vitals);
  const pep = state.regimen ? peptideById(state.regimen.peptideId) : null;
  const lastDose = latest(state.doses.filter((d) => d.peptideId === pep?.id));
  const due = lastDose && nextDueDate(lastDose.date, pep.frequency);
  const rate = a.weeklyWeightChangePct;
  view.innerHTML = `
    ${statusHtml(a.level)}
    <div class="grid">
      <div class="tile"><div class="k">BMI</div><div class="v">${a.bmi ?? '–'}</div><div class="s">${esc(a.bmiCategory ?? 'Add height & weight')}</div></div>
      <div class="tile"><div class="k">Blood pressure</div><div class="v">${v?.systolic ? `${v.systolic}/${v.diastolic}` : '–'}</div><div class="s">${v ? esc(fmtDay(v.date)) + (v.source === 'shen' ? ' · scan' : '') : 'No reading yet'}</div></div>
      <div class="tile"><div class="k">Resting heart rate</div><div class="v">${v?.heartRate ?? '–'}</div><div class="s">bpm</div></div>
      <div class="tile"><div class="k">Next dose</div><div class="v" style="font-size:17px">${due ? esc(fmtDay(due)) : '–'}</div><div class="s">${esc(pep?.name ?? '')}</div></div>
    </div>
    ${rate != null ? `<p class="muted">Weight trend: ${rate > 0 ? '+' : ''}${rate}% per week</p>` : ''}
    <h2>What to watch</h2>
    ${alertsHtml(a.alerts)}
    <div class="btns">
      <button class="btn" data-go="checkin">Health check-in</button>
      <button class="btn secondary" data-go="doses">Log a dose</button>
    </div>
    <p class="disclaimer">PeptiSafe gives safety information, not medical advice. It never recommends doses.</p>`;
  view.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { tab = b.dataset.go; render(); }));
}

// ---------- check-in ----------
function renderCheckin() {
  const lastW = latest(state.weights);
  view.innerHTML = `
    <h1>Health check-in</h1>
    <div class="card">
      <h2 style="margin-top:0">Face scan</h2>
      <p class="muted">${provider.mode === 'demo'
        ? 'Demo mode: shows how the Shen.AI face scan will work. The numbers are made up.'
        : 'A 30-second face scan estimates heart rate, blood pressure and HRV.'}
        Sit still in good light, face the camera.</p>
      <div class="scan-box" id="scanbox" hidden></div>
      <div class="progress" id="prog" hidden><div></div></div>
      <button class="btn" id="scan">Start face scan</button>
    </div>
    <form id="vf" class="card">
      <h2 style="margin-top:0">Readings</h2>
      <p class="muted">Fill in from the scan, a blood pressure machine or a scale. Leave blank what you do not have.</p>
      <div class="row">
        <div><label for="sys">Systolic (top)</label><input id="sys" type="number" inputmode="numeric" min="60" max="260"></div>
        <div><label for="dia">Diastolic (bottom)</label><input id="dia" type="number" inputmode="numeric" min="30" max="160"></div>
      </div>
      <div class="row">
        <div><label for="hr">Resting heart rate</label><input id="hr" type="number" inputmode="numeric" min="30" max="220"></div>
        <div><label for="kg">Weight (kg)</label><input id="kg" type="number" inputmode="decimal" step="0.1" min="25" max="350" placeholder="${esc(lastW?.kg ?? '')}"></div>
      </div>
      <input type="hidden" id="hrv"><input type="hidden" id="src" value="manual"><input type="hidden" id="demo" value="">
      <h2>Any symptoms in the last 3 days?</h2>
      ${SYMPTOMS.map((s) => `<label class="check"><input type="checkbox" name="sym" value="${s.id}" ${recentSymptoms().includes(s.id) ? 'checked' : ''}> ${esc(s.label)}</label>`).join('')}
      <button class="btn" type="submit">Save and check</button>
    </form>
    <div id="result"></div>`;

  $('#scan').onclick = async () => {
    const box = $('#scanbox'); const prog = $('#prog');
    box.hidden = false; prog.hidden = false; $('#scan').disabled = true;
    const oval = document.createElement('div'); oval.className = 'scan-oval';
    try {
      const resP = provider.scan(box, (p) => { prog.firstElementChild.style.width = `${Math.round(p * 100)}%`; });
      box.appendChild(oval);
      const r = await resP;
      $('#sys').value = r.systolic ?? ''; $('#dia').value = r.diastolic ?? ''; $('#hr').value = r.heartRate ?? '';
      $('#hrv').value = r.hrv ?? ''; $('#src').value = 'shen'; $('#demo').value = r.demo ? '1' : '';
      box.innerHTML = `<div class="scan-nocam">Scan complete${r.demo ? ' (demo values)' : ''}. Check the numbers below, then save.</div>`;
    } catch (err) {
      box.innerHTML = `<div class="scan-nocam">${esc(err.message)}</div>`;
    } finally {
      $('#scan').disabled = false; $('#scan').textContent = 'Scan again';
    }
  };

  // A reading the user types or corrects by hand is a manual reading, not a scan.
  ['#sys', '#dia', '#hr'].forEach((id) => ($(id).oninput = () => { $('#src').value = 'manual'; $('#demo').value = ''; }));

  $('#vf').onsubmit = (e) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const num = (id) => ($(id).value === '' ? null : Number($(id).value));
    const entry = { date: now, source: $('#src').value, systolic: num('#sys'), diastolic: num('#dia'), heartRate: num('#hr'), hrv: num('#hrv'), weightKg: num('#kg'), demo: !!$('#demo').value };
    if (entry.systolic || entry.heartRate || entry.weightKg) state.vitals.push(entry);
    if (entry.weightKg) state.weights.push({ date: now, kg: entry.weightKg });
    const ids = [...view.querySelectorAll('input[name=sym]:checked')].map((i) => i.value);
    if (ids.length) state.symptoms.push({ date: now, ids });
    persist();
    const a = currentAssessment();
    $('#result').innerHTML = `<h2>Result</h2>${statusHtml(a.level)}${alertsHtml(a.alerts)}`;
    $('#result').scrollIntoView({ behavior: 'smooth' });
  };
}

// ---------- doses ----------
function renderDoses() {
  const r = state.regimen || {};
  const pep = peptideById(r.peptideId);
  const sug = suggestSite(state.doses);
  let site = sug.id;
  const hist = [...state.doses].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = hist.find((d) => d.peptideId === pep.id);
  view.innerHTML = `
    <h1>Doses</h1>
    ${pep.status === 'unapproved' ? `<div class="alert urgent"><b>${esc(pep.name)} is not an approved medicine.</b>There is no verified safe dose. The app records what you take, but cannot say whether it is safe.</div>` : ''}
    <form id="df" class="card">
      <label for="dp">Product</label>
      <select id="dp">${PEPTIDES.map((x) => `<option value="${x.id}" ${x.id === pep.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <div class="row">
        <div><label for="amt">Amount</label><input id="amt" type="number" inputmode="decimal" step="any" min="0" required value="${esc(last?.amount ?? r.prescribedDose ?? '')}"></div>
        <div><label for="unit">Unit</label><select id="unit">${['mg', 'mcg', 'mL', 'units'].map((u) => `<option ${(last?.unit || r.unit || 'mg') === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      </div>
      <label for="when">When</label><input id="when" type="datetime-local" value="${localInput()}" required>
      <p class="muted">Enter the dose your prescriber gave you, exactly as written.</p>
      <label>Injection site</label>
      <div class="sites" id="sites">${INJECTION_SITES.map((s) => `<button type="button" data-site="${s.id}" aria-pressed="${s.id === site}">${esc(s.label)}${s.id === sug.id ? '<span class="sug">Suggested</span>' : ''}</button>`).join('')}</div>
      <label for="note">Note (optional)</label>
      <input id="note" maxlength="200" placeholder="e.g. new pen, batch number">
      <div id="dwarn"></div>
      <button class="btn" type="submit" id="dsave">Check and save</button>
    </form>
    <h2>History</h2>
    <div class="card">${hist.length ? `<ul class="list">${hist.slice(0, 30).map((d) => `<li><span>${esc(fmtDate(d.date))}<br><span class="muted">${esc(peptideById(d.peptideId).name)} · ${esc(INJECTION_SITES.find((s) => s.id === d.siteId)?.label ?? '')}</span></span><b>${esc(d.amount)} ${esc(d.unit)}</b></li>`).join('')}</ul>` : '<p class="muted">No doses logged yet.</p>'}</div>
    <h2>Vial converter</h2>
    <div class="card">
      <p class="muted">For vials only (pens have a dial). Converts the dose your prescriber gave you into what to draw up. Always confirm with your pharmacist.</p>
      <div class="row">
        <div><label for="cmg">Prescribed dose (mg)</label><input id="cmg" type="number" inputmode="decimal" step="any"></div>
        <div><label for="cconc">Vial strength (mg/mL)</label><input id="cconc" type="number" inputmode="decimal" step="any"></div>
      </div>
      <div id="cout" class="muted" style="margin-top:8px"></div>
    </div>`;

  $('#sites').onclick = (e) => {
    const b = e.target.closest('button[data-site]'); if (!b) return;
    site = b.dataset.site;
    view.querySelectorAll('#sites button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.site === site)));
    reset();
  };
  let confirmed = false;
  const reset = () => { confirmed = false; $('#dwarn').innerHTML = ''; $('#dsave').textContent = 'Check and save'; $('#dsave').className = 'btn'; };
  ['#dp', '#amt', '#unit', '#when'].forEach((id) => ($(id).oninput = reset));

  $('#df').onsubmit = (e) => {
    e.preventDefault();
    const dose = { date: new Date($('#when').value).toISOString(), peptideId: $('#dp').value, amount: Number($('#amt').value), unit: $('#unit').value, siteId: site, note: $('#note').value.trim() };
    const warnings = checkDose(dose, state.doses);
    const serious = warnings.some((w) => ['urgent', 'clinician'].includes(w.level));
    if (warnings.length && !confirmed) {
      $('#dwarn').innerHTML = alertsHtml(warnings);
      confirmed = true;
      $('#dsave').textContent = serious ? 'I have checked. Save anyway' : 'Save';
      if (serious) $('#dsave').className = 'btn danger';
      return;
    }
    state.doses.push(dose);
    state.regimen = { ...(state.regimen || {}), peptideId: dose.peptideId, prescribedDose: dose.amount, unit: dose.unit };
    persist();
    renderDoses();
  };

  const conv = () => {
    const out = mgToVolume($('#cmg').value, $('#cconc').value);
    $('#cout').innerHTML = out.error ? esc(out.error)
      : `<b style="color:var(--ink);font-size:18px">${out.ml} mL = ${out.units} units</b> on a U-100 (1 mL) insulin syringe.${out.warnings.map((w) => `<div class="alert caution">${esc(w)}</div>`).join('')}`;
  };
  $('#cmg').oninput = conv; $('#cconc').oninput = conv;
}

// ---------- verify ----------
function renderVerify() {
  const c = country();
  const src = SOURCES.find((s) => s.id === state.regimen?.source);
  view.innerHTML = `
    <h1>Is my product real?</h1>
    ${src && src.risk !== 'low' ? `<div class="alert ${src.risk === 'high' ? 'urgent' : 'caution'}"><b>Your source: ${esc(src.label)}</b>${esc(src.warning)}</div>` : ''}
    <div class="card">
      <h2 style="margin-top:0">${esc(c.name)}</h2>
      <p>${esc(c.verifyTip)}</p>
      ${c.regulatorUrl ? `<p><a href="${esc(c.regulatorUrl)}" target="_blank" rel="noopener">Visit ${esc(c.regulator)}</a></p>` : ''}
    </div>
    <h2>Checklist</h2>
    <div class="card">
      ${[
        'Bought from a licensed pharmacy, with a prescription',
        'Pack shows a registration number, batch number and expiry date',
        'Pen or vial was kept cold (fridge) before you got it, including on any trip across the border',
        'Seal not broken; liquid is clear and colourless with no bits',
        'Pen label matches the box (fakes have been relabelled insulin pens)',
        'You got a receipt, and the price is close to a pharmacy price (fakes can be very cheap or very expensive)',
      ].map((t, i) => `<label class="check"><input type="checkbox" class="vc" id="vc${i}"> ${esc(t)}</label>`).join('')}
      <div id="vres" class="muted"></div>
    </div>
    <h2>Report a problem</h2>
    <div class="card"><p>${esc(c.reportSideEffect)}</p><p class="muted">Reporting helps take fake products off the market.</p></div>`;
  const upd = () => {
    const n = view.querySelectorAll('.vc:checked').length;
    $('#vres').innerHTML = n === 6 ? '<div class="alert info"><b>Looks good.</b>Keep the box and batch number in case you need to report a problem.</div>'
      : `<p>${6 - n} check(s) not ticked. If you are unsure about any of them, ask a pharmacist before using the product.</p>`;
  };
  view.querySelectorAll('.vc').forEach((x) => (x.onchange = upd));
  upd();
}

// ---------- learn ----------
function renderLearn() {
  view.innerHTML = `
    <h1>Learn</h1>
    <p class="muted">Plain-language safety facts. Not a substitute for advice from your clinician or pharmacist.</p>
    ${PEPTIDES.filter((p) => p.id !== 'other').map((p) => `
      <details class="card">
        <summary><b>${esc(p.name)}</b> <span class="tag ${p.status === 'approved-rx' ? 'approved' : 'unapproved'}">${p.status === 'approved-rx' ? 'Prescription medicine' : 'Not approved'}</span><br><span class="muted">${esc(p.brands)}</span></summary>
        <p>${esc(p.summary)}</p>
        ${p.commonEffects.length ? `<p><b>Common side effects:</b> ${esc(p.commonEffects.join(', '))}</p>` : ''}
        <p><b>Get help for:</b></p><ul>${p.watchFor.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>
      </details>`).join('')}
    <details class="card"><summary><b>Injecting safely</b></summary>
      <ul>
        <li>Wash your hands. Clean the skin with an alcohol swab and let it dry.</li>
        <li>Use a new needle every time. Never share needles or pens.</li>
        <li>Rotate sites. Stay 5 cm away from the belly button and from your last spot.</li>
        <li>Put used needles in a hard plastic bottle with a lid and return it to a clinic or pharmacy.</li>
        <li>Keep unopened pens and vials in the fridge (not the freezer).</li>
      </ul>
    </details>
    <details class="card"><summary><b>Power cuts and keeping pens cold</b></summary>
      <ul>
        <li>Unopened pens and vials belong in the fridge (2–8 °C), never the freezer.</li>
        <li>Most pens can be kept out of the fridge for a limited time once in use, as long as they stay below about 30 °C. The number of days is different for each product: read the leaflet and ask your pharmacist.</li>
        <li>When a pen leaves the fridge, write the date on the box. Throw it away when its out-of-fridge time is up.</li>
        <li>During long power cuts keep the fridge door shut. A cooler box with ice packs works for a short time, but wrap the pen so it does not touch the ice and freeze.</li>
        <li>Do not use a pen that has frozen, got hot (for example, left in a car or kombi), or looks cloudy.</li>
      </ul>
    </details>
    <details class="card"><summary><b>About face-scan readings</b></summary>
      <p>The face scan estimates your vital signs from tiny colour changes in your skin. It is useful for spotting trends but it is not a medical device reading. If it shows high blood pressure, confirm with a cuff at a pharmacy or clinic.</p>
    </details>`;
}

// ---------- me ----------
function renderMe() {
  const p = state.profile;
  const pep = peptideById(state.regimen?.peptideId);
  const w = latest(state.weights);
  const b = bmi(p.heightCm, w?.kg);
  view.innerHTML = `
    <h1>Me</h1>
    <div class="card">
      <ul class="list">
        <li><span>Country</span><b>${esc(country().name)}</b></li>
        <li><span>Height</span><b>${esc(p.heightCm)} cm</b></li>
        <li><span>Weight</span><b>${esc(w?.kg ?? '–')} kg</b></li>
        <li><span>BMI</span><b>${b ?? '–'} ${b ? `<span class="muted">${esc(bmiCategory(b))}</span>` : ''}</b></li>
        <li><span>Product</span><b>${esc(pep.name)}</b></li>
      </ul>
      <button class="btn secondary" id="edit">Edit profile</button>
    </div>
    <h2>Share with your clinician</h2>
    <div class="card">
      <p class="muted">A summary of your doses, readings and side effects to show at your next visit.</p>
      <div class="btns"><button class="btn" id="wa">Send on WhatsApp</button><button class="btn secondary" id="share">Show / share</button></div>
      <pre id="sum" style="white-space:pre-wrap;font-size:13px" hidden></pre>
    </div>
    <h2>Your data</h2>
    <div class="card">
      <p class="muted">Everything is stored only on this phone.</p>
      <div class="btns"><button class="btn secondary" id="exp">Download backup</button><button class="btn danger" id="del">Delete all data</button></div>
    </div>
    <p class="disclaimer">PeptiSafe Africa v0.1 · prototype · face-scan mode: ${provider.mode}</p>`;
  $('#edit').onclick = () => renderProfileForm(false);
  $('#share').onclick = async () => {
    const text = clinicianSummary();
    $('#sum').hidden = false; $('#sum').textContent = text;
    if (navigator.share) { try { await navigator.share({ title: 'PeptiSafe summary', text }); } catch { /* cancelled */ } }
  };
  // WhatsApp is how most people reach their doctor or pharmacist in Zimbabwe.
  // wa.me opens the app with the text ready; the user picks the contact.
  $('#wa').onclick = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(clinicianSummary())}`, '_blank', 'noopener');
  };
  $('#exp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(exportJson(state));
    a.download = `peptisafe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  $('#del').onclick = () => {
    if (confirm('Delete all your PeptiSafe data from this phone? This cannot be undone.')) { state = wipe(); tab = 'home'; render(); }
  };
}

function clinicianSummary() {
  const p = state.profile;
  const a = currentAssessment();
  const lines = [];
  lines.push(`PeptiSafe summary – ${new Date().toLocaleDateString()}`);
  lines.push(`Product: ${peptideById(state.regimen?.peptideId).name}; source: ${SOURCES.find((s) => s.id === state.regimen?.source)?.label ?? '–'}; supervised: ${p.hasPrescriber ? 'yes' : 'no'}`);
  lines.push(`Height ${p.heightCm} cm; BMI ${a.bmi ?? '–'} (${a.bmiCategory ?? '–'}); weight trend ${a.weeklyWeightChangePct ?? '–'} %/week`);
  lines.push(`History: ${(p.conditions || []).map((id) => CONDITIONS.find((c) => c.id === id)?.label).join('; ') || 'none ticked'}`);
  lines.push('', 'Recent doses:');
  [...state.doses].sort((x, y) => new Date(y.date) - new Date(x.date)).slice(0, 8)
    .forEach((d) => lines.push(`  ${fmtDate(d.date)}  ${peptideById(d.peptideId).name} ${d.amount} ${d.unit}  (${INJECTION_SITES.find((s) => s.id === d.siteId)?.label ?? ''})`));
  lines.push('', 'Recent readings:');
  [...state.vitals].sort((x, y) => new Date(y.date) - new Date(x.date)).slice(0, 8)
    .forEach((v) => lines.push(`  ${fmtDate(v.date)}  BP ${v.systolic ?? '–'}/${v.diastolic ?? '–'}  HR ${v.heartRate ?? '–'}  wt ${v.weightKg ?? '–'}  ${v.source === 'shen' ? (v.demo ? '[demo scan]' : '[face scan]') : '[manual]'}`));
  lines.push('', 'Symptoms (last 3 days): ' + (recentSymptoms().map((id) => SYMPTOMS.find((s) => s.id === id)?.label).join('; ') || 'none'));
  lines.push('', 'Flags: ' + (a.alerts.filter((x) => x.level !== 'info').map((x) => x.title).join('; ') || 'none'));
  return lines.join('\n');
}

// ---------- offline / PWA ----------
const off = document.getElementById('offline');
const net = () => { off.hidden = navigator.onLine; };
addEventListener('online', net); addEventListener('offline', net); net();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

render();
