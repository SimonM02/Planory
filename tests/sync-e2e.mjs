// ═══════════════════════════════════════════════════════════════════════
// PLANORY – End-to-End-Test: Speichern → Cloud → Neuladen
// ═══════════════════════════════════════════════════════════════════════
// Startet die ECHTE App (index.html) in einem Browser und ersetzt nur die
// Datenbank durch einen nachgebauten Supabase-Server (im Speicher, mit
// realistischer Verzoegerung und Realtime-Echo). So laesst sich der ganze Weg
// "Eintrag speichern → hochladen → aus der Cloud neu laden" pruefen – genau
// dort lag der Fehler "Ausgabe erscheint kurz und verschwindet wieder".
//
// Ausfuehren:  node tests/sync-e2e.mjs
//              PLANORY_FILE=pfad/zur/index.html node tests/sync-e2e.mjs
// Braucht Playwright + Chromium. Fehlt beides, wird der Test uebersprungen.
// ═══════════════════════════════════════════════════════════════════════
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let chromium = null;
for (const spec of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { const m = await import(spec); chromium = (m.default || m).chromium; if (chromium) break; } catch { /* naechste Quelle */ }
}
if (!chromium) { console.log('⏭  Playwright nicht installiert – End-to-End-Test übersprungen.'); process.exit(0); }

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(process.env.PLANORY_FILE || path.join(here, '..', 'index.html'));
const HTML = readFileSync(FILE, 'utf8');
// Wichtig: NICHT als file:// oeffnen – ohne Hostnamen startet die App absichtlich
// im Demo-Modus ohne Login/Cloud. Darum unter einer echten Adresse ausliefern.
const ORIGIN = 'https://planory.test';
const UID = 'u-e2e-test';
const PID = 1001;

// ── Nachgebauter Supabase-Client (laeuft IN der Seite, vor dem App-Code) ──
function fakeSupabase({ uid, pid, cfg, seedItems }) {
  const C = window.__fakeCfg = Object.assign({ read: 450, write: 200, rtDelay: 2300, firstItemsRead: 0 }, cfg);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clone = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  // Postgres-jsonb ordnet Objekt-Schluessel um (erst kurze, dann alphabetisch) –
  // das ahmen wir nach, damit der Test naive Vergleiche entlarvt.
  const jsonb = v => {
    if (Array.isArray(v)) return v.map(jsonb);
    if (v && typeof v === 'object') {
      const o = {};
      Object.keys(v).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)).forEach(k => { o[k] = jsonb(v[k]); });
      return o;
    }
    return v;
  };
  let rowId = 1;
  const now = new Date().toISOString();
  // cfg.persist: Datenbank ueberlebt ein Neuladen der Seite (= App geschlossen und neu gestartet)
  const gespeichert = C.persist ? (() => { try { return JSON.parse(sessionStorage.getItem('__fakeDbState') || 'null'); } catch (e) { return null; } })() : null;
  const ersterStart = !gespeichert;
  const persist = () => { if (C.persist) try { sessionStorage.setItem('__fakeDbState', JSON.stringify(db)); } catch (e) { console.warn('[fake] persist', e.message); } };
  const db = window.__fakeDb = gespeichert || {
    projektdaten: [{ id: rowId++, user_id: uid, typ: 'all_projects', updated_at: now, daten: {
      projects: [{ id: pid, settings: { name: 'Testhaus', type: 'Neubau', budget: 500000, start: '', end: '', address: '', color: '#ff9f1c', modules: {} },
                   budgetKat: [], _budgetKatV2: true, _deletedIds: {} }],
      currentProjectId: pid, onboarded: true, dsgvoAccepted: true, updated_at: now } }],
    projekt_items: seedItems.map(([typ, item]) => ({ id: rowId++, user_id: uid, project_id: String(pid), item_type: typ,
      item_id: String(item.id), payload: jsonb(item), deleted: false, updated_at: now })),
    subscriptions: [{ user_id: uid, plan: 'pro', status: 'active', current_period_end: '2099-01-01' }],
    profiles: [],
  };
  if (gespeichert) rowId = Math.max(0, ...Object.values(db).flat().map(r => Number(r.id) || 0)) + 1;
  const stats = window.__fakeStats = { itemReadsInFlight: 0, itemReads: 0, writes: 0 };
  const rtCallbacks = [];
  const echo = (rows) => rows.forEach((r, i) => setTimeout(() => rtCallbacks.slice().forEach(cb => { try { cb({ eventType: 'UPDATE', new: r }); } catch (e) {} }), C.rtDelay + i * 3));

  class Q {
    constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.one = false; this.opts = {}; this.ord = null; }
    select(_c, opts) { this.opts = opts || {}; return this; }
    insert(rows) { this.op = 'insert'; this.rows = rows; return this; }
    update(v) { this.op = 'update'; this.vals = v; return this; }
    upsert(rows, o) { this.op = 'upsert'; this.rows = rows; this.conflict = (o && o.onConflict || '').split(',').filter(Boolean); return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.f.push(r => String(r[c]) === String(v)); return this; }
    in(c, a) { const s = new Set((a || []).map(String)); this.f.push(r => s.has(String(r[c]))); return this; }
    match(o) { Object.entries(o).forEach(([k, v]) => this.eq(k, v)); return this; }
    order(c, o) { this.ord = [c, !(o && o.ascending === false)]; return this; }
    limit() { return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    then(res, rej) { return this.run().then(res, rej); }
    async run() {
      const tab = db[this.t] = db[this.t] || [];
      const hit = r => this.f.every(fn => fn(r));
      if (this.op === 'select') {
        const isItems = this.t === 'projekt_items' && !this.opts.head;
        const lat = (isItems && stats.itemReads === 0 && C.firstItemsRead) ? C.firstItemsRead : C.read;
        if (isItems) { stats.itemReads++; stats.itemReadsInFlight++; }
        try {
          await sleep(lat / 2);
          let rows = tab.filter(hit).map(clone);          // Momentaufnahme mitten in der Anfrage
          await sleep(lat / 2);
          if (this.ord) { const [c, asc] = this.ord; rows.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
          if (this.opts.head) return { data: null, count: rows.length, error: null };
          return { data: this.one ? (rows[0] || null) : rows, error: null };
        } finally { if (isItems) stats.itemReadsInFlight--; }
      }
      await sleep(C.write / 2);
      if (C.writesFail) return { data: null, error: { message: 'Failed to fetch' } };   // Netz weg
      stats.writes++;
      const changed = [];
      if (this.op === 'insert') {
        for (const r of [].concat(this.rows)) { const row = { id: rowId++, ...clone(r) }; if (row.payload) row.payload = jsonb(row.payload); tab.push(row); changed.push(row); }
      } else if (this.op === 'update') {
        tab.filter(hit).forEach(r => { Object.assign(r, clone(this.vals)); changed.push(r); });
      } else if (this.op === 'upsert') {
        for (const r of [].concat(this.rows)) {
          const row = clone(r); if (row.payload) row.payload = jsonb(row.payload);
          const ex = tab.find(x => this.conflict.every(c => String(x[c]) === String(row[c])));
          if (ex) Object.assign(ex, row); else tab.push({ id: rowId++, ...row });
          changed.push(row);
        }
      } else if (this.op === 'delete') {
        for (let i = tab.length - 1; i >= 0; i--) if (hit(tab[i])) { changed.push(tab[i]); tab.splice(i, 1); }
      }
      await sleep(C.write / 2);
      persist();
      if (this.t === 'projekt_items' && changed.length) echo(changed);
      return { data: null, error: null };
    }
  }
  const session = { user: { id: uid, email: 'e2e@planory.test' }, access_token: 'fake-token' };
  // Speicher (Belege): protokolliert Uploads/Loeschungen; cfg.uploadDelay = langsames Netz,
  // cfg.uploadFail = Upload scheitert (z.B. Bucket fehlt)
  const uploads = window.__fakeUploads = [], removed = window.__fakeRemoved = [];
  const bucket = () => ({
    upload: async (p, body, o) => {
      const u = { path: p, type: (o && o.contentType) || (body && body.type) || '', done: false };
      uploads.push(u);
      if (C.uploadDelay) await sleep(C.uploadDelay);
      if (C.uploadHangFirstLoad && ersterStart) await new Promise(() => {});   // App wird vorher geschlossen
      if (C.uploadFail) return { data: null, error: { message: 'Bucket not found' } };
      u.done = true;
      return { data: { path: p }, error: null };
    },
    getPublicUrl: p => ({ data: { publicUrl: 'https://fake.storage/' + p } }),
    remove: async ps => { removed.push(...[].concat(ps)); return { data: null, error: null }; },
    createSignedUrl: async p => ({ data: { signedUrl: 'https://fake.storage/' + p }, error: null }),
  });
  window.supabase = { createClient: () => ({
    from: t => new Q(t),
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { session }, error: null }),
      signUp: async () => ({ data: {}, error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
    },
    channel: () => { const ch = { on: (_e, _f, cb) => { rtCallbacks.push(cb); return ch; }, subscribe: () => ch, unsubscribe() {} }; return ch; },
    removeChannel: () => { rtCallbacks.length = 0; },
    storage: { from: bucket },
  }) };
  // Dauerhaft angemeldeter Nutzer mit lokalem Zwischenspeicher (wie ein wiederkehrender Nutzer)
  try {
    localStorage.setItem('dsgvoAccepted', '1');
    localStorage.setItem('planoryLang', 'de');
  } catch (e) {}
}

// ── Hilfen fuer die Szenarien ──────────────────────────────────────────
const KOSTEN_SEED = [1, 2, 3].map(i => ['kosten', { id: 1700000000000 + i, datum: '2026-09-0' + i, beschr: 'Bestand ' + i, kat: 'Rohbau',
  mwst: 20, netto: 100, betrag: 120, status: 'Bezahlt', anbieter: '', _updatedAt: 1700000000000 + i }]);
const SEED = [['budgetKat', { id: 9001, name: 'Rohbau', budget: 100000, color: '#3d6ff8', _order: 0, _updatedAt: 1700000000000 }], ...KOSTEN_SEED];

async function boot(browser, cfg = {}, { cache = false, seed = [] } = {}) {
  const ctx = await browser.newContext({ locale: 'de-AT', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u === ORIGIN + '/' || u.startsWith(ORIGIN + '/index.html')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (u.includes('supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* ersetzt durch Test-Server */' });
    if (u.includes('/api/ki')) return (page.__kiHandler ? page.__kiHandler(route) : route.abort());
    return route.abort();
  });
  await page.addInitScript(fakeSupabase, { uid: UID, pid: PID, cfg, seedItems: [...SEED, ...seed] });
  if (cache) {
    // Wiederkehrender Nutzer: lokaler Stand vorhanden -> App zeigt ihn sofort, laedt Cloud im Hintergrund
    await page.addInitScript(([uid, pid, seed]) => {
      if (sessionStorage.getItem('__seeded')) return;
      sessionStorage.setItem('__seeded', '1');
      const proj = { id: pid, settings: { name: 'Testhaus', type: 'Neubau', budget: 500000, start: '', end: '', address: '', color: '#ff9f1c', modules: {} },
        kosten: [], eigenleistungen: [], budgetKat: [], meilensteine: [], aufgaben: [], tagebuch: [], notizen: [], kontakte: [], gantt: [],
        fotos: [], fotoAlben: [], dokumentation: [], wartungen: [], abhaengigkeiten: [], angebote: [], zahlungen: [], maengel: [],
        gescannteRechnungen: [], zahlungspersonen: [], dateien: [], grundrisse: [], helfer: [], helfereinsaetze: [], _deletedIds: {} };
      seed.forEach(([t, it]) => proj[t].push(it));
      localStorage.setItem('bauplan_user_id', uid);
      localStorage.setItem('bauplan_projects', JSON.stringify([proj]));
      localStorage.setItem('bauplan_current', String(pid));
    }, [UID, PID, SEED]);
  }
  await page.goto(ORIGIN + '/index.html', { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors };
}

const waitFor = async (page, fn, arg, ms = 15000) => { await page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }); };
const settle = (page, ms = 7000) => page.waitForTimeout(ms);

// Ausgabe ueber das echte Formular eintragen (Felder fuellen + Speichern-Knopf)
async function ausgabe(page, beschr, betrag) {
  await page.evaluate(([b, v]) => {
    try { showPage('kosten'); } catch (e) {}
    openModal('modal-kosten');
    document.getElementById('k-beschr').value = b;
    const inp = document.getElementById('k-betrag');
    inp.value = String(v); inp.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = [...document.querySelectorAll('#modal-kosten .modal-actions button')].find(x => /speichern|einbuchen|save/i.test(x.textContent))
             || document.querySelector('#modal-kosten .modal-actions .btn-primary');
    btn.click();
  }, [beschr, betrag]);
}
const lokal = (page, beschr) => page.evaluate(b => (state.kosten || []).filter(k => k.beschr === b).map(k => k.betrag), beschr);
const cloud = (page, beschr) => page.evaluate(b => window.__fakeDb.projekt_items.filter(r => r.item_type === 'kosten' && r.payload.beschr === b).map(r => r.payload.betrag), beschr);

const results = [];
async function scenario(name, fn) {
  if (process.env.NUR && !name.startsWith(process.env.NUR)) return;   // z.B. NUR=E10 → nur dieses Szenario
  const t0 = Date.now();
  try { const msg = await fn(); results.push([!msg, name, msg || '', Date.now() - t0]); }
  catch (e) { results.push([false, name, 'Abbruch: ' + (e && e.message || e).split('\n')[0], Date.now() - t0]); }
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

// A) Wie im Feedback: 1.000 € speichern, dann einen hoeheren Betrag, waehrend die
//    App (ausgeloest durch das Realtime-Echo des ersten Uploads) neu laedt.
await scenario('A: 2. Ausgabe während eines Neuladens (Realtime-Echo) geht nicht verloren', async () => {
  const { ctx, page } = await boot(browser, { read: 700, rtDelay: 2300 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    await ausgabe(page, 'Fliesen 1000', 1000);
    // warten, bis das Echo des ersten Uploads ein Neuladen aus der Cloud ausloest …
    await waitFor(page, () => window.__fakeStats.itemReads >= 2 && window.__fakeStats.itemReadsInFlight > 0, null, 12000);
    // … und genau jetzt den zweiten, hoeheren Betrag eintragen
    await ausgabe(page, 'Fenster 4160', 4160);
    await settle(page);
    const l1 = await lokal(page, 'Fliesen 1000'), l2 = await lokal(page, 'Fenster 4160');
    const c1 = await cloud(page, 'Fliesen 1000'), c2 = await cloud(page, 'Fenster 4160');
    const p = [];
    if (l1.length !== 1 || c1.length !== 1) p.push(`1.000 €: lokal ${l1.length}, Cloud ${c1.length}`);
    if (l2.length !== 1) p.push(`4.160 € ist in der App VERSCHWUNDEN (lokal ${l2.length})`);
    if (c2.length !== 1) p.push(`4.160 € wurde NIE in die Cloud gespeichert (Cloud ${c2.length})`);
    return p.join(' · ');
  } finally { await ctx.close(); }
});

// B) Eintrag waehrend des ersten Cloud-Ladens nach dem App-Start (langsames Netz)
await scenario('B: Ausgabe direkt nach dem App-Start (Cloud lädt noch) bleibt erhalten', async () => {
  const { ctx, page } = await boot(browser, { read: 300, firstItemsRead: 3500 }, { cache: true });
  try {
    await waitFor(page, () => typeof currentUser !== 'undefined' && currentUser && window.__fakeStats.itemReadsInFlight > 0);
    await ausgabe(page, 'Beton Start', 2360);
    await waitFor(page, () => _cloudLoadedOk === true, null, 15000);
    await settle(page, 6000);
    const l = await lokal(page, 'Beton Start'), c = await cloud(page, 'Beton Start');
    const p = [];
    if (l.length !== 1) p.push(`in der App VERSCHWUNDEN (lokal ${l.length})`);
    if (c.length !== 1) p.push(`NIE in die Cloud gespeichert (Cloud ${c.length})`);
    return p.join(' · ');
  } finally { await ctx.close(); }
});

// C) App kommt zurueck in den Vordergrund (focus/visibilitychange) waehrend gespeichert wird
await scenario('C: Zurück in die App während des Speicherns verliert nichts', async () => {
  const { ctx, page } = await boot(browser, { read: 600, rtDelay: 99999 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    await ausgabe(page, 'Dach Fokus', 12000);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await settle(page, 6000);
    const l = await lokal(page, 'Dach Fokus'), c = await cloud(page, 'Dach Fokus');
    const p = [];
    if (l.length !== 1) p.push(`in der App VERSCHWUNDEN (lokal ${l.length})`);
    if (c.length !== 1) p.push(`NIE in die Cloud gespeichert (Cloud ${c.length})`);
    return p.join(' · ');
  } finally { await ctx.close(); }
});

// D) Gegenprobe: Loeschen bleibt Loeschen (darf durch den Schutz NICHT zurueckkommen)
await scenario('D: Gelöschte Ausgabe kommt nach dem Neuladen nicht zurück', async () => {
  const { ctx, page } = await boot(browser, { read: 400, rtDelay: 2300 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    await ausgabe(page, 'Wird gelöscht', 777);
    await settle(page, 3500);
    await page.evaluate(async () => {
      const k = state.kosten.find(x => x.beschr === 'Wird gelöscht');
      window.showConfirm = async () => true;          // Bestätigungsdialog automatisch bejahen
      await deleteKosten(k.id);
    });
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
    await settle(page, 6000);
    const l = await lokal(page, 'Wird gelöscht'), c = await cloud(page, 'Wird gelöscht');
    const p = [];
    if (l.length) p.push(`kam in der App zurück (lokal ${l.length})`);
    if (c.length) p.push(`steht noch in der Cloud (${c.length})`);
    return p.join(' · ');
  } finally { await ctx.close(); }
});

// E) Rechnung scannen: KI liefert Betraege als deutschen Text bzw. der Server meldet Fehler
async function scan(page, kiResponse, { pdf = false, gross = false } = {}) {
  page.__kiHandler = route => route.fulfill(kiResponse);
  return page.evaluate(async ([pdf, gross]) => {
    let file;
    if (pdf) file = new File(['%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF'], 'rechnung.pdf', { type: 'application/pdf' });
    else {
      // gross = echtes Handyfoto-Format (einige 100 KB), sonst ein Mini-Bild
      const c = document.createElement('canvas'); c.width = gross ? 900 : 60; c.height = gross ? 700 : 40;
      const g = c.getContext('2d');
      if (gross) { const d = g.createImageData(900, 700); for (let i = 0; i < d.data.length; i++) d.data[i] = (i * 7919 % 251) ^ (i >> 5 & 255); g.putImageData(d, 0, 0); }
      else g.fillRect(0, 0, 60, 40);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
      file = new File([blob], 'rechnung.jpg', { type: 'image/jpeg' });
    }
    openModal('modal-rechnung-scan');
    await _processScanFile(file);
    return {
      brutto: document.getElementById('scan-brutto').value,
      netto: document.getElementById('scan-netto').value,
      fehler: document.getElementById('scan-error').style.display !== 'none' ? document.getElementById('scan-error').textContent : '',
    };
  }, [pdf, gross]);
}
// Erfolgreiche KI-Antwort fuer eine Rechnung
const KI_OK = (beschr, brutto) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text',
  text: JSON.stringify({ beschreibung: beschr, anbieter: 'Fa. Test', datum: '2026-10-01', netto: '', mwst_prozent: 20, brutto, kategorie: 'Rohbau', skonto_prozent: 0, skonto_bis: null }) }] }) });
const BEREIT = () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro';
await scenario('E1: Scan – KI liefert "4.160,00" als Text → Betrag 4160 übernommen', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    const r = await scan(page, { status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text',
      text: 'Hier das Ergebnis:\n{"beschreibung":"Fenster","anbieter":"Fa. X","datum":"2026-10-01","netto":"3.466,67","mwst_prozent":20,"brutto":"4.160,00","kategorie":"Rohbau","skonto_prozent":0,"skonto_bis":null}' }] }) });
    if (r.fehler) return 'Fehlermeldung statt Ergebnis: ' + r.fehler;
    if (Math.abs(parseFloat(r.brutto) - 4160) > 0.001) return `Brutto-Feld = "${r.brutto}" statt 4160`;
    if (Math.abs(parseFloat(r.netto) - 3466.67) > 0.001) return `Netto-Feld = "${r.netto}" statt 3466.67`;
    return '';
  } finally { await ctx.close(); }
});
await scenario('E2: Scan – Server meldet "Datei zu groß" (413) → verständliche Meldung', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    const r = await scan(page, { status: 413, contentType: 'text/html', body: '<html>Request Entity Too Large</html>' });
    if (!/zu groß/i.test(r.fehler)) return `Meldung war: "${r.fehler}"`;
    return '';
  } finally { await ctx.close(); }
});
await scenario('E3: Scan – KI-Dienst gestört (500) → verständliche Meldung', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    const r = await scan(page, { status: 500, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Overloaded' } }) });
    if (!r.fehler || /JSON|Unexpected|undefined/i.test(r.fehler)) return `Meldung war: "${r.fehler}"`;
    return '';
  } finally { await ctx.close(); }
});
await scenario('E4: Scan einbuchen ohne gültigen Betrag wird abgelehnt (keine 0-€-Buchung)', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, () => typeof _cloudLoadedOk !== 'undefined' && _cloudLoadedOk && window._userPlan === 'pro');
    const vorher = await page.evaluate(() => state.kosten.length);
    await page.evaluate(async () => {
      openModal('modal-rechnung-scan');
      document.getElementById('scan-result').style.display = 'block';
      document.getElementById('scan-beschr').value = 'Ohne Betrag';
      document.getElementById('scan-brutto').value = '';
      await confirmRechnungScan();
    });
    const nachher = await page.evaluate(() => state.kosten.length);
    if (nachher !== vorher) return 'Ausgabe mit 0 € wurde gespeichert';
    return '';
  } finally { await ctx.close(); }
});

// E5–E9) Scan einbuchen: sofort sichtbar, Beleg im Hintergrund, PDF-Typ, neue Person
await scenario('E5: Scan einbuchen – Ausgabe sofort sichtbar, Beleg kommt im Hintergrund nach', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, uploadDelay: 3000 });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Scan Sofort', '480,00'));
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    const s = await page.evaluate(async () => {
      showPage('rechnungen');
      document.getElementById('scan-confirm-btn').click();
      await new Promise(res => setTimeout(res, 300));
      return { lokal: state.kosten.some(k => k.beschr === 'Scan Sofort'),
               liste: document.getElementById('gr-table').textContent.includes('Scan Sofort'),
               offen: document.getElementById('modal-rechnung-scan').classList.contains('open'),
               uploadLaeuft: window.__fakeUploads.length === 1 && !window.__fakeUploads[0].done };
    });
    const p = [];
    if (!s.lokal) p.push('Ausgabe nach 0,3 s noch nicht eingebucht (wartet auf den Bild-Upload)');
    if (!s.liste) p.push('Rechnungen-Liste zeigt die neue Rechnung nicht');
    if (s.offen) p.push('Fenster bleibt während des Uploads offen');
    if (!s.uploadLaeuft) p.push('Upload lief nicht im Hintergrund (Test-Annahme)');
    if (p.length) return p.join(' · ');
    // Die Buchung erreicht die Cloud schon waehrend des Uploads – ohne eingebettetes Bild (klein & schnell)
    try {
      await waitFor(page, () => window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && r.payload.beschr === 'Scan Sofort'), null, 2500);
    } catch (e) { return 'Buchung erreicht die Cloud erst nach dem Beleg-Upload'; }
    const roh = await page.evaluate(() => ({ data: !!window.__fakeDb.projekt_items.find(r => r.item_type === 'kosten' && r.payload.beschr === 'Scan Sofort').payload.scanData,
      laeuft: !window.__fakeUploads[0].done }));
    if (roh.laeuft && roh.data) return 'Buchung wird mit eingebettetem Bild abgeglichen (großer, langsamer Abgleich)';
    await waitFor(page, () => window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && r.payload.beschr === 'Scan Sofort' && r.payload.scanUrl), null, 15000);
    const n = await page.evaluate(() => {
      const k = state.kosten.find(x => x.beschr === 'Scan Sofort');
      const g = (state.gescannteRechnungen || []).find(x => String(x.kostenId) === String(k.id));
      return { kUrl: !!k.scanUrl, kData: !!k.scanData, gUrl: !!(g && g.scanUrl), gData: !!(g && g.scanData) };
    });
    if (!n.kUrl || n.kData) p.push(`Ausgabe: Beleg-Link ${n.kUrl}, Bild im Eintrag ${n.kData}`);
    if (!n.gUrl || n.gData) p.push(`Gescannte Rechnung: Beleg-Link ${n.gUrl}, Bild im Eintrag ${n.gData}`);
    return p.join(' · ');
  } finally { await ctx.close(); }
});
await scenario('E6: PDF-Rechnung wird als PDF gespeichert (nicht als .jpg) und nicht als Bild angezeigt', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('PDF Rechnung', '120,00'), { pdf: true });
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    await page.evaluate(() => { showPage('kosten'); document.getElementById('scan-confirm-btn').click(); });
    await waitFor(page, () => (state.kosten || []).some(k => k.beschr === 'PDF Rechnung' && k.scanUrl), null, 10000);
    const x = await page.evaluate(() => ({ path: window.__fakeUploads[0]?.path || '', type: window.__fakeUploads[0]?.type || '',
      bilder: [...document.querySelectorAll('#kosten-table img, #gr-table img')].filter(i => /\.pdf|application\/pdf/i.test(i.getAttribute('src') || '')).length }));
    const p = [];
    if (!/\.pdf$/i.test(x.path)) p.push(`Dateiname „${x.path.split('/').pop()}"`);
    if (x.type !== 'application/pdf') p.push(`Dateityp „${x.type}"`);
    if (x.bilder) p.push(`${x.bilder}× PDF als (kaputtes) Bild angezeigt`);
    return p.join(' · ');
  } finally { await ctx.close(); }
});
await scenario('E7: Beleg-Upload scheitert → PDF bleibt mit richtigem Typ beim Eintrag', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, uploadFail: true });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('PDF ohne Speicher', '99,00'), { pdf: true });
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    await page.evaluate(() => document.getElementById('scan-confirm-btn').click());
    await waitFor(page, () => (state.kosten || []).some(k => k.beschr === 'PDF ohne Speicher' && k.scanData), null, 10000);
    const x = await page.evaluate(() => {
      const k = state.kosten.find(x => x.beschr === 'PDF ohne Speicher');
      const g = (state.gescannteRechnungen || []).find(x => String(x.kostenId) === String(k.id));
      return { k: (k.scanData || '').slice(0, 28), g: ((g && g.scanData) || '').slice(0, 28) };
    });
    const ok = v => v.startsWith('data:application/pdf');
    return ok(x.k) && ok(x.g) ? '' : `gespeichert als „${x.k}…" / „${x.g}…"`;
  } finally { await ctx.close(); }
});
await scenario('E8: Während des Beleg-Uploads gelöscht → bleibt gelöscht, Datei wird entfernt', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, uploadDelay: 2500 });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Gleich weg', '55,00'));
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    await page.evaluate(async () => {
      document.getElementById('scan-confirm-btn').click();
      await new Promise(res => setTimeout(res, 300));
      window.showConfirm = async () => true;
      const k = state.kosten.find(x => x.beschr === 'Gleich weg');
      if (k) await deleteKosten(k.id);
    });
    await waitFor(page, () => window.__fakeUploads.length && window.__fakeUploads[0].done, null, 10000);
    await settle(page, 2500);
    const x = await page.evaluate(() => ({
      lokal: state.kosten.filter(k => k.beschr === 'Gleich weg').length,
      scans: (state.gescannteRechnungen || []).filter(g => g.beschr === 'Gleich weg').length,
      cloud: window.__fakeDb.projekt_items.filter(r => r.payload && r.payload.beschr === 'Gleich weg').length,
      entfernt: window.__fakeRemoved.includes(window.__fakeUploads[0].path) }));
    const p = [];
    if (x.lokal || x.scans) p.push(`kam in der App zurück (Ausgabe ${x.lokal}, Rechnung ${x.scans})`);
    if (x.cloud) p.push(`steht in der Cloud (${x.cloud})`);
    if (!x.entfernt) p.push('hochgeladene Datei bleibt verwaist im Speicher');
    return p.join(' · ');
  } finally { await ctx.close(); }
});
await scenario('E9: Neue Person beim Scan („Bezahlt von") landet mit eigener ID in der Cloud', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Scan mit Person', '300,00'));
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    const vorher = await page.evaluate(() => {
      const sel = document.getElementById('scan-bezahlt-von');
      sel.value = '__neu__'; sel.dispatchEvent(new Event('change'));
      const inp = document.getElementById('scan-bezahlt-von-neu');
      if (!inp || sel.value !== '__neu__') return 'keine Möglichkeit, eine neue Person einzutragen';
      inp.value = 'Oma Erna';
      document.getElementById('scan-confirm-btn').click();
      return '';
    });
    if (vorher) return vorher;
    await waitFor(page, () => window.__fakeDb.projekt_items.some(r => r.item_type === 'zahlungspersonen' && r.payload.name === 'Oma Erna')
      && window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && r.payload.beschr === 'Scan mit Person'), null, 10000);
    const x = await page.evaluate(() => {
      const k = window.__fakeDb.projekt_items.find(r => r.item_type === 'kosten' && r.payload.beschr === 'Scan mit Person');
      const pe = window.__fakeDb.projekt_items.find(r => r.item_type === 'zahlungspersonen' && r.payload.name === 'Oma Erna');
      const g = window.__fakeDb.projekt_items.find(r => r.item_type === 'gescannteRechnungen' && r.payload.beschr === 'Scan mit Person');
      return { bv: k.payload.bezahltVon, ids: new Set([k.item_id, pe.item_id, g && g.item_id]).size };
    });
    const p = [];
    if (x.bv !== 'Oma Erna') p.push(`Ausgabe „Bezahlt von" = „${x.bv}"`);
    if (x.ids !== 3) p.push('Person, Ausgabe und Rechnung teilen sich eine ID (Löschen träfe mehrere)');
    return p.join(' · ');
  } finally { await ctx.close(); }
});

await scenario('E10: App direkt nach dem Einbuchen geschlossen → Beleg wird beim nächsten Start nachgeladen', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, persist: true, uploadHangFirstLoad: true });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Beleg nach Neustart', '730,00'), { gross: true });
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    await page.evaluate(() => document.getElementById('scan-confirm-btn').click());
    try {
      // in der Cloud angekommen (und der Test-Server hat es dauerhaft abgelegt)
      await waitFor(page, () => (sessionStorage.getItem('__fakeDbState') || '').includes('Beleg nach Neustart'), null, 8000);
    } catch (e) { return 'Ausgabe wurde nicht eingebucht, solange der Beleg-Upload hängt'; }
    const vorher = await page.evaluate(async () => ({ laeuft: window.__fakeUploads.length > 0 && !window.__fakeUploads[0].done,
      vorgemerkt: typeof _bqAll === 'function' ? (await _bqAll()).length : 0 }));
    if (!vorher.laeuft) return 'Test-Annahme verletzt: Upload lief nicht mehr';
    if (!vorher.vorgemerkt) return 'Beleg ist nirgends gesichert, solange der Upload läuft (geht beim Schließen der App verloren)';
    // App "abschießen" und neu starten
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    try {
      await waitFor(page, () => window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && r.payload.beschr === 'Beleg nach Neustart' && r.payload.scanUrl), null, 15000);
    } catch (e) { return 'Beleg wurde nach dem Neustart nicht hochgeladen'; }
    await settle(page, 1500);
    const x = await page.evaluate(async () => {
      const k = state.kosten.find(x => x.beschr === 'Beleg nach Neustart');
      const g = (state.gescannteRechnungen || []).find(x => String(x.kostenId) === String(k && k.id));
      const c = window.__fakeDb.projekt_items.find(r => r.item_type === 'kosten' && r.payload.beschr === 'Beleg nach Neustart');
      return { k: !!(k && k.scanUrl && !k.scanData), g: !!(g && g.scanUrl && !g.scanData), cloudKlein: !c.payload.scanData };
    });
    const p = [];
    // naechster Start: Cloud hat den Beleg -> Vormerkung wird aufgeraeumt
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    try { await waitFor(page, async () => (await _bqAll()).length === 0, null, 8000); }
    catch (e) { p.push('Vormerkung wird auch nach dem nächsten Start nicht aufgeräumt'); }
    if (!x.k) p.push('Ausgabe ohne Beleg-Link');
    if (!x.g) p.push('Gescannte Rechnung ohne Beleg-Link');
    if (!x.cloudKlein) p.push('Bild steckt weiterhin im Cloud-Eintrag');
    return p.join(' · ');
  } finally { await ctx.close(); }
});

await scenario('E11: Scan abgebrochen, KI antwortet später → Fenster wird nicht nachträglich befüllt', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 });
  try {
    await waitFor(page, BEREIT);
    const ki = KI_OK('Zu spät', '999,00');
    page.__kiHandler = route => setTimeout(() => route.fulfill(ki).catch(() => {}), 1500);
    const x = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 60; c.height = 40; c.getContext('2d').fillRect(0, 0, 60, 40);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
      openModal('modal-rechnung-scan');
      const lauf = _processScanFile(new File([blob], 'r.jpg', { type: 'image/jpeg' }));
      await new Promise(res => setTimeout(res, 400));
      [...document.querySelectorAll('#modal-rechnung-scan .modal-actions button')].find(b => /abbrechen/i.test(b.textContent)).click();
      await lauf;
      return { beschr: document.getElementById('scan-beschr').value, ergebnis: document.getElementById('scan-result').style.display,
               knopf: document.getElementById('scan-confirm-btn').style.display, bild: typeof scanImageBase64 === 'string' };
    });
    const p = [];
    if (x.beschr === 'Zu spät' || x.ergebnis === 'block' || x.knopf !== 'none') p.push('abgebrochener Scan füllte das Fenster nachträglich');
    if (x.bild) p.push('Bild des abgebrochenen Scans bleibt hängen');
    return p.join(' · ');
  } finally { await ctx.close(); }
});
const ALT_PDF = 'data:image/jpeg;base64,' + Buffer.from('%PDF-1.4\n' + 'x'.repeat(60000) + '\n%%EOF').toString('base64');
await scenario('E12: Alter, eingebetteter PDF-Beleg wird beim Start als echtes PDF abgelegt', async () => {
  const seed = [['kosten', { id: 1700000000101, datum: '2026-08-01', beschr: 'Alt-PDF', kat: 'Rohbau', mwst: 20, netto: 100, betrag: 120,
    status: 'Bezahlt', anbieter: '', aiScanned: true, scanUrl: null, scanPath: null, scanData: ALT_PDF, _updatedAt: 1700000000101 }],
    ['gescannteRechnungen', { id: 1700000000102, kostenId: 1700000000101, datum: '2026-08-01', beschr: 'Alt-PDF', anbieter: '', kat: 'Rohbau',
    mwst: 20, netto: 100, brutto: 120, status: 'Bezahlt', scanUrl: null, scanPath: null, scanData: ALT_PDF, gescannt: '2026-08-01', _updatedAt: 1700000000102 }]];
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999 }, { seed });
  try {
    await waitFor(page, BEREIT);
    try {
      await waitFor(page, () => (state.kosten || []).some(k => k.beschr === 'Alt-PDF' && k.scanUrl), null, 10000);
    } catch (e) { return 'eingebetteter Beleg wurde nicht in die Ablage verschoben'; }
    const x = await page.evaluate(() => {
      const u = window.__fakeUploads.find(u => /rechnungen/.test(u.path)) || {};
      const k = state.kosten.find(k => k.beschr === 'Alt-PDF');
      const g = state.gescannteRechnungen.find(r => String(r.kostenId) === String(k.id));
      return { typ: u.type, name: (u.path || '').split('/').pop(), k: !k.scanData, g: !!(g && g.scanUrl && !g.scanData) };
    });
    const p = [];
    if (x.typ !== 'application/pdf' || !/\.pdf$/.test(x.name)) p.push(`abgelegt als „${x.name}" (${x.typ})`);
    if (!x.k || !x.g) p.push('Bild bleibt im Eintrag');
    return p.join(' · ');
  } finally { await ctx.close(); }
});

await scenario('E13: Beleg hochgeladen, App vor dem Cloud-Abgleich beendet → Beleg kommt beim nächsten Start dran', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, persist: true, uploadDelay: 1500 });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Abbruch vor Abgleich', '410,00'));
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    await page.evaluate(() => document.getElementById('scan-confirm-btn').click());
    await waitFor(page, () => (sessionStorage.getItem('__fakeDbState') || '').includes('Abbruch vor Abgleich'), null, 8000);
    // Netz weg, bevor der Beleg-Link in die Cloud kommt
    await page.evaluate(() => { window.__fakeCfg.writesFail = true; });
    try { await waitFor(page, () => (state.kosten.find(k => k.beschr === 'Abbruch vor Abgleich') || {}).scanUrl, null, 8000); }
    catch (e) { return 'Beleg wurde lokal nicht angehängt (Test-Annahme)'; }
    const cloudVorher = await page.evaluate(() => !!window.__fakeDb.projekt_items.find(r => r.item_type === 'kosten' && r.payload.beschr === 'Abbruch vor Abgleich').payload.scanUrl);
    if (cloudVorher) return 'Test-Annahme verletzt: Cloud hatte den Link schon';
    await page.reload({ waitUntil: 'domcontentloaded' });   // App beendet + neu gestartet (Netz wieder da)
    await waitFor(page, BEREIT);
    try {
      await waitFor(page, () => window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && r.payload.beschr === 'Abbruch vor Abgleich' && r.payload.scanUrl), null, 10000);
    } catch (e) { return 'Beleg ging verloren (Cloud-Eintrag ohne Beleg, Vormerkung schon gelöscht)'; }
    const x = await page.evaluate(() => ({ neueUploads: window.__fakeUploads.length }));
    return x.neueUploads ? `Beleg wurde unnötig erneut hochgeladen (${x.neueUploads}×)` : '';
  } finally { await ctx.close(); }
});
await scenario('E14: Großes PDF offline → wird beim nächsten Abgleich derselben Sitzung nachgeladen', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, uploadFail: true });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Großes PDF', '1500,00'), { pdf: true });
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    // so tun, als waere das PDF gross (> 1,2 Mio. Zeichen, passt nicht in den Eintrag)
    await page.evaluate(() => {
      let b = scanImageBase64.replace(/=+$/, '') + 'A'.repeat(1300000);   // gueltiges Base64 bleiben
      while (b.length % 4) b += 'A';
      scanImageBase64 = b;
      document.getElementById('scan-confirm-btn').click();
    });
    await page.waitForTimeout(1500);
    const vorher = await page.evaluate(async () => ({ k: !!(state.kosten.find(k => k.beschr === 'Großes PDF') || {}).id,
      beleg: !!(state.kosten.find(k => k.beschr === 'Großes PDF') || {}).scanData, jobs: typeof _bqAll === 'function' ? (await _bqAll()).length : 0 }));
    if (!vorher.k) return 'Ausgabe nicht eingebucht';
    if (vorher.beleg) return 'großes PDF steckt im Eintrag (großer Abgleich)';
    if (!vorher.jobs) return 'großes PDF nicht für später vorgemerkt';
    // Netz wieder da, App kommt in den Vordergrund
    await page.evaluate(() => { window.__fakeCfg.uploadFail = false; window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    try { await waitFor(page, () => (state.kosten.find(k => k.beschr === 'Großes PDF') || {}).scanUrl, null, 10000); }
    catch (e) { return 'Beleg erst nach einem Neustart nachgeladen (nicht beim nächsten Abgleich)'; }
    return '';
  } finally { await ctx.close(); }
});

await scenario('E15: Beleg bewusst entfernt → wird nicht wieder angehängt (auch nicht nach Neustart)', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, persist: true });
  try {
    await waitFor(page, BEREIT);
    const r = await scan(page, KI_OK('Beleg weg', '88,00'));
    if (r.fehler) return 'Scan-Fehler: ' + r.fehler;
    await page.evaluate(() => document.getElementById('scan-confirm-btn').click());
    await waitFor(page, () => (state.kosten.find(k => k.beschr === 'Beleg weg') || {}).scanUrl, null, 8000);
    await page.evaluate(async () => {
      const k = state.kosten.find(k => k.beschr === 'Beleg weg');
      editKosten(k.id); clearKostenBeleg(); await saveKosten();
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(3000);
    const nachFokus = await page.evaluate(() => !!(state.kosten.find(k => k.beschr === 'Beleg weg') || {}).scanUrl);
    await waitFor(page, () => (sessionStorage.getItem('__fakeDbState') || '').includes('Beleg weg'), null, 5000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    await page.waitForTimeout(3000);
    const nachStart = await page.evaluate(() => !!(state.kosten.find(k => k.beschr === 'Beleg weg') || {}).scanUrl);
    const p = [];
    if (nachFokus) p.push('kam beim nächsten Abgleich zurück');
    if (nachStart) p.push('kam nach dem Neustart zurück');
    return p.join(' · ');
  } finally { await ctx.close(); }
});

// E16) Eigenleistung (alte Daten) wird einmalig zur Ausgabe „nicht im Budget" – in der Cloud,
//      ohne Doppel nach dem Neustart; eine geloeschte Uebernahme kommt nicht wieder.
await scenario('E16: Eigenleistung → einmalig Ausgabe „nicht im Budget" (Cloud), gelöscht bleibt gelöscht', async () => {
  const EL = ['eigenleistungen', { id: 98200, datum: '2026-08-01', beschr: 'Dämmung selbst', kat: 'Rohbau', wert: 900, von: 'Simon', notiz: '', _updatedAt: 1700000000000 }];
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, persist: true }, { seed: [EL] });
  const inCloud = () => page.evaluate(() => {
    const k = window.__fakeDb.projekt_items.filter(r => r.item_type === 'kosten' && String(r.payload.id) === '982007').map(r => r.payload);
    const e = window.__fakeDb.projekt_items.find(r => r.item_type === 'eigenleistungen' && String(r.payload.id) === '98200');
    return { k, migriert: !!(e && e.payload._migriert) };
  });
  try {
    await waitFor(page, BEREIT);
    await waitFor(page, () => window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && String(r.payload.id) === '982007'), null, 10000);
    await settle(page, 3000);
    const c1 = await inCloud();
    const p = [];
    if (c1.k.length !== 1 || c1.k[0].imBudget !== false || c1.k[0].betrag !== 900) p.push(`nach Übernahme in der Cloud: ${JSON.stringify(c1.k)}`);
    if (!c1.migriert) p.push('Eigenleistung in der Cloud nicht als übernommen markiert');
    await waitFor(page, () => (sessionStorage.getItem('__fakeDbState') || '').includes('982007'), null, 5000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    await settle(page, 3000);
    const lokal2 = await page.evaluate(() => state.kosten.filter(k => String(k.id) === '982007').length);
    if (lokal2 !== 1 || (await inCloud()).k.length !== 1) p.push(`nach Neustart doppelt/fehlt: lokal ${lokal2}`);
    await page.evaluate(async () => { window.showConfirm = async () => true; await deleteKosten(982007); });
    await waitFor(page, () => !window.__fakeDb.projekt_items.some(r => r.item_type === 'kosten' && String(r.payload.id) === '982007'), null, 10000);
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    await settle(page, 3000);
    const lokal3 = await page.evaluate(() => state.kosten.filter(k => String(k.id) === '982007').length);
    if (lokal3 || (await inCloud()).k.length) p.push('gelöschte übernommene Ausgabe kam zurück');
    return p.join(' · ');
  } finally { await ctx.close(); }
});

// E17) Aufgaben-Kategorie + Unteraufgabe landen als eigene Zeilen in der Cloud, sind nach dem
//      Neustart wieder da; eine geloeschte Kategorie kommt nicht zurueck.
await scenario('E17: Aufgaben-Kategorie und Unteraufgabe überleben den Neustart, gelöschte Kategorie bleibt weg', async () => {
  const { ctx, page } = await boot(browser, { read: 200, rtDelay: 99999, persist: true });
  const zeilen = typ => page.evaluate(t => window.__fakeDb.projekt_items.filter(r => r.item_type === t).map(r => r.payload), typ);
  try {
    await waitFor(page, BEREIT);
    const ids = await page.evaluate(() => {
      const k = _tkKatAnlegen('Küche E17');
      const haupt = { id: _neueId(), name: 'Küche bestellen E17', prio: 'Hoch', status: 'Offen', datum: '', katId: k.id, _updatedAt: Date.now() };
      const unter = { id: _neueId(), name: 'Maße nehmen E17', prio: 'Mittel', status: 'Offen', datum: '', katId: k.id, parentId: haupt.id, wdh: 'woechentlich', _updatedAt: Date.now() };
      state.aufgaben.push(haupt, unter); save();
      return { k: k.id, haupt: haupt.id, unter: unter.id };
    });
    await waitFor(page, i => window.__fakeDb.projekt_items.some(r => r.item_type === 'aufgabenKat' && String(r.payload.id) === String(i.k))
      && window.__fakeDb.projekt_items.some(r => r.item_type === 'aufgaben' && String(r.payload.id) === String(i.unter)), ids, 10000);
    await waitFor(page, () => (sessionStorage.getItem('__fakeDbState') || '').includes('E17'), null, 5000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    await settle(page, 2500);
    const nach = await page.evaluate(i => ({ kat: (state.aufgabenKat || []).some(k => String(k.id) === String(i.k)),
      unter: (state.aufgaben.find(t => String(t.id) === String(i.unter)) || {}) }), ids);
    const p = [];
    if (!nach.kat) p.push('Kategorie nach Neustart weg');
    if (String(nach.unter.parentId) !== String(ids.haupt) || String(nach.unter.katId) !== String(ids.k) || nach.unter.wdh !== 'woechentlich') p.push(`Unteraufgabe nach Neustart: ${JSON.stringify(nach.unter)}`);
    await page.evaluate(async i => { window.showConfirm = async () => true; await tkKatLoeschen(i.k); }, ids);
    await waitFor(page, i => !window.__fakeDb.projekt_items.some(r => r.item_type === 'aufgabenKat' && String(r.payload.id) === String(i.k)), ids, 10000);
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, BEREIT);
    await settle(page, 2500);
    const ende = await page.evaluate(i => ({ kat: (state.aufgabenKat || []).some(k => String(k.id) === String(i.k)),
      haupt: (state.aufgaben.find(t => String(t.id) === String(i.haupt)) || {}) }), ids);
    if (ende.kat || (await zeilen('aufgabenKat')).some(k => String(k.id) === String(ids.k))) p.push('gelöschte Kategorie kam zurück');
    if (ende.haupt.katId) p.push('Aufgabe hängt noch an der gelöschten Kategorie');
    return p.join(' · ');
  } finally { await ctx.close(); }
});

await browser.close();

// ── Ergebnis ──
console.log('\n  PLANORY – End-to-End: Speichern → Cloud → Neuladen');
console.log('  ' + '─'.repeat(64));
let fail = 0;
for (const [ok, name, msg, ms] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name} (${(ms / 1000).toFixed(1)} s)`);
  if (!ok) { fail++; console.log('      → ' + msg); }
}
console.log('  ' + '─'.repeat(64));
console.log(`  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);
