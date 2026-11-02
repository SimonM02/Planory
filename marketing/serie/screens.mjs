// Echte App-Bildschirme für die Serie „Planory erklärt“ (Demo-Modus, iPhone 390×844 @3x).
// Aufruf: node marketing/serie/screens.mjs   → marketing/serie/screens/*.png
// Die App läuft unter einem Test-Hostnamen (nicht file://) – sonst fehlt der normale Start.
const { chromium } = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default;
import { readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = HERE + '/../..';
const HTML = readFileSync(ROOT + '/index.html', 'utf8');
const CHART = readFileSync(ROOT + '/node_modules/chart.js/dist/chart.umd.js', 'utf8');
const OUT = HERE + '/screens';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ args: ['--lang=de-AT'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'de-AT', timezoneId: 'Europe/Vienna', colorScheme: 'light' });
const p = await ctx.newPage();
await p.addInitScript(() => { localStorage.setItem('planoryLang', 'de'); localStorage.setItem('dsgvoAccepted', '1'); localStorage.setItem('planory_ki_hinweis', '1');
  const q = () => { const o = { select(){return o}, eq(){return o}, in(){return o}, order(){return o}, maybeSingle(){return o}, single(){return o}, insert(){return o}, update(){return o}, upsert(){return o}, delete(){return o}, then(r){ return Promise.resolve({ data: null, error: null }).then(r); } }; return o; };
  window.supabase = { createClient: () => ({ from: q, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; } }, channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; }, removeChannel(){}, storage: { from(){ return {}; } } }) }; });
await p.route('**/*', r => { const u = r.request().url();
  if (u.startsWith('https://planory.test/index.html')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
  if (u.includes('chart.umd')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: CHART });
  if (u.includes('fonts.g')) return r.continue();
  return r.abort(); });
await p.goto('https://planory.test/index.html?demo=planory2025');
await p.waitForFunction(() => typeof _demoMode !== 'undefined' && _demoMode && state.kosten.length > 0);
await p.evaluate(() => {
  // Demo-Banner/Hinweise weg – Bilder sollen wie die echte App aussehen
  const bn = document.getElementById('demo-banner'); if (bn) bn.style.display = 'none';
  document.body.classList.remove('demo-aktiv'); document.body.style.removeProperty('--demo-h');
  document.querySelector('.sidebar').style.top = ''; const m = document.querySelector('.main'); if (m) m.style.paddingTop = '';
  Object.keys(PAGE_HINTS || {}).forEach(k => _seenHints.add(k));
  window.showToast = () => {};
  // Demo-Daten (um Sept. 2025 gebaut) auf „jetzt“ verschieben
  const tage = Math.round((Date.now() - Date.parse('2025-09-10')) / 86400000);
  const schieb = v => { const d = new Date(v + 'T12:00:00'); d.setDate(d.getDate() + tage); return d.toISOString().slice(0, 10); };
  const lauf = o => { if (Array.isArray(o)) o.forEach((x, i) => { if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) o[i] = schieb(x); else if (x && typeof x === 'object') lauf(x); });
    else if (o && typeof o === 'object') for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) o[k] = schieb(v); else if (v && typeof v === 'object') lauf(v); } };
  const auf = state.aufgaben; state.aufgaben = []; lauf(state); state.aufgaben = auf;
});
const tidy = () => p.evaluate(() => {
  document.querySelectorAll('[id^="page-hint-"], .erinnerung').forEach(e => e.remove());
  // Headless-Chromium zeigt Datumsfelder im US-Format – wie am Handy darstellen
  document.querySelectorAll('input[type=date]').forEach(i => { if (!i.value) { i.type = 'text'; i.placeholder = ''; return; } const [y, m, d] = i.value.split('-'); i.type = 'text'; i.value = `${+d}.${+m}.${y}`; });
});
const BOXES = {};
const shot = async (name, fn, { full = false, el = null, scroll = 0, boxes = {} } = {}) => {
  await p.evaluate(fn);
  await p.waitForTimeout(900);
  await tidy();
  if (scroll) await p.evaluate(s => { const mo = document.querySelector('.modal-overlay.open .modal') || null; if (mo) mo.scrollTop = s; else window.scrollTo(0, s); }, scroll);
  else await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(250);
  if (el) await p.locator(el).first().screenshot({ path: `${OUT}/${name}.png` });
  else await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  // Positionen wichtiger Elemente (in Bild-Pixeln, @3x) – für Zoom-Lupen im Video
  BOXES[name] = await p.evaluate(({ boxes, el }) => {
    const base = el ? document.querySelector(el).getBoundingClientRect() : { left: 0, top: 0 };
    const out = {};
    for (const [k, sel] of Object.entries(boxes)) { const e = document.querySelector(sel); if (!e) { out[k] = null; continue; }
      const r = e.getBoundingClientRect(); const sy = el ? 0 : window.scrollY;
      out[k] = [r.left - base.left, r.top - base.top + sy, r.width, r.height].map(v => Math.round(v * 3)); }
    return out; }, { boxes, el });
  console.log('✓', name);
};
const heute = () => new Date().toISOString().slice(0, 10);

// ── Folge 1: Budget ──
await shot('dash-sichtbar', () => showPage('dashboard'), { full: true, boxes: { qaScan: '#qa-tiles > *:first-child', qa: '#qa-tiles', toggle: '#privacy-btn', cards: '#dash-cards' } });
await shot('dash-verborgen', () => { togglePrivacy(); }, { full: true, boxes: { toggle: '#privacy-btn', cards: '#dash-cards' } });
await p.evaluate(() => togglePrivacy());
await shot('budget', () => showPage('budget'), { full: true, boxes: { blick: '.bg-blick', page: '#page-budget' } });
await shot('kostenchart', () => showPage('kostenchart'), { full: true, boxes: { page: '#page-kostenchart', canvas: '#page-kostenchart canvas' } });
await shot('ausgabe-form', () => {
  showPage('kosten'); openModal('modal-kosten');
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  set('k-datum', new Date().toISOString().slice(0, 10)); set('k-beschr', 'Malerarbeiten (Eigenleistung)');
  const k = document.getElementById('k-kat'); const o = [...k.options].find(x => /Innen/i.test(x.textContent)); if (o) k.value = o.value;
  set('k-betrag', 850); try { updateKostenNetto(); } catch (e) {}
  set('k-anbieter', 'Baumarkt');
  document.getElementById('k-im-budget').checked = false;
}, { el: '#modal-kosten .modal' });
await shot('ausgabe-form-unten', () => {}, { el: '#modal-kosten .modal', scroll: 9999, boxes: { check: '#k-im-budget', checkRow: '#k-im-budget' } });
await p.evaluate(() => closeModal('modal-kosten'));
await shot('kosten-nib', () => {
  state.kosten.unshift({ id: 990001, datum: new Date().toISOString().slice(0, 10), beschr: 'Malerarbeiten (Eigenleistung)', kat: (state.kosten.find(k => /Innen/i.test(k.kat || ''))?.kat) || state.kosten[0].kat, betrag: 850, netto: 708.33, mwst: 20, status: 'Bezahlt', anbieter: 'Baumarkt', imBudget: false });
  showPage('kosten'); renderKosten();
}, { full: true, boxes: { nib: '#k-nib-card', table: '#kosten-table' } });

// ── Folge 2: Rechnung scannen ──
await shot('scan-leer', () => { showPage('dashboard'); openModal('modal-rechnung-scan'); }, { el: '#modal-rechnung-scan .modal', boxes: { foto: '#scan-upload-area button' } });
await shot('scan-ergebnis', () => {
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  document.getElementById('scan-upload-area').style.display = 'none';
  const pv = document.getElementById('scan-preview'); if (pv) pv.style.display = 'none';
  document.getElementById('scan-loading').style.display = 'none';
  document.getElementById('scan-result').style.display = 'block';
  document.getElementById('scan-confirm-btn').style.display = 'inline-flex';
  set('scan-beschr', 'Sanitär Rohinstallation'); set('scan-anbieter', 'Installateur Muster GmbH');
  const sd = document.getElementById('scan-datum'), jetzt = new Date();
  sd.value = sd.type === 'date' ? jetzt.toISOString().slice(0, 10) : `${jetzt.getDate()}.${jetzt.getMonth() + 1}.${jetzt.getFullYear()}`;
  set('scan-netto', 16666.67); set('scan-brutto', 20000);
  const k = document.getElementById('scan-kat'); const o = [...k.options].find(x => /Sanit/i.test(x.textContent)) || k.options[1]; if (o) k.value = o.value;
  // Beispiel-Person (Demo hat keine) – genau so, wie sie über „➕ Neue Person…“ angelegt wäre
  const bv = document.getElementById('scan-bezahlt-von');
  if (![...bv.options].some(x => x.value === 'Lisa')) { const o2 = new Option('Lisa', 'Lisa'); bv.insertBefore(o2, bv.querySelector('option[value="__neu__"]')); }
  bv.value = 'Lisa';
  document.getElementById('scan-ki-notiz').textContent = '💡 KI-Hinweis: Kategorie automatisch erkannt – bitte kurz prüfen.';
}, { el: '#modal-rechnung-scan .modal', boxes: { beschr: '#scan-beschr', anbieter: '#scan-anbieter', datum: '#scan-datum', netto: '#scan-netto', brutto: '#scan-brutto', kat: '#scan-kat' } });
await shot('scan-ergebnis-unten', () => {}, { el: '#modal-rechnung-scan .modal', scroll: 9999, boxes: { brutto: '#scan-brutto', kat: '#scan-kat', bezahlt: '#scan-bezahlt-von', ok: '#scan-confirm-btn' } });
// ganzes Fenster ohne Scrollbegrenzung (zum Weiterscrollen im Video)
await shot('scan-voll', () => { const m = document.querySelector('#modal-rechnung-scan .modal'); m.style.maxHeight = 'none'; m.style.overflow = 'visible'; m.scrollTop = 0;
  // fixierte Leisten (App-Kopfzeile usw.) würden sonst durchs lange Fenster scheinen
  document.querySelectorAll('body *').forEach(e => { if (m.closest('.modal-overlay').contains(e) || e.contains(m)) return; const ps = getComputedStyle(e).position; if (ps === 'fixed' || ps === 'sticky') { e.dataset.vorher = e.style.visibility; e.style.visibility = 'hidden'; } }); },
  { el: '#modal-rechnung-scan .modal', boxes: { beschr: '#scan-beschr', anbieter: '#scan-anbieter', datum: '#scan-datum', brutto: '#scan-brutto', kat: '#scan-kat', bezahlt: '#scan-bezahlt-von', ok: '#scan-confirm-btn' } });
await p.evaluate(() => { const m = document.querySelector('#modal-rechnung-scan .modal'); m.style.maxHeight = ''; m.style.overflow = ''; document.querySelectorAll('[data-vorher]').forEach(e => { e.style.visibility = e.dataset.vorher; delete e.dataset.vorher; }); });
await p.evaluate(() => closeModal('modal-rechnung-scan'));
await shot('kosten-filter', () => {
  state.kosten = state.kosten.filter(k => k.id !== 990001);
  showPage('kosten');
  const f = document.getElementById('kosten-filter-kat'); renderKosten();
  const o = [...f.options].find(x => /Sanit/i.test(x.textContent)) || f.options[2]; if (o) f.value = o.value; renderKosten();
}, { full: true, boxes: { filter: '#kosten-filter-kat', info: '#kosten-filter-info', table: '#kosten-table' } });
console.log('Personen bei „Bezahlt von“:', await p.evaluate(() => [...document.getElementById('scan-bezahlt-von').options].map(o => o.textContent).join(' | ')));
(await import('fs')).writeFileSync(OUT + '/boxes.json', JSON.stringify(BOXES, null, 1));
await b.close();
