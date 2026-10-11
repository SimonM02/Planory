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
  const db = window.__fakeDb = {
    projektdaten: [{ id: rowId++, user_id: uid, typ: 'all_projects', updated_at: now, daten: {
      projects: [{ id: pid, settings: { name: 'Testhaus', type: 'Neubau', budget: 500000, start: '', end: '', address: '', color: '#ff9f1c', modules: {} },
                   budgetKat: [], _budgetKatV2: true, _deletedIds: {} }],
      currentProjectId: pid, onboarded: true, dsgvoAccepted: true, updated_at: now } }],
    projekt_items: seedItems.map(([typ, item]) => ({ id: rowId++, user_id: uid, project_id: String(pid), item_type: typ,
      item_id: String(item.id), payload: jsonb(item), deleted: false, updated_at: now })),
    subscriptions: [{ user_id: uid, plan: 'pro', status: 'active', current_period_end: '2099-01-01' }],
    profiles: [],
  };
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
      if (this.t === 'projekt_items' && changed.length) echo(changed);
      return { data: null, error: null };
    }
  }
  const session = { user: { id: uid, email: 'e2e@planory.test' }, access_token: 'fake-token' };
  const bucket = () => ({
    upload: async p => ({ data: { path: p }, error: null }),
    getPublicUrl: p => ({ data: { publicUrl: 'https://fake.storage/' + p } }),
    remove: async () => ({ data: null, error: null }),
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

async function boot(browser, cfg = {}, { cache = false } = {}) {
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
  await page.addInitScript(fakeSupabase, { uid: UID, pid: PID, cfg, seedItems: SEED });
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
async function scan(page, kiResponse) {
  page.__kiHandler = route => route.fulfill(kiResponse);
  return page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 60; c.height = 40;
    c.getContext('2d').fillRect(0, 0, 60, 40);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
    openModal('modal-rechnung-scan');
    await _processScanFile(new File([blob], 'rechnung.jpg', { type: 'image/jpeg' }));
    return {
      brutto: document.getElementById('scan-brutto').value,
      netto: document.getElementById('scan-netto').value,
      fehler: document.getElementById('scan-error').style.display !== 'none' ? document.getElementById('scan-error').textContent : '',
    };
  });
}
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
