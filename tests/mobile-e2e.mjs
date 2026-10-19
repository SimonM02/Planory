// ═══════════════════════════════════════════════════════════════════════
// PLANORY – Handy-Test (iPhone-Breite 390 px, Deutsch)
// ═══════════════════════════════════════════════════════════════════════
// Startet die ECHTE App (index.html) im eingebauten Demo-Modus und prueft, was
// Nutzer am Handy tatsaechlich sehen bzw. speichern:
//   • keine Tabelle ragt unsichtbar ueber den Rand (iPhone zeigt keinen Scrollbalken)
//   • Knoepfe (z.B. Wartung ✓/✏️/🗑) bleiben im Bild
//   • Auswahlfelder behalten ihre gespeicherten Werte (MwSt beim Bearbeiten!)
//   • Fotos: "Alle Kategorien" zeigt alle Fotos; Rechnungen erscheinen sofort
// Ausfuehren:  node tests/mobile-e2e.mjs     (PLANORY_FILE=… fuer eine andere Datei)
// Braucht Playwright + Chromium, sonst wird der Test uebersprungen.
// ═══════════════════════════════════════════════════════════════════════
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let chromium = null;
for (const spec of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
  try { const m = await import(spec); chromium = (m.default || m).chromium; if (chromium) break; } catch { /* naechste Quelle */ }
}
if (!chromium) { console.log('⏭  Playwright nicht installiert – Handy-Test übersprungen.'); process.exit(0); }

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(process.env.PLANORY_FILE || path.join(here, '..', 'index.html'));
const HTML = readFileSync(FILE, 'utf8');
// jsPDF (sonst vom CDN) lokal ausliefern, damit PDF-Tests offline laufen
let JSPDF = null;
try { JSPDF = readFileSync(path.join(here, '..', 'node_modules', 'jspdf', 'dist', 'jspdf.umd.min.js'), 'utf8'); } catch { /* PDF-Test wird uebersprungen */ }
// Chart.js ebenso (Budget-Grafik)
let CHART = null;
try { CHART = readFileSync(path.join(here, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js'), 'utf8'); } catch { /* Grafik-Test wird uebersprungen */ }
// Nicht als file:// oeffnen (startet eine leere Vorschau) – echte Adresse + Demo-Parameter
const URL_DEMO = 'https://planory.test/index.html?demo=planory2025';

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

async function boot(geraet = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true,
    hasTouch: true, locale: 'de-AT', timezoneId: 'Europe/Vienna', serviceWorkers: 'block', ...geraet });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  await page.addInitScript(() => {
    try { localStorage.setItem('planoryLang', 'de'); localStorage.setItem('dsgvoAccepted', '1'); } catch (e) {}
    const q = () => { const o = { select(){return o}, eq(){return o}, in(){return o}, order(){return o}, maybeSingle(){return o},
      single(){return o}, insert(){return o}, update(){return o}, upsert(){return o}, delete(){return o},
      then(r){ return Promise.resolve({ data: null, error: null }).then(r); } }; return o; };
    window.supabase = { createClient: () => ({ from: q,
      auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; }, signOut: async () => ({}) },
      channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; }, removeChannel(){},
      storage: { from(){ return { upload: async () => ({}), getPublicUrl: () => ({ data: {} }) }; } } }) };
  });
  await page.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('https://planory.test/index.html')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (u.includes('supabase-js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    if (JSPDF && u.includes('jspdf.umd.min.js')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: JSPDF });
    if (CHART && u.includes('chart.umd')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: CHART });
    return r.abort();
  });
  await page.goto(URL_DEMO, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof _demoMode !== 'undefined' && _demoMode && state && state.kosten && state.kosten.length > 0, null, { timeout: 15000 });
  await page.evaluate(() => {
    ['landing-overlay', 'auth-overlay', 'onboarding-overlay'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    // Realistische, laengere Daten (so wie echte Nutzer sie eintragen)
    state.zahlungspersonen = [{ id: 1, name: 'Kredit' }, { id: 2, name: 'Eigenkapital' }];
    state.kosten.forEach((k, i) => {
      k.anbieter = k.anbieter || 'Baumeister Huber GmbH & Co KG';
      k.bezahltVon = i % 3 === 0 ? 'Kredit' : i % 3 === 1 ? 'Eigenkapital' : '';
      if (i === 0) k.beschr = 'Fensterlieferung inklusive Montage und Abdichtung';
    });
    state.aufgaben.unshift({ id: 777001, name: 'Angebote für Photovoltaikanlage mit Batteriespeicher einholen', prio: 'Hoch', status: 'Offen', datum: '2026-11-01', notiz: '' });
    state.tagebuch = [
      { id: 880001, datum: '2026-09-01', title: 'Betonage Bodenplatte inklusive Abdichtung', text: '', weather: '☀️', temp: 18, tags: [],
        workers: [{ name: 'Simon', hours: 8 }, { name: 'Baumeister Huber', hours: 9.5 }] },
      { id: 880002, datum: '2026-09-02', title: 'Mauerwerk Erdgeschoss Außenwände', text: '', weather: '⛅', temp: 15, tags: [],
        workers: [{ name: 'Simon', hours: 6 }, { name: 'Nachbar Thomas', hours: 4 }] },
    ];
    state.wartungen = [
      { id: 990001, name: 'Rauchwarnmelderüberprüfung', kat: 'Sicherheit', intervall: 1, einheit: 'Jahre', last: '2026-01-10' },
      { id: 990002, name: 'Kältemittelprüfung Wärmepumpe', kat: 'Heizung', intervall: 1, einheit: 'Jahre', last: '2026-03-05' },
    ];
  });
  return { ctx, page, errors };
}

// Sichtbare Tabellen, die ohne Karten-Ansicht ueber den Rand ragen
const CLIPPED = () => [...document.querySelectorAll('.table-wrap')]
  .filter(w => w.offsetParent !== null && w.querySelector('table tbody tr'))
  .map(w => {
    const t = w.querySelector('table'), tr = w.querySelector('tbody tr');
    const card = ['block', 'flex'].includes(getComputedStyle(tr).display);
    const name = (w.querySelector('.table-title')?.textContent || [...w.querySelectorAll('th')].map(th => th.textContent).join('|')).trim().slice(0, 40);
    return { name, over: t.scrollWidth - w.clientWidth, card };
  })
  .filter(x => x.over > 8 && !x.card)
  .map(x => `${x.name} (+${x.over}px)`);
// Sichtbare Knoepfe ausserhalb des Bildschirms
const BUTTONS_OUT = sel => [...document.querySelectorAll(sel + ' button')]
  .filter(b => b.offsetParent !== null && b.getBoundingClientRect().width > 0)
  .filter(b => b.getBoundingClientRect().right > innerWidth + 1)
  .map(b => (b.textContent || b.title).trim().slice(0, 20));

const results = [];
async function scenario(name, fn) {
  const t0 = Date.now();
  try { const msg = await fn(); results.push([!msg, name, msg || '', Date.now() - t0]); }
  catch (e) { results.push([false, name, 'Abbruch: ' + String(e && e.message || e).split('\n')[0], Date.now() - t0]); }
}

const { ctx, page, errors } = await boot();
await page.evaluate(() => { window.__echtesConfirm = showConfirm; });   // manche Tests ersetzen die Rueckfrage

// Zuerst (die Seite darf vorher noch nie geoeffnet worden sein):
await scenario('Rechnungen: Einträge erscheinen schon beim ersten Öffnen', async () => {
  const n = await page.evaluate(() => {
    state.gescannteRechnungen = [1, 2].map(i => ({ id: 9300000 + i, kostenId: 0, datum: '2026-09-1' + i, beschr: 'Rechnung ' + i, anbieter: 'Lieferant',
      kat: state.budgetKat[0].name, mwst: 20, netto: 100, brutto: 120, status: 'Bezahlt', gescannt: '2026-09-1' + i }));
    showPage('rechnungen');
    return [...document.querySelectorAll('#gr-table tr')].filter(tr => !tr.querySelector('td[colspan]')).length;
  });
  return n >= 2 ? '' : `nur ${n} Einträge sichtbar (erwartet: 2) – Seite zeigt „Noch keine gescannten Rechnungen"`;
});


await scenario('Budget: Buchungsliste einer Kategorie ist am Handy vollständig sichtbar', async () => {
  await page.evaluate(() => { showPage('budget'); openBudgetDrilldown(state.kosten[0].kat); });
  await page.waitForTimeout(300);
  const c = await page.evaluate(CLIPPED);
  const btn = await page.evaluate(BUTTONS_OUT, '#modal-budget-drilldown');
  await page.evaluate(() => closeModal('modal-budget-drilldown'));
  await page.waitForTimeout(250);
  return [c.length ? 'abgeschnitten: ' + c.join(', ') : '', btn.length ? 'Knöpfe außerhalb: ' + btn.join(', ') : ''].filter(Boolean).join(' · ');
});
for (const [id, label, prep] of [
  ['dashboard', 'Startseite (Letzte Ausgaben, Offene Aufgaben)', ''],
  ['kosten', 'Ausgaben', ''],
  ['budget', 'Budget-Übersicht', ''],
  ['kostenaufteilung', 'Kostenaufteilung', ''],
  ['tagebuch', 'Bautagebuch-Zusammenfassung', "switchDiaryTab('summary', document.getElementById('diary-tab-summary'))"],
  ['kontakte', 'Kontakte', ''],
  ['rechnungen', 'Gescannte Rechnungen', ''],
]) {
  await scenario(`${label}: keine Tabelle am Handy abgeschnitten`, async () => {
    await page.evaluate(([pid, js]) => { showPage(pid); if (js) eval(js); }, [id, prep]);
    await page.waitForTimeout(250);
    const c = await page.evaluate(CLIPPED);
    return c.length ? 'abgeschnitten: ' + c.join(', ') : '';
  });
}
await scenario('Wartung: ✓/✏️/🗑 bleiben bei langen Namen im Bild', async () => {
  await page.evaluate(() => showPage('wartung'));
  await page.waitForTimeout(250);
  const b = await page.evaluate(BUTTONS_OUT, '#page-wartung');
  return b.length ? 'außerhalb des Bildschirms: ' + b.join(', ') : '';
});
await scenario('Wartung: Name bleibt lesbar (kein Umbruch Buchstabe für Buchstabe)', async () => {
  await page.evaluate(() => showPage('wartung'));
  await page.waitForTimeout(200);
  const w = await page.evaluate(() => Math.min(...[...document.querySelectorAll('#page-wartung .wartung-name')]
    .filter(e => e.offsetParent !== null).map(e => Math.round(e.getBoundingClientRect().width))));
  return w < 180 ? `Textspalte nur ${w}px breit – Namen zerfallen in Einzelbuchstaben` : '';
});
await scenario('Budget-Buchungsliste: keine zweite Scroll-Box im Fenster', async () => {
  const r = await page.evaluate(() => {
    showPage('budget'); openBudgetDrilldown(state.kosten[0].kat);
    const w = document.querySelector('#modal-budget-drilldown .table-wrap');
    return { sh: w.scrollHeight, ch: w.clientHeight };
  });
  await page.evaluate(() => closeModal('modal-budget-drilldown'));
  await page.waitForTimeout(250);
  return r.sh > r.ch + 4 ? `Liste scrollt innen (${r.ch}px sichtbar von ${r.sh}px)` : '';
});
await scenario('Einstellungen: Karten passen in die Bildschirmbreite', async () => {
  await page.evaluate(() => showPage('settings'));
  await page.waitForTimeout(250);
  const over = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('#page-settings .table-wrap, #page-settings .card')]
    .filter(e => e.offsetParent !== null).map(e => Math.round(e.getBoundingClientRect().right - (innerWidth - 4)))));
  return over > 0 ? `Karten ragen ${over}px über den Rand` : '';
});

// Sollwerte direkt aus dem HTML-Quelltext (so wie sie im Markup stehen)
const SELECTS = ['k-mwst', 'n-color', 'np-type', 'dk-typ', 'gr-pin-typ', 'g-type', 'gr-filter-kat', 'foto-filter', 'k-bezahlt-von', 'scan-bezahlt-von'];
const SOLL = {};
for (const id of SELECTS) {
  const m = HTML.match(new RegExp('<select[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  if (m) SOLL[id] = [...m[1].matchAll(/<option[^>]*?value="([^"]*)"/g)].map(x => x[1]);
}
await scenario('Auswahlfelder behalten ihre gespeicherten Werte (kein Überschreiben beim Start)', async () => {
  const bad = await page.evaluate(soll => {
    const out = [];
    for (const [id, werte] of Object.entries(soll)) {
      const el = document.getElementById(id); if (!el) continue;
      const ist = [...el.options].map(o => o.value);
      werte.forEach(w => { if (!ist.includes(w)) out.push(`${id}: Wert "${w}" fehlt (jetzt: ${ist.slice(0, 3).map(v => '"' + v + '"').join(', ')})`); });
    }
    return out;
  }, SOLL);
  if (Object.keys(SOLL).length < 6) return 'Sollwerte nicht gefunden (Test kaputt?)';
  return bad.length ? bad.slice(0, 5).join(' · ') : '';
});
await scenario('Ausgabe mit 0 % / 10 % MwSt bearbeiten → MwSt und Betrag bleiben gleich', async () => {
  const r = await page.evaluate(async () => {
    showPage('kosten');
    const mk = (id, mwst, netto, betrag) => ({ id, datum: '2026-10-01', beschr: 'Test ' + mwst + '%', kat: state.budgetKat[0].name, mwst, netto, betrag,
      status: 'Bezahlt', bezahltVon: '', anbieter: 'Firma', skontoProz: 0, skontoBis: '', _updatedAt: 1 });
    state.kosten.push(mk(9100001, 0, 100, 100), mk(9100002, 10, 100, 110), mk(9100003, 20, 100, 120));
    const out = [];
    for (const id of [9100001, 9100002, 9100003, 9100001]) {   // zuletzt nochmal 0 % nach einer 20-%-Ausgabe
      editKosten(id);
      document.getElementById('k-beschr').value += ' (bearbeitet)';
      await saveKosten();
      await new Promise(r => setTimeout(r, 250));
      const k = state.kosten.find(x => x.id === id);
      out.push({ id, mwst: k.mwst, betrag: k.betrag });
    }
    return out;
  });
  const neu = await page.evaluate(() => { editKosten(9100001); closeModal('modal-kosten'); document.getElementById('k-edit-id').value = '';
    openModal('modal-kosten'); const v = document.getElementById('k-mwst').value; closeModal('modal-kosten'); return v; });
  if (neu !== '20') return `Neue Ausgabe übernimmt MwSt "${neu}" der zuletzt bearbeiteten statt 20 %`;
  const soll = { 9100001: [0, 100], 9100002: [10, 110], 9100003: [20, 120] };
  const falsch = r.filter(x => x.mwst !== soll[x.id][0] || Math.abs(x.betrag - soll[x.id][1]) > 0.001)
    .map(x => `${soll[x.id][0]}% wurde zu ${x.mwst}% / ${x.betrag} €`);
  return falsch.join(' · ');
});
await scenario('Fotos: „Alle Kategorien" zeigt Fotos aller Kategorien', async () => {
  const r = await page.evaluate(() => {
    const px = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    state.fotoAlben = [];
    state.fotos = ['Rohbau', 'Dach', 'Elektro'].map((kat, i) => ({ id: 9200001 + i, url: px, data: px, kat, datum: '2026-09-0' + (i + 1), name: 'foto' + i + '.jpg' }));
    showPage('fotos');
    setFotoView('alle', document.getElementById('foto-tab-alle'));
    const grid = document.getElementById('photo-grid');
    return { filter: document.getElementById('foto-filter').value, shown: grid.querySelectorAll('img').length,
             hasAlle: [...document.getElementById('foto-filter').options].some(o => o.value === '') };
  });
  const p = [];
  if (!r.hasAlle) p.push('Auswahl „Alle Kategorien" fehlt');
  if (r.filter !== '') p.push(`Filter steht auf „${r.filter}"`);
  if (r.shown < 3) p.push(`nur ${r.shown} von 3 Fotos sichtbar`);
  return p.join(' · ');
});
await scenario('Englisch: Status wird trotzdem deutsch gespeichert (Werte bleiben gleich)', async () => {
  const r = await page.evaluate(async () => {
    setLang('en');
    openModal('modal-kosten');
    document.getElementById('k-edit-id').value = '';
    document.getElementById('k-beschr').value = 'EN-Test';
    const b = document.getElementById('k-betrag'); b.value = '50'; b.dispatchEvent(new Event('input', { bubbles: true }));
    const st = document.getElementById('k-status'); st.selectedIndex = 1; st.dispatchEvent(new Event('change', { bubbles: true }));
    const shown = st.options[1].textContent;
    await saveKosten();
    const k = state.kosten.find(x => x.beschr === 'EN-Test');
    setLang('de');
    return { status: k && k.status, mwst: k && k.mwst, shown };
  });
  if (r.status !== 'Ausstehend') return `gespeichert als "${r.status}" (angezeigt "${r.shown}") statt "Ausstehend"`;
  if (r.mwst !== 20) return `MwSt ${r.mwst} statt 20`;
  return '';
});
await scenario('Angebot → Rechnung: Ausgabe landet in der Kategorie des Angebots', async () => {
  const r = await page.evaluate(async () => {
    const kat = state.budgetKat[2]?.name || state.budgetKat[1]?.name;   // bewusst NICHT die erste Kategorie
    if (!kat) return null;
    showPage('angebote');
    state.angebote = (state.angebote || []).concat({ id: 9400001, _updatedAt: 1, beschr: 'Angebot Elektroinstallation', anbieter: 'Elektro GmbH',
      kat, datum: '2026-10-01', gueltig: '', betrag: 15000, status: 'Angenommen', notiz: '' });
    renderAngebote();
    editAngebot(9400001);
    document.getElementById('ang-to-rechnung-btn').click();
    const shown = document.getElementById('k-kat').value;
    await saveKosten();
    await new Promise(r => setTimeout(r, 300));
    const k = state.kosten.find(x => x.beschr === 'Angebot Elektroinstallation');
    return { kat, shown, saved: k && k.kat };
  });
  if (!r) return 'zu wenige Budget-Kategorien (Test kaputt?)';
  if (r.shown !== r.kat) return `Fenster zeigt Kategorie „${r.shown}" statt „${r.kat}"`;
  return r.saved !== r.kat ? `Ausgabe gespeichert in „${r.saved}" statt „${r.kat}"` : '';
});
await scenario('Umgewandeltes Angebot bearbeiten → kein zweites Umwandeln (Budget nicht doppelt belastet)', async () => {
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const zahl = () => state.kosten.filter(k => k.beschr === 'Angebot Dachdecker').length;
    showPage('angebote');
    state.angebote = (state.angebote || []).concat({ id: 9400002, _updatedAt: 1, beschr: 'Angebot Dachdecker', anbieter: 'Dach GmbH',
      kat: state.budgetKat[0].name, datum: '2026-10-01', gueltig: '', betrag: 15000, status: 'Angenommen', notiz: '' });
    renderAngebote();
    editAngebot(9400002);
    document.getElementById('ang-to-rechnung-btn').click();
    await saveKosten(); await sleep(300);
    const nach1 = zahl();
    editAngebot(9400002);                                   // nur die Notiz aendern
    document.getElementById('ang-notiz').value = 'Termin im Mai';
    await saveAngebot(); await sleep(250);
    const a = state.angebote.find(x => x.id === 9400002);
    const { status, konvertiert } = a;                      // Stand direkt nach dem Bearbeiten
    const btn = [...document.querySelectorAll('#angebot-table button')].find(b => b.textContent.includes('💶') && b.getAttribute('onclick').includes('9400002'));
    btn.click(); await sleep(100);
    if (document.getElementById('modal-kosten').classList.contains('open')) { await saveKosten(); await sleep(300); }
    return { nach1, nach2: zahl(), status, konvertiert };
  });
  if (r.nach1 !== 1) return `erste Umwandlung ergab ${r.nach1} Ausgaben (Test kaputt?)`;
  if (r.nach2 !== 1) return `${r.nach2} Ausgaben „Angebot Dachdecker" – nach dem Bearbeiten konnte es nochmal umgewandelt werden (Status jetzt „${r.status}", konvertiert=${r.konvertiert})`;
  return r.konvertiert ? '' : `Bearbeiten hat „konvertiert" gelöscht (Status „${r.status}")`;
});
await scenario('KI-Angebot: deutscher Betrag („12.345,00", „15.000") wird richtig übernommen', async () => {
  let antwort = '';
  const ki = r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: antwort }] }) });
  await page.route('**/api/ki', ki);
  const falsch = [];
  try {
    for (const [roh, soll] of [['"12.345,00"', 12345], ['"15.000"', 15000], ['"€ 9.990,-"', 9990], ['12345.5', 12345.5]]) {
      antwort = `{"beschr":"KI-Angebot ${soll}","anbieter":"Firma","betrag":${roh},"datum":null,"gueltig":null,"notiz":""}`;
      const ist = await page.evaluate(async soll => {
        showPage('angebote');
        openModal('modal-angebot-ki');
        document.getElementById('ang-ki-text').value = 'Angebot Dacharbeiten';
        await scanAngKI();
        confirmAngKI();
        await saveAngebot();
        await new Promise(r => setTimeout(r, 250));
        const a = state.angebote.find(x => x.beschr === 'KI-Angebot ' + soll);
        return a ? a.betrag : 'nicht gespeichert';
      }, soll);
      if (ist !== soll) falsch.push(`${roh} → ${ist} € statt ${soll} €`);
    }
  } finally { await page.unroute('**/api/ki', ki); }
  return falsch.join(' · ');
});
await scenario('Angebote-Vergleich: zuletzt gelöschtes Angebot verschwindet sofort', async () => {
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    showPage('angebote');
    state.angebote = [{ id: 9400003, _updatedAt: 1, beschr: 'Fenster', anbieter: 'A-Fenster', kat: state.budgetKat[0].name,
      datum: '2026-10-01', gueltig: '', betrag: 5000, status: 'Ausstehend', notiz: '' }];
    renderAngebote();
    setAngView('vergleich', document.getElementById('ang-tab-vergleich'));
    const vorher = document.getElementById('ang-vergleich-view').textContent.includes('A-Fenster');
    document.querySelector('#ang-vergleich-view button.del').click(); await sleep(100);
    document.getElementById('ac-ok-btn').click(); await sleep(250);
    const nachher = document.getElementById('ang-vergleich-view').textContent.includes('A-Fenster');
    const n = state.angebote.length;
    setAngView('liste', document.getElementById('ang-tab-liste'));
    return { vorher, nachher, n };
  });
  if (!r.vorher || r.n !== 0) return `Ausgangslage falsch (sichtbar=${r.vorher}, ${r.n} Angebote) – Test kaputt?`;
  return r.nachher ? 'gelöschtes Angebot „A-Fenster" wird im Vergleich weiter angezeigt' : '';
});

await scenario('Zahlungsplan „✓ Bezahlt" ohne Anbieter markiert keine fremde Rechnung', async () => {
  const r = await page.evaluate(() => {
    const k1 = { id: 9400001, datum: '2026-10-01', beschr: 'Fenster Erdgeschoss', kat: state.budgetKat[0].name, mwst: 20, netto: 4166.67, betrag: 5000, status: 'Ausstehend', anbieter: 'Fensterbau Müller', _updatedAt: 1 };
    const k2 = { id: 9400002, datum: '2026-10-02', beschr: 'Abschlag 2 Rohbau', kat: state.budgetKat[1].name, mwst: 20, netto: 4166.67, betrag: 5000, status: 'Ausstehend', anbieter: 'Baumeister Huber', _updatedAt: 1 };
    state.kosten.push(k1, k2);
    state.zahlungen = state.zahlungen || [];
    state.zahlungen.push({ id: 9400003, beschr: 'Abschlag 2 Rohbau', kat: '', anbieter: '', faellig: '2026-10-20', betrag: 5000, status: 'Offen' });
    markZahlungBezahlt(9400003);
    return [k1.status, k2.status];
  });
  return r.includes('Bezahlt') ? `fremde Rechnung als bezahlt markiert (Status: ${r.join(', ')})` : '';
});
await scenario('Namen mit Anführungszeichen bleiben in „Bezahlt von" und im Kategorie-Picker vollständig', async () => {
  const r = await page.evaluate(async () => {
    state.zahlungspersonen.push({ id: 9400010, name: 'Kredit "Raiffeisen"' });
    refreshBezahltVonSelects();
    const vals = [...document.getElementById('k-bezahlt-von').options].map(o => o.value);
    state.budgetKat.push({ id: 9400011, name: 'Fenster "Premium"', budget: 1000, color: '#3d6ff8' });
    const p = _pickDateiKat();
    const btn = [...document.querySelectorAll('#datei-kat-list button')].find(b => b.textContent.includes('Premium'));
    btn && btn.click();
    const picked = await Promise.race([p, new Promise(res => setTimeout(() => res('(nichts gewählt)'), 800))]);
    return { person: vals.includes('Kredit "Raiffeisen"'), picked };
  });
  const p = [];
  if (!r.person) p.push('Person in „Bezahlt von" abgeschnitten');
  if (r.picked !== 'Fenster "Premium"') p.push(`Kategorie-Picker lieferte „${r.picked}"`);
  return p.join(' · ');
});

await scenario('Gescannte Rechnungen folgen der Ausgabe (Bearbeiten/Löschen) und bleiben gelöscht', async () => {
  const r = await page.evaluate(async () => {
    window.showConfirm = async () => true;
    const kat = state.budgetKat[0].name;
    state.kosten.push({ id: 9500001, datum: '2026-10-01', beschr: 'Fliesen Bad', kat, mwst: 20, netto: 100, betrag: 120, status: 'Bezahlt', anbieter: 'Fliesen Koch', aiScanned: true, _updatedAt: 1 });
    state.gescannteRechnungen = [{ id: 9500002, kostenId: 9500001, datum: '2026-10-01', beschr: 'Fliesen Bad', anbieter: 'Fliesen Koch', kat, mwst: 20, netto: 100, brutto: 120, status: 'Bezahlt' }];
    editKosten(9500001);
    const b = document.getElementById('k-betrag'); b.value = '150'; b.dispatchEvent(new Event('input', { bubbles: true }));
    await saveKosten();
    const nachEdit = (state.gescannteRechnungen.find(x => x.id === 9500002) || {}).brutto;
    await deleteKosten(9500001);
    const nachLoeschen = state.gescannteRechnungen.filter(x => x.kostenId === 9500001).length;
    const grab = !!(state._deletedIds || {})['9500002'];
    // eigenstaendig geloeschte gescannte Rechnung bekommt einen Grabstein
    state.gescannteRechnungen.push({ id: 9500003, kostenId: 0, datum: '2026-10-02', beschr: 'X', kat, mwst: 20, netto: 1, brutto: 1.2, status: 'Bezahlt' });
    await deleteGescannteRechnung(9500003);
    return { nachEdit, nachLoeschen, grab, grab2: !!(state._deletedIds || {})['9500003'] };
  });
  const p = [];
  if (r.nachEdit !== 150) p.push(`Kopie zeigt nach Bearbeiten ${r.nachEdit} statt 150`);
  if (r.nachLoeschen) p.push('Kopie bleibt nach Löschen der Ausgabe stehen');
  if (!r.grab || !r.grab2) p.push('kein Lösch-Marker (kommt aus der Cloud zurück)');
  return p.join(' · ');
});
await scenario('Gelöschte Aufgaben-Notiz und Dokumente bekommen einen Lösch-Marker', async () => {
  const r = await page.evaluate(async () => {
    window.showConfirm = async () => true;
    state.aufgaben.push({ id: 9500010, name: 'Notiz-Test', prio: 'Mittel', status: 'Offen', datum: '', notiz: 'bitte anrufen' });
    _syncTaskNotiz(state.aufgaben.find(t => t.id === 9500010));
    const note = state.notizen.find(n => n.__taskId === 9500010);
    await deleteTask(9500010);
    state.dateien = state.dateien || [];
    state.dateien.push({ id: 9500011, name: 'Plan.pdf', type: 'application/pdf', size: 1, kat: 'Bauplan', datum: '2026-10-01' });
    await deleteDokument(9500011);
    const del = state._deletedIds || {};
    return { note: !!(note && del[String(note.id)]), doc: !!del['9500011'] };
  });
  const p = [];
  if (!r.note) p.push('Aufgaben-Notiz ohne Lösch-Marker');
  if (!r.doc) p.push('Dokument ohne Lösch-Marker');
  return p.join(' · ');
});
await scenario('Gelöschter Helfer kommt beim Speichern eines alten Helfer-Tags nicht zurück', async () => {
  const r = await page.evaluate(async () => {
    window.showConfirm = async () => true;
    state.helfer = [{ id: 9500020, name: 'Onkel Fritz', tel: '', notiz: '' }];
    state.helfereinsaetze = [{ id: 9500021, datum: '2099-05-01', bedarf: 2, umfang: 'full', zugewiesen: ['Onkel Fritz'], stunden: {} }];
    await deleteHelferPerson(9500020);
    editEinsatz(9500021);
    addEinsatz();
    return state.helfer.some(h => h.name === 'Onkel Fritz');
  });
  return r ? 'gelöschter Helfer wieder in „Meine Helfer"' : '';
});
await scenario('Dokumente: Bilder werden als echte Bilddatei hochgeladen', async () => {
  const r = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 40; c.height = 30; c.getContext('2d').fillRect(0, 0, 40, 30);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const datei = new File([blob], 'plan.png', { type: 'image/png' });
    let hochgeladen = null;
    const altFrom = supa.storage.from;
    supa.storage.from = () => ({ upload: async (p, f) => { hochgeladen = f; return { error: null }; }, getPublicUrl: () => ({ data: {} }) });
    currentUser = { id: 'test-user' };
    try {
      const p = uploadDokument({ files: [datei], value: '' });
      await new Promise(res => setTimeout(res, 150));
      document.querySelector('#datei-kat-list button')?.click();
      await p;
    } finally { currentUser = null; supa.storage.from = altFrom; }
    const d = (state.dateien || []).slice(-1)[0] || {};
    return { istBlob: hochgeladen instanceof Blob, typ: hochgeladen && hochgeladen.type, size: d.size };
  });
  const p = [];
  if (!r.istBlob) p.push('hochgeladen wurde kein Bild, sondern ein Objekt');
  if (!(r.size > 0)) p.push(`gespeicherte Größe ungültig (${r.size})`);
  return p.join(' · ');
});

await scenario('Wartung: nächster Termin über die Sommerzeit hinweg stimmt (kein Tag zu früh)', async () => {
  const r = await page.evaluate(() => [getNextDate('2026-01-15', 3, 'Monate'), getNextDate('2026-03-25', 1, 'Wochen'), getNextDate('2026-10-20', 1, 'Wochen')]
    .map(d => d.toISOString().slice(0, 10)));
  const soll = ['2026-04-15', '2026-04-01', '2026-10-27'];
  return r.join() === soll.join() ? '' : `berechnet ${r.join(', ')} statt ${soll.join(', ')}`;
});
await scenario('Wartung: einmalige Wartung ist nach „Erledigt" nicht mehr überfällig', async () => {
  const r = await page.evaluate(() => {
    state.wartungen = [{ id: 9600001, name: 'Kaminkehrer Abnahme', kat: state.wartungen?.[0]?.kat || '🔥 Heizung', intervall: 0, einheit: '', next: '2026-01-05' }];
    showPage('wartung');
    const vorher = document.getElementById('w-overdue').textContent;
    markWartungDone(9600001);
    return { vorher, nachher: document.getElementById('w-overdue').textContent, text: document.querySelector('#wartung-list .wartung-next')?.textContent || '' };
  });
  if (r.vorher !== '1') return `Ausgangslage falsch (überfällig: ${r.vorher})`;
  return r.nachher !== '0' ? `bleibt überfällig (${r.nachher}): ${r.text.trim().slice(0, 60)}` : '';
});
await scenario('Budgetkategorie umbenennen: Ausgaben bleiben in der Kategorie', async () => {
  const r = await page.evaluate(() => {
    const kat = state.budgetKat[0];
    state.kosten.push({ id: 9600010, datum: '2026-10-01', beschr: 'Umbenenn-Test', kat: kat.name, mwst: 20, netto: 100, betrag: 120, status: 'Bezahlt', anbieter: '', _updatedAt: 1 });
    showPage('budget');
    document.getElementById('bk-edit-id').value = String(kat.id);
    document.getElementById('bk-name').value = kat.name + ' NEU';
    const b = document.getElementById('bk-budget'); if (b && !b.value) b.value = String(kat.budget || 1000);
    addBudgetKat();
    return { neu: kat.name + ' NEU', ist: state.kosten.find(k => k.id === 9600010).kat };
  });
  return r.ist === r.neu ? '' : `Ausgabe steht jetzt in „${r.ist}" statt „${r.neu}"`;
});

await scenario('Rechnungen: Filter springt nach Löschen der letzten Rechnung einer Kategorie auf „Alle"', async () => {
  const r = await page.evaluate(async () => {
    window.showConfirm = async () => true;
    const [a, b] = [state.budgetKat[0].name, state.budgetKat[1].name];
    state.gescannteRechnungen = [
      { id: 9700001, kostenId: 0, datum: '2026-10-01', beschr: 'A-Rechnung', anbieter: 'X', kat: a, mwst: 20, netto: 1, brutto: 1.2, status: 'Bezahlt' },
      { id: 9700002, kostenId: 0, datum: '2026-10-02', beschr: 'B-Rechnung', anbieter: 'Y', kat: b, mwst: 20, netto: 1, brutto: 1.2, status: 'Bezahlt' }];
    showPage('rechnungen');
    const sel = document.getElementById('gr-filter-kat'); sel.value = b; renderGescannteRechnungen();
    await deleteGescannteRechnung(9700002);
    const rows = [...document.querySelectorAll('#gr-table tr')].filter(tr => !tr.querySelector('td[colspan]')).length;
    return { rows, filter: sel.value };
  });
  return r.rows >= 1 ? '' : `Liste leer (Filter „${r.filter}") obwohl noch eine Rechnung existiert`;
});
await scenario('Fotos: Suche findet Fotos innerhalb von Alben', async () => {
  const r = await page.evaluate(() => {
    const px = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    state.fotoAlben = [{ id: 9700010, title: 'Rohbau Woche 1', kat: 'Rohbau', datum: '2026-09-01' }];
    state.fotos = [{ id: 9700011, albumId: 9700010, title: 'Schalung Bodenplatte', kat: 'Rohbau', url: px, data: px, datum: '2026-09-01' }];
    showPage('fotos'); setFotoView('alben', document.getElementById('foto-tab-alben'));
    document.getElementById('foto-search').value = 'Schalung'; renderFotos();
    const g = document.getElementById('photo-grid');
    return { leer: !!g.querySelector('.empty'), text: g.textContent.trim().slice(0, 60) };
  });
  return r.leer ? `keine Treffer angezeigt („${r.text}")` : '';
});
await scenario('Startseite: dringende offene Aufgaben stehen oben (nicht nur die 5 ältesten)', async () => {
  const r = await page.evaluate(() => {
    for (let i = 0; i < 6; i++) state.aufgaben.push({ id: 9700020 + i, name: 'Alt ' + i, prio: 'Mittel', status: 'Offen', datum: '' });
    state.aufgaben.push({ id: 9700030, name: 'Dringend neu', prio: 'Hoch', status: 'Offen', datum: '2026-10-20' });
    showPage('dashboard');
    return [...document.querySelectorAll('#dash-tasks tr')].map(tr => tr.textContent).join('|');
  });
  return r.includes('Dringend neu') ? '' : 'dringende neue Aufgabe fehlt auf der Startseite';
});
await scenario('Zeitplan: Bearbeiten über den Meilenstein-Dialog behält Abschnitt und Status', async () => {
  const r = await page.evaluate(() => {
    state.meilensteine.push({ id: 9700040, name: 'Estrich', ganttId: 777, status: 'arbeit', done: false, remind: false, datum: '2026-11-01', text: '' });
    editMilestone(9700040);
    addMilestone();
    const m = state.meilensteine.find(x => x.id === 9700040);
    state.meilensteine = state.meilensteine.filter(x => x !== m);   // Testpunkt wieder weg
    return { ganttId: m.ganttId, status: m.status, remind: m.remind };
  });
  return (r.ganttId === 777 && r.status === 'arbeit' && r.remind === false) ? '' : `Felder verloren: ${JSON.stringify(r)}`;
});

// Abbrechen beim Bearbeiten -> "+ Neu" darf den alten Eintrag NICHT ueberschreiben
for (const [modal, label, prep, editFn, fill, saveFn, arr, field] of [
  ['modal-tagebuch', 'Bautagebuch', "state.tagebuch.push({ id: 9800001, datum: '2026-09-01', title: 'Alt', text: '', weather: '☀️', temp: 10, tags: [], workers: [] })", 'editDiary(9800001)', "document.getElementById('tb-title').value = 'Neu'", 'addDiary()', 'tagebuch', 'title'],
  ['modal-notiz', 'Notiz', "state.notizen.push({ id: 9800002, title: 'Alt', text: 'x', color: 'white', datum: '2026-09-01' })", 'editNotiz(9800002)', "document.getElementById('n-title').value = 'Neu'", 'addNotiz()', 'notizen', 'title'],
  ['modal-kontakt', 'Kontakt', "state.kontakte.push({ id: 9800003, name: 'Alt', gewerk: 'Elektro', tel: '', mail: '', status: 'Aktiv', notiz: '' })", 'editKontakt(9800003)', "document.getElementById('c-name').value = 'Neu'", 'addKontakt()', 'kontakte', 'name'],
  ['modal-doku', 'Doku/Leitungen', "state.dokumentation = state.dokumentation || []; state.dokumentation.push({ id: 9800005, title: 'Alt', typ: 'Elektro', raum: '', text: '', hinweis: '', datum: '2026-09-01', tags: [], fotos: [] })", 'editDoku(9800005)', "document.getElementById('dk-title').value = 'Neu'", 'addDoku()', 'dokumentation', 'title'],
  ['modal-budget-kat', 'Budgetkategorie', "state.budgetKat.push({ id: 9800006, name: 'Alt', budget: 1000, color: '#3d6ff8' })", 'editBudgetKat(9800006)', "document.getElementById('bk-name').value = 'Neu'; document.getElementById('bk-budget').value = '500'", 'addBudgetKat()', 'budgetKat', 'name'],
  ['modal-mangel', 'Mangel', "state.maengel = state.maengel || []; state.maengel.push({ id: 9800004, titel: 'Alt', gewerk: 'Elektro', prio: 'Hoch', status: 'Offen', datum: '2026-09-01', fotos: [] })", 'editMangel(9800004)', "document.getElementById('mg-titel').value = 'Neu'", 'saveMangel()', 'maengel', 'titel'],
]) {
  await scenario(`${label}: Abbrechen beim Bearbeiten → „+ Neu" legt neuen Eintrag an (überschreibt nichts)`, async () => {
    const r = await page.evaluate(async ([modal, prep, editFn, fill, saveFn, arr, field]) => {
      eval(prep); eval(editFn);
      const cancel = [...document.querySelectorAll('#' + modal + ' .modal-actions button')].find(b => /abbrechen/i.test(b.textContent));
      cancel.click();
      await new Promise(res => setTimeout(res, 300));
      openModal(modal); eval(fill); await eval(saveFn);
      await new Promise(res => setTimeout(res, 250));
      const list = state[arr] || [];
      return { alt: list.filter(x => x[field] === 'Alt').length, neu: list.filter(x => x[field] === 'Neu').length };
    }, [modal, prep, editFn, fill, saveFn, arr, field]);
    return (r.alt === 1 && r.neu === 1) ? '' : `alter Eintrag ${r.alt}×, neuer ${r.neu}× (alter wurde überschrieben)`;
  });
}
await scenario('Projekt: Abbrechen beim Bearbeiten → „+ Neues Projekt" legt ein neues Projekt an', async () => {
  const r = await page.evaluate(async () => {
    const origId = currentProjectId;
    const alt = projects.find(p => String(p.id) === String(currentProjectId)).settings.name;
    const anzahl = projects.length;
    editProject(currentProjectId);
    const cancel = [...document.querySelectorAll('#modal-new-project .modal-actions button')].find(b => /abbrechen/i.test(b.textContent));
    cancel.click();
    await new Promise(res => setTimeout(res, 300));
    openModal('modal-new-project');
    document.getElementById('np-name').value = 'Ferienhaus';
    saveProject();
    await new Promise(res => setTimeout(res, 250));
    const erg = { alt, jetzt: (projects.find(p => p.settings.name === alt) || {}).id ? alt : '(weg)', mehr: projects.length - anzahl };
    loadProject(origId, false);   // fuer die folgenden Tests zurueck ins Demo-Projekt
    return erg;
  });
  return (r.jetzt === r.alt && r.mehr === 1) ? '' : `altes Projekt „${r.alt}" → ${r.jetzt}, neue Projekte: ${r.mehr}`;
});
await scenario('Bearbeiten ohne Änderung: „nicht im Budget", Kategorie, Brutto 99,99 €, leeres Aufgaben-Datum bleiben', async () => {
  const r = await page.evaluate(async () => {
    const kat2 = state.budgetKat[1].name;
    state.kosten.push({ id: 9800010, datum: '2026-09-01', beschr: 'Schlitze selbst gestemmt', kat: kat2, mwst: 0, netto: 450, betrag: 450, status: 'Bezahlt', anbieter: '', imBudget: false, _updatedAt: 1 });
    editKosten(9800010); await saveKosten();
    const el = state.kosten.find(k => k.id === 9800010);
    state.kosten.push({ id: 9800011, datum: '2026-10-01', beschr: 'Cent-Test', kat: state.budgetKat[0].name, mwst: 20, netto: 83.33, betrag: 99.99, status: 'Bezahlt', anbieter: '', _updatedAt: 1 });
    editKosten(9800011); await saveKosten();
    state.aufgaben.push({ id: 9800012, name: 'Ohne Termin', prio: 'Mittel', status: 'Offen', datum: '', notiz: '' });
    editTask(9800012); await saveTask();
    return { kat: el.kat, kat2, imBudget: el.imBudget, betrag: state.kosten.find(k => k.id === 9800011).betrag,
             datum: state.aufgaben.find(t => t.id === 9800012).datum };
  });
  const p = [];
  if (r.kat !== r.kat2) p.push(`Kategorie wurde „${r.kat}"`);
  if (r.imBudget !== false) p.push('„nicht im Budget" ging beim Speichern verloren');
  if (Math.abs(r.betrag - 99.99) > 0.001) p.push(`Betrag wurde ${r.betrag}`);
  if (r.datum) p.push(`Aufgabe bekam das Datum ${r.datum}`);
  return p.join(' · ');
});

// ── „Bezahlt von": neue Person direkt eintragen · Scan sofort sichtbar · PDF-Belege ──
// Scan-Fenster wie nach einer erfolgreichen KI-Auswertung fuellen (im Demo-Modus ohne KI)
const SCAN_FORM = `window.__scanForm = (beschr, brutto) => {
  openModal('modal-rechnung-scan');
  document.getElementById('scan-result').style.display = 'block';
  document.getElementById('scan-confirm-btn').style.display = 'inline-flex';
  document.getElementById('scan-beschr').value = beschr;
  document.getElementById('scan-brutto').value = String(brutto);
  document.getElementById('scan-netto').value = (brutto / 1.2).toFixed(2);
  document.getElementById('scan-datum').value = '2026-10-10';
  document.getElementById('scan-anbieter').value = 'Fa. Test';
};
window.__neuePerson = (selId, name) => {
  const sel = document.getElementById(selId);
  sel.value = '__neu__'; sel.dispatchEvent(new Event('change'));
  const inp = document.getElementById(selId + '-neu');
  if (!inp || sel.value !== '__neu__') return false;
  inp.value = name; return inp.style.display !== 'none';
};
window.__warte = ms => new Promise(res => setTimeout(res, ms));`;
await page.evaluate(SCAN_FORM);

await scenario('Scan: neue Person bei „Bezahlt von" eintragen → wird überall wie die anderen geführt', async () => {
  const r = await page.evaluate(async () => {
    __scanForm('Scan Oma', 240);
    if (!__neuePerson('scan-bezahlt-von', '  Oma   Erna ')) return { fehlt: true };
    await confirmRechnungScan();
    await __warte(250);
    const k = state.kosten.find(x => x.beschr === 'Scan Oma');
    const g = (state.gescannteRechnungen || []).find(x => String(x.kostenId) === String(k && k.id));
    const pe = state.zahlungspersonen.filter(p => p.name === 'Oma Erna');
    const hat = id => [...document.getElementById(id).options].some(o => o.value === 'Oma Erna');
    renderKostenaufteilung();
    return { bv: k && k.bezahltVon, anzahl: pe.length, k: hat('k-bezahlt-von'), s: hat('scan-bezahlt-von'),
             liste: document.getElementById('personen-list').textContent.includes('Oma Erna'),
             aufteilung: document.getElementById('kostenaufteilung-content').textContent.includes('Oma Erna'),
             ids: new Set([k && k.id, g && g.id, pe[0] && pe[0].id]).size };
  });
  if (r.fehlt) return 'im Scan-Fenster lässt sich keine neue Person eintragen';
  const p = [];
  if (r.bv !== 'Oma Erna') p.push(`Ausgabe „Bezahlt von" = „${r.bv}"`);
  if (r.anzahl !== 1) p.push(`Person ${r.anzahl}× angelegt`);
  if (!r.k || !r.s) p.push(`fehlt in Auswahl (Ausgabe ${r.k}, Scan ${r.s})`);
  if (!r.liste) p.push('fehlt in den Einstellungen (Zahlungspersonen)');
  if (!r.aufteilung) p.push('fehlt in der Kostenaufteilung');
  if (r.ids !== 3) p.push('Person/Ausgabe/Rechnung mit gleicher ID');
  return p.join(' · ');
});
await scenario('Ausgabe: neue Person eintragen – „kredit" landet bei „Kredit", keine Doppelten', async () => {
  const r = await page.evaluate(async () => {
    const neu = async (beschr, name) => {
      openModal('modal-kosten');
      document.getElementById('k-beschr').value = beschr;
      document.getElementById('k-betrag').value = '120';
      const ok = __neuePerson('k-bezahlt-von', name);
      await saveKosten(); await __warte(300);
      return ok ? (state.kosten.find(k => k.beschr === beschr) || {}).bezahltVon : null;
    };
    const a = await neu('Rate klein', 'kredit');
    const b = await neu('Papa 1', 'Papa Franz');
    const c = await neu('Papa 2', 'papa franz');
    const n = name => state.zahlungspersonen.filter(p => p.name.toLowerCase() === name).length;
    return { a, b, c, kredit: n('kredit'), papa: n('papa franz') };
  });
  if (r.a === null) return 'im Ausgabe-Fenster lässt sich keine neue Person eintragen';
  const p = [];
  if (r.a !== 'Kredit' || r.kredit !== 1) p.push(`„kredit" → „${r.a}", Kredit ${r.kredit}×`);
  if (r.b !== 'Papa Franz' || r.c !== 'Papa Franz' || r.papa !== 1) p.push(`Papa Franz: „${r.b}"/„${r.c}", ${r.papa}× angelegt`);
  return p.join(' · ');
});
await scenario('„Bezahlt von": Status „Ausstehend" und Abbrechen setzen das Feld zurück, nichts bleibt ausgegraut', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    const sel = document.getElementById('k-bezahlt-von'), inp = document.getElementById('k-bezahlt-von-neu');
    if (!inp) return { fehlt: true };
    // Ausstehend: Feld gesperrt/leer, keine Person angelegt
    openModal('modal-kosten');
    document.getElementById('k-beschr').value = 'Noch offen';
    document.getElementById('k-betrag').value = '50';
    __neuePerson('k-bezahlt-von', 'Niemand');
    const st = document.getElementById('k-status'); st.value = 'Ausstehend'; st.dispatchEvent(new Event('change'));
    out.ausstehendVersteckt = inp.style.display === 'none' && sel.value === '';
    await saveKosten(); await __warte(300);
    out.bv = (state.kosten.find(k => k.beschr === 'Noch offen') || {}).bezahltVon;
    out.niemand = state.zahlungspersonen.some(p => p.name === 'Niemand');
    // danach eine bezahlte Ausgabe bearbeiten: Feld darf nicht ausgegraut sein
    const bezahlt = state.kosten.find(k => k.status === 'Bezahlt');
    editKosten(bezahlt.id);
    out.gesperrt = sel.disabled;
    document.querySelector('#modal-kosten .modal-actions .btn-ghost').click(); await __warte(300);
    // Abbrechen mit offenem Namensfeld (Ausgabe + Scan)
    for (const [modal, id] of [['modal-kosten', 'k-bezahlt-von'], ['modal-rechnung-scan', 'scan-bezahlt-von']]) {
      if (modal === 'modal-rechnung-scan') __scanForm('Abbruch', 10); else openModal(modal);
      __neuePerson(id, 'Abbruch');
      [...document.querySelectorAll('#' + modal + ' .modal-actions button')].find(b => /abbrechen/i.test(b.textContent)).click();
      await __warte(300);
      openModal(modal);
      const i = document.getElementById(id + '-neu');
      out[id] = i.style.display === 'none' && i.value === '' && document.getElementById(id).value === '';
      [...document.querySelectorAll('#' + modal + ' .modal-actions button')].find(b => /abbrechen/i.test(b.textContent)).click();
      await __warte(300);
    }
    return out;
  });
  if (r.fehlt) return 'kein Feld für eine neue Person';
  const p = [];
  if (!r.ausstehendVersteckt) p.push('bei „Ausstehend" bleibt das Namensfeld offen');
  if (r.bv !== '' || r.niemand) p.push(`„Ausstehend" speicherte „Bezahlt von" = „${r.bv}"${r.niemand ? ' und legte die Person an' : ''}`);
  if (r.gesperrt) p.push('„Bezahlt von" nach einer ausstehenden Ausgabe beim Bearbeiten ausgegraut');
  if (!r['k-bezahlt-von']) p.push('Ausgabe-Fenster: nach Abbrechen steht das Namensfeld noch');
  if (!r['scan-bezahlt-von']) p.push('Scan-Fenster: nach Abbrechen steht das Namensfeld noch');
  return p.join(' · ');
});
await scenario('Bearbeiten: „Bezahlt von" mit Namen außerhalb der Liste bleibt erhalten', async () => {
  const r = await page.evaluate(async () => {
    state.kosten.push({ id: 9820001, datum: '2026-10-02', beschr: 'Sepp zahlt', kat: state.budgetKat[0].name, mwst: 20, netto: 100, betrag: 120,
      status: 'Bezahlt', bezahltVon: 'Onkel Sepp', anbieter: '', _updatedAt: 1 });
    editKosten(9820001);
    const angezeigt = document.getElementById('k-bezahlt-von').value;
    await saveKosten(); await __warte(300);
    return { angezeigt, gespeichert: state.kosten.find(k => k.id === 9820001).bezahltVon };
  });
  return (r.angezeigt === 'Onkel Sepp' && r.gespeichert === 'Onkel Sepp') ? '' : `angezeigt „${r.angezeigt}", gespeichert „${r.gespeichert}"`;
});
await scenario('Scan einbuchen: Rechnungen-Liste und Startseite zeigen den Betrag sofort', async () => {
  const r = await page.evaluate(async () => {
    showPage('rechnungen');
    __scanForm('Sofort in Liste', 360);
    await confirmRechnungScan();
    const liste = document.getElementById('gr-table').textContent.includes('Sofort in Liste');
    showPage('dashboard');
    const vorher = document.getElementById('d-spent').textContent;
    __scanForm('Sofort Startseite', 1000);
    await confirmRechnungScan();
    return { liste, vorher, nachher: document.getElementById('d-spent').textContent,
             neueste: document.getElementById('dash-recent-costs').textContent.includes('Sofort Startseite') };
  });
  const p = [];
  if (!r.liste) p.push('Rechnungen-Liste zeigt die neue Rechnung erst nach Seitenwechsel');
  if (r.vorher === r.nachher) p.push(`Startseite „Ausgegeben" bleibt bei ${r.vorher}`);
  if (!r.neueste) p.push('Startseite „Letzte Ausgaben" ohne die neue Rechnung');
  return p.join(' · ');
});
await scenario('PDF-Beleg: wird nicht als kaputtes Bild gezeigt und öffnet als PDF', async () => {
  const r = await page.evaluate(async () => {
    const pdf = 'data:application/pdf;base64,JVBERi0xLjQK';
    state.kosten.push({ id: 9820002, datum: '2026-10-03', beschr: 'PDF Beleg', kat: state.budgetKat[0].name, mwst: 20, netto: 100, betrag: 120,
      status: 'Bezahlt', anbieter: '', aiScanned: true, scanData: pdf, _updatedAt: 1 });
    state.gescannteRechnungen.push({ id: 9820003, kostenId: 9820002, datum: '2026-10-03', beschr: 'PDF Beleg', anbieter: '', kat: state.budgetKat[0].name,
      mwst: 20, netto: 100, brutto: 120, status: 'Bezahlt', scanData: pdf, gescannt: '2026-10-03' });
    renderKosten(); renderGescannteRechnungen();
    const kaputt = [...document.querySelectorAll('img')].filter(i => (i.getAttribute('src') || '').startsWith('data:application/pdf')).length;
    let geoeffnet = '';
    const orig = window.open; window.open = u => { geoeffnet = String(u); return null; };
    document.getElementById('lightbox').classList.remove('open');
    try { openKostenBeleg(9820002); } finally { window.open = orig; }
    const lightbox = document.getElementById('lightbox').classList.contains('open');
    document.getElementById('lightbox').classList.remove('open');
    // gescannte PDF-Rechnung (Demo, ohne Upload) behaelt ihren Typ
    __scanForm('Scan PDF', 120);
    scanImageBase64 = 'JVBERi0xLjQK'; scanMediaType = 'application/pdf';
    await confirmRechnungScan();
    const neu = state.kosten.find(k => k.beschr === 'Scan PDF');
    return { kaputt, geoeffnet, lightbox, typ: ((neu && neu.scanData) || '').slice(0, 20) };
  });
  const p = [];
  if (r.kaputt) p.push(`${r.kaputt}× PDF als Bild eingebunden`);
  if (!r.geoeffnet || r.lightbox) p.push('PDF öffnet in der Bild-Ansicht statt als PDF');
  if (r.typ !== 'data:application/pdf') p.push(`gescanntes PDF gespeichert als „${r.typ}…"`);
  return p.join(' · ');
});
await scenario('Englisch: „Neue Person" und Namensfeld sind übersetzt', async () => {
  const r = await page.evaluate(async () => {
    setLang('en', false);
    openModal('modal-kosten'); await __warte(50);
    const opt = [...document.getElementById('k-bezahlt-von').options].find(o => o.value === '__neu__');
    const out = { opt: opt && opt.textContent, ph: (document.getElementById('k-bezahlt-von-neu') || {}).placeholder };
    document.querySelector('#modal-kosten .modal-actions .btn-ghost').click(); await __warte(300);
    setLang('de', false);
    const opt2 = [...document.getElementById('k-bezahlt-von').options].find(o => o.value === '__neu__');
    out.de = opt2 && opt2.textContent;
    return out;
  });
  const p = [];
  if (r.opt !== '➕ New person…') p.push(`Option „${r.opt}"`);
  if (r.ph !== 'Name of the new person') p.push(`Platzhalter „${r.ph}"`);
  if (r.de !== '➕ Neue Person…') p.push(`zurück auf Deutsch: „${r.de}"`);
  return p.join(' · ');
});

// ── ☰ bei offenem Fenster · Bautagebuch-Buch · PDF teilen ──
await scenario('☰ bei offenem Fenster: schließt es (mit Rückfrage, wenn etwas eingetippt wurde)', async () => {
  const p = [];
  await page.evaluate(() => { window.showConfirm = window.__echtesConfirm; closeMobileSidebar(); showPage('kosten'); openModal('modal-kosten'); });
  await page.fill('#k-beschr', 'Getippt und verworfen');
  // Im Demo-Modus lag das Banner ueber ☰ (Demo-Besucher kamen am Handy nicht ins Menue)
  try { await page.click('#mobile-topbar button', { timeout: 3000 }); }
  catch (e) { return '☰ ist verdeckt und lässt sich nicht antippen'; }
  await page.waitForTimeout(350);
  let r = await page.evaluate(() => ({ frage: document.getElementById('modal-app-confirm').classList.contains('open'),
    menue: document.querySelector('.sidebar').classList.contains('mobile-open') }));
  if (!r.frage) p.push('keine Rückfrage trotz Eingabe');
  if (r.menue) p.push('Menü öffnete sich trotz offener Rückfrage');
  if (r.frage) {
    await page.click('#modal-app-confirm .modal-actions .btn-ghost');   // "Abbrechen" in der Rueckfrage
    await page.waitForTimeout(350);
    r = await page.evaluate(() => ({ fenster: document.getElementById('modal-kosten').classList.contains('open'),
      wert: document.getElementById('k-beschr').value, menue: document.querySelector('.sidebar').classList.contains('mobile-open') }));
    if (!r.fenster || r.wert !== 'Getippt und verworfen' || r.menue) p.push('„Abbrechen" in der Rückfrage: Fenster/Eingabe nicht erhalten');
    await page.click('#mobile-topbar button');
    await page.waitForTimeout(350);
    await page.click('#ac-ok-btn');   // "Verwerfen"
    await page.waitForTimeout(400);
    r = await page.evaluate(() => ({ fenster: document.getElementById('modal-kosten').classList.contains('open'),
      menue: document.querySelector('.sidebar').classList.contains('mobile-open'),
      gespeichert: state.kosten.some(k => k.beschr === 'Getippt und verworfen') }));
    if (r.fenster) p.push('nach „Verwerfen" bleibt das Fenster offen');
    if (!r.menue) p.push('nach „Verwerfen" öffnet sich das Menü nicht');
    if (r.gespeichert) p.push('verworfene Eingabe wurde gespeichert');
  }
  // ohne Eingabe: sofort schliessen
  await page.evaluate(() => { closeMobileSidebar(); openModal('modal-kosten'); });
  await page.waitForTimeout(100);
  await page.click('#mobile-topbar button');
  await page.waitForTimeout(350);
  r = await page.evaluate(() => ({ frage: document.getElementById('modal-app-confirm').classList.contains('open'),
    fenster: document.getElementById('modal-kosten').classList.contains('open'), menue: document.querySelector('.sidebar').classList.contains('mobile-open') }));
  if (r.frage || r.fenster || !r.menue) p.push(`ohne Eingabe: Rückfrage ${r.frage}, Fenster offen ${r.fenster}, Menü ${r.menue}`);
  await page.evaluate(() => closeMobileSidebar());
  return p.join(' · ');
});

const BUCH_STAND = `window.__buchStand = (bild) => {
  window.__buchBak = { tb: state.tagebuch, f: state.fotos, a: state.fotoAlben, h: state.helfereinsaetze };
  state.tagebuch = [
    { id: 1, datum: '2026-03-14', title: 'Bodenplatte 🎉', text: 'Beton gegossen, alles trocken geblieben.', weather: '☀️ Sonnig', temp: 12,
      workers: [{ name: 'Papa', hours: 8 }, { name: 'onkel sepp', hours: 4 }] },
    { id: 2, datum: '2026-03-02', datumBis: '2026-03-04', title: 'Aushub', text: '', workers: [] },
    { id: 3, datum: '2026-05-01', title: 'Dachstuhl', text: 'Zimmerer war da.', workers: [{ name: 'Papa', hours: 2 }] },
  ];
  state.fotoAlben = [{ id: 50, title: 'Garten', datum: '2026-04-10' }];
  state.fotos = [
    { id: 11, datum: '2026-03-03', url: bild('#8899aa', 800, 600), title: 'IMG_1234' },
    { id: 12, datum: '2026-03-14', url: bild('#aa8866', 600, 800), title: 'Platte fertig' },
    { id: 15, datum: '2026-03-14', url: bild('#66aa88', 800, 600), title: '' },
    { id: 13, albumId: 50, url: bild('#88aa66', 800, 600), title: 'Rasen' },
    { id: 14, datum: '2025-12-01', url: bild('#aa6688', 800, 600), title: 'Grundstück' },
  ];
  state.helfereinsaetze = [{ id: 70, datum: '2026-03-14', zugewiesen: ['Onkel Sepp', 'Tante Mia'] }];
};
window.__buchZurueck = () => { const b = window.__buchBak; state.tagebuch = b.tb; state.fotos = b.f; state.fotoAlben = b.a; state.helfereinsaetze = b.h; };
window.__bild = (farbe, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = farbe; g.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8); };`;
await page.evaluate(BUCH_STAND);

await scenario('Buch: Inhalte stimmen (Reihenfolge, Fotos je Tag, Namen ohne Stunden, Zeitraum)', async () => {
  const r = await page.evaluate(() => {
    if (typeof _baubuchDaten !== 'function') return { fehlt: true };
    __buchStand(__bild);
    try {
      const d = _baubuchDaten({});
      const d2 = _baubuchDaten({ von: '2026-03-10', bis: '2026-04-30' });
      const maerz = d.kapitel.find(k => k.monat === '2026-03');
      return {
        monate: d.kapitel.map(k => k.monat), maerz: maerz ? maerz.eintraege.map(e => e.titel) : [],
        aushubFotos: (maerz?.eintraege.find(e => e.titel === 'Aushub')?.fotos || []).map(f => f.id + ':' + f.titel),
        plattenFotos: (maerz?.eintraege.find(e => /Bodenplatte/.test(e.titel))?.fotos || []).length,
        namen: maerz?.eintraege.find(e => /Bodenplatte/.test(e.titel))?.namen || [],
        wetter: maerz?.eintraege.find(e => /Bodenplatte/.test(e.titel))?.wetter,
        april: (d.kapitel.find(k => k.monat === '2026-04')?.eintraege || []).map(e => e.typ + ':' + e.titel + ':' + e.fotos.length),
        alleNamen: d.namen, stunden: /hours|\b\d+\s?h\b/.test(JSON.stringify(d)),
        zeitraum: d2.kapitel.map(k => k.monat + '=' + k.eintraege.map(e => e.titel).join('+')),
        anzahl: d.anzahl, titelbild: !!d.titelbild,
      };
    } finally { __buchZurueck(); }
  });
  if (r.fehlt) return 'Buch-Funktion fehlt';
  const p = [];
  if (r.monate.join() !== '2025-12,2026-03,2026-04,2026-05') p.push('Kapitel: ' + r.monate.join(', '));
  if (r.maerz.join('|') !== 'Aushub|Bodenplatte 🎉') p.push('März-Reihenfolge: ' + r.maerz.join(' | '));
  if (r.aushubFotos.join() !== '11:') p.push('Foto im Datumsbereich falsch zugeordnet/Dateiname als Titel: ' + r.aushubFotos.join());
  if (r.plattenFotos !== 2) p.push(`Bodenplatte hat ${r.plattenFotos} Fotos`);
  if (r.namen.join() !== 'Papa,onkel sepp,Tante Mia') p.push('Namen: ' + r.namen.join(', '));
  if (r.wetter !== 'Sonnig, 12 °C') p.push('Wetter: ' + r.wetter);
  if (r.april.join() !== 'bilder:Garten:1') p.push('Fotos ohne Eintrag: ' + r.april.join());
  if (r.stunden) p.push('Stunden stehen im Buch');
  if (r.zeitraum.join(' ; ') !== '2026-03=Bodenplatte 🎉 ; 2026-04=Garten') p.push('Zeitraum-Filter: ' + r.zeitraum.join(' ; '));
  if (r.anzahl.fotos !== 5 || r.anzahl.tage !== 3 || !r.titelbild) p.push('Überblick: ' + JSON.stringify(r.anzahl));
  return p.join(' · ');
});
await scenario('Buch: Fotobuch- und A4-PDF werden erstellt (richtige Größe, Text ohne Emojis)', async () => {
  if (!JSPDF) return '';   // jsPDF nicht installiert – uebersprungen
  const r = await page.evaluate(async () => {
    if (typeof _baubuchPDF !== 'function') return { fehlt: true };
    for (let i = 0; i < 50 && !window.jspdf; i++) await new Promise(res => setTimeout(res, 100));
    if (!window.jspdf) return { keinPdf: true };
    __buchStand(__bild);
    try {
      const d = _baubuchDaten({ titel: 'Haus Müller' });
      const fb = await _baubuchPDF(d, { format: 'fotobuch', komprimieren: false });
      const a4 = await _baubuchPDF(d, { format: 'a4', komprimieren: false });
      const roh = fb.doc.output();
      const g = x => [Math.round(x.doc.internal.pageSize.getWidth()), Math.round(x.doc.internal.pageSize.getHeight())].join('x');
      return { fb: g(fb), a4: g(a4), seitenFb: fb.seiten, seitenA4: a4.seiten, fehler: fb.fehler + a4.fehler,
        titel: roh.includes('(Bodenplatte)') || roh.includes('Bodenplatte'), dach: roh.includes('Dachstuhl'),
        namen: roh.includes('Tante Mia'), stunden: /\(8h\)|8 h\b/.test(roh), bilder: (roh.match(/\/Subtype \/Image/g) || []).length,
        emoji: /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(roh) };
    } finally { __buchZurueck(); }
  });
  if (r.fehlt) return 'Buch-PDF-Funktion fehlt';
  if (r.keinPdf) return 'jsPDF wurde nicht geladen';
  const p = [];
  if (r.fb !== '216x216') p.push('Fotobuch-Größe ' + r.fb);
  if (r.a4 !== '210x297') p.push('A4-Größe ' + r.a4);
  if (r.seitenFb % 2 || r.seitenA4 % 2) p.push(`ungerade Seitenzahl (${r.seitenFb}/${r.seitenA4})`);
  if (r.fehler) p.push(`${r.fehler} Fotos nicht geladen`);
  if (!r.titel || !r.dach || !r.namen) p.push('Text fehlt im PDF');
  if (r.stunden) p.push('Stunden im PDF');
  if (r.bilder < 6) p.push(`nur ${r.bilder} Bilder im PDF`);
  if (r.emoji) p.push('Emojis im PDF (Zeichensalat)');
  return p.join(' · ');
});
await scenario('PDF ausgeben: iPhone-App teilt über das Teilen-Menü, sonst Download', async () => {
  if (!JSPDF) return '';
  const r = await page.evaluate(async () => {
    if (typeof _pdfAusgeben !== 'function') return { fehlt: true };
    for (let i = 0; i < 50 && !window.jspdf; i++) await new Promise(res => setTimeout(res, 100));
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(); doc.text('Hallo', 10, 10);
    const aufrufe = [];
    const altCap = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Filesystem: { writeFile: async o => { aufrufe.push('write:' + o.path + ':' + o.directory + ':' + o.data.slice(0, 7)); return { uri: 'file:///cache/' + o.path }; },
                    appendFile: async () => { aufrufe.push('append'); } },
      Share: { share: async o => { aufrufe.push('share:' + o.url); } } } };
    let ok1;
    try { ok1 = await _pdfAusgeben(doc, 'Test.pdf', 'Test'); } finally { window.Capacitor = altCap; }
    let gespeichert = '';
    doc.save = n => { gespeichert = n; };
    const ok2 = await _pdfAusgeben(doc, 'Download.pdf', 'Download');
    return { ok1, aufrufe, ok2, gespeichert };
  });
  if (r.fehlt) return 'Teilen-Funktion fehlt';
  const p = [];
  if (!r.ok1 || r.aufrufe[0] !== 'write:Test.pdf:CACHE:JVBERi0' || r.aufrufe[r.aufrufe.length - 1] !== 'share:file:///cache/Test.pdf') p.push('App: ' + r.aufrufe.join(' → '));
  if (!r.ok2 || r.gespeichert !== 'Download.pdf') p.push('Browser: kein Download');
  return p.join(' · ');
});
await scenario('Englisch: Buch-Fenster übersetzt', async () => {
  const r = await page.evaluate(async () => {
    setLang('en', false);
    openModal('modal-baubuch'); await __warte(60);
    const out = { h: document.querySelector('#modal-baubuch h3').textContent.trim(),
      opt: [...document.getElementById('bb-format').options].map(o => o.textContent.trim() + '=' + o.value).join('|') };
    closeModal('modal-baubuch'); await __warte(300);
    setLang('de', false);
    return out;
  });
  const p = [];
  if (r.h !== '📖 Create book') p.push('Titel „' + r.h + '"');
  if (r.opt !== 'Photo book (21 × 21 cm, with bleed)=fotobuch|A4 for printing=a4') p.push('Format: ' + r.opt);
  return p.join(' · ');
});

await scenario('iPad/Handy quer: offenes Fenster liegt über der Seitenleiste (kein Seitenwechsel darunter)', async () => {
  await page.setViewportSize({ width: 820, height: 1180 });
  try {
    await page.waitForTimeout(150);
    const r = await page.evaluate(async () => {
      openModal('modal-kosten'); await __warte(250);
      const nav = [...document.querySelectorAll('.sidebar .nav-item')].find(n => n.offsetParent && n.getBoundingClientRect().width > 0);
      if (!nav) return { keinNav: true };
      const b = nav.getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      const getroffen = el && el.closest('.nav-item') ? 'Menüpunkt' : (el && el.closest('.modal-overlay') ? 'Fenster' : (el && el.tagName));
      closeModal('modal-kosten'); await __warte(250);
      return { getroffen };
    });
    if (r.keinNav) return 'keine Seitenleiste sichtbar (Test-Annahme)';
    return r.getroffen === 'Fenster' ? '' : `Tippen auf die Seitenleiste trifft „${r.getroffen}" – Fenster bliebe über der neuen Seite`;
  } finally { await page.setViewportSize({ width: 390, height: 844 }); }
});
await scenario('iPhone-Fotoauswahl im Fenster zählt als Eingabe (☰ fragt vor dem Verwerfen)', async () => {
  const r = await page.evaluate(async () => {
    const alt = _nativePickImageFiles;
    _nativePickImageFiles = async () => [new File([new Uint8Array([255, 216, 255])], 'mangel.jpg', { type: 'image/jpeg' })];
    try {
      openModal('modal-mangel'); await __warte(50);
      let erhalten = 0;
      await pickPhotosOrFile('mg-photo-input', inp => { erhalten = inp.files.length; });
      return { erhalten, dirty: !!document.getElementById('modal-mangel')._dirty };
    } finally { _nativePickImageFiles = alt; closeModal('modal-mangel'); await __warte(250); }
  });
  return r.dirty ? '' : `Foto übernommen (${r.erhalten}), aber nicht als Eingabe gemerkt – ☰ würde es ohne Rückfrage verwerfen`;
});
await scenario('Buch: langer Text über Seitenumbruch, viele Namen, Sonderzeichen, Dateiname', async () => {
  if (!JSPDF) return '';
  const r = await page.evaluate(async () => {
    for (let i = 0; i < 50 && !window.jspdf; i++) await new Promise(res => setTimeout(res, 100));
    if (!window.jspdf || typeof _baubuchPDF !== 'function') return { fehlt: true };
    const lang = Array.from({ length: 700 }, (_, i) => `Satz${i} wurde betoniert.`).join(" ");
    const namen = Array.from({ length: 43 }, (_, i) => 'Helfer' + String(i).padStart(2, '0'));
    const bak = { tb: state.tagebuch, f: state.fotos, a: state.fotoAlben, h: state.helfereinsaetze };
    state.tagebuch = [{ id: 1, datum: '2026-06-01', title: 'Kurzer Tag', text: 'Kurz.', workers: [] },
                      { id: 2, datum: '2026-06-02', title: 'Langer Tag', text: lang, workers: [{ name: 'Željko Šimić', hours: 3 }, { name: 'Kovačević', hours: 2 }] },
                      { id: 3, datum: '2026-06-03', title: 'Viele Helfer', text: '', workers: namen.map(n => ({ name: n, hours: 1 })) }];
    state.fotos = []; state.fotoAlben = []; state.helfereinsaetze = [];
    try {
      const erg = await _baubuchPDF(_baubuchDaten({ titel: 'Test' }), { format: 'fotobuch', komprimieren: false });
      const roh = erg.doc.output();
      const groessen = [...roh.matchAll(/BT\s*\/F\d+ ([\d.]+) Tf((?:(?!\bET\b)[\s\S])*?)\(([^)]*Satz\d+[^)]*)\) Tj/g)].map(m => m[1]);   // je Textblock
      return { groessen: [...new Set(groessen)], anzahlSatz: groessen.length,
        // jeder Name steht im Tag („Mit dabei") UND auf der Dankesseite
        fehlendeNamen: namen.filter(n => roh.split('(' + n).length - 1 + roh.split(' ' + n).length - 1 < 2).length,
        kovacevic: roh.includes('Kovacevic'), utf16: /FEFF|\\376\\377/.test(roh),
        datei: _pdfDateiname('Rechnungen-Ausgaben_' + 'Einfamilienhaus Musterhausen Zubau und Sanierung Familie Huber und noch mehr') };
    } finally { state.tagebuch = bak.tb; state.fotos = bak.f; state.fotoAlben = bak.a; state.helfereinsaetze = bak.h; }
  });
  if (r.fehlt) return 'Buch-Funktion fehlt';
  const p = [];
  if (r.groessen.length !== 1 || r.groessen[0] !== '10.5') p.push('Text nach Seitenumbruch in anderer Schrift: ' + r.groessen.join('/'));
  if (r.anzahlSatz < 10) p.push('Test-Annahme: zu wenig Textzeilen gefunden');
  if (r.fehlendeNamen) p.push(`${r.fehlendeNamen} Namen fehlen auf der Dankesseite`);
  if (!r.kovacevic) p.push('Sonderzeichen-Namen verstümmelt');
  if (r.utf16) p.push('Text als UTF-16-Zeichensalat');
  if (!/\.pdf$/.test(r.datei)) p.push('Dateiname ohne .pdf: ' + r.datei);
  return p.join(' · ');
});
await scenario('PDF teilen scheitert in der App → ehrliche Meldung statt „gespeichert"', async () => {
  if (!JSPDF) return '';
  const r = await page.evaluate(async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(); doc.text('x', 10, 10);
    let gespeichert = false; doc.save = () => { gespeichert = true; };
    const altCap = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Filesystem: { writeFile: async o => ({ uri: 'file:///c/' + o.path }), appendFile: async () => {} },
      Share: { share: async () => { throw new Error('Error sharing item'); } } } };
    try { return { ok: await _pdfAusgeben(doc, 'X.pdf', 'X'), gespeichert }; }
    finally { window.Capacitor = altCap; }
  });
  const p = [];
  if (r.ok) p.push('meldet Erfolg');
  if (r.gespeichert) p.push('versucht Download, der in der App nicht funktioniert');
  return p.join(' · ');
});

await scenario('Tippen neben ein Fenster mit Eingaben: erst Rückfrage, dann schließen', async () => {
  await page.evaluate(() => { window.showConfirm = window.__echtesConfirm; openModal('modal-notiz'); });
  await page.waitForTimeout(100);
  const feld = await page.evaluate(() => { const f = document.querySelector('#modal-notiz input[type="text"], #modal-notiz textarea'); return f ? '#' + f.id : ''; });
  if (!feld) return 'kein Eingabefeld im Notiz-Fenster (Test-Annahme)';
  await page.fill(feld, 'Wichtige Notiz');
  await page.evaluate(() => document.getElementById('modal-notiz').click());   // Tipp auf den Hintergrund
  await page.waitForTimeout(350);
  let r = await page.evaluate(() => ({ frage: document.getElementById('modal-app-confirm').classList.contains('open'), offen: document.getElementById('modal-notiz').classList.contains('open') }));
  const p = [];
  if (!r.frage) p.push('keine Rückfrage – Eingabe wäre weg');
  if (r.frage) {
    await page.click('#modal-app-confirm .modal-actions .btn-ghost');
    await page.waitForTimeout(350);
    r = await page.evaluate(sel => ({ offen: document.getElementById('modal-notiz').classList.contains('open'), wert: document.querySelector(sel).value }), feld);
    if (!r.offen || r.wert !== 'Wichtige Notiz') p.push('„Abbrechen" hat das Fenster trotzdem geschlossen');
    await page.evaluate(() => document.getElementById('modal-notiz').click());
    await page.waitForTimeout(350);
    await page.click('#ac-ok-btn');
    await page.waitForTimeout(400);
    if (await page.evaluate(() => document.getElementById('modal-notiz').classList.contains('open'))) p.push('nach „Verwerfen" bleibt das Fenster offen');
  }
  // ohne Eingabe schliesst ein Tipp daneben sofort
  await page.evaluate(() => openModal('modal-notiz'));
  await page.waitForTimeout(100);
  await page.evaluate(() => document.getElementById('modal-notiz').click());
  await page.waitForTimeout(350);
  r = await page.evaluate(() => ({ frage: document.getElementById('modal-app-confirm').classList.contains('open'), offen: document.getElementById('modal-notiz').classList.contains('open') }));
  if (r.frage || r.offen) p.push('ohne Eingabe: Fenster schließt nicht sofort');
  return p.join(' · ');
});
await scenario('PDF-Text: zerlegte Umlaute (a + ¨) bleiben Umlaute', async () => {
  const r = await page.evaluate(() => typeof _pdfText === 'function' ? _pdfText('Bäume Grün') : null);
  return r === 'Bäume Grün' ? '' : `wurde zu „${r}"`;
});

await scenario('Bautagebuch: Fotos hochladen, anzeigen, bearbeiten, abbrechen, ins Buch, löschen', async () => {
  const r = await page.evaluate(async () => {
    if (typeof addDiaryPhotos !== 'function') return { fehlt: true };
    const datei = async farbe => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d');
      g.fillStyle = farbe; g.fillRect(0, 0, 300, 200); const b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.8));
      return new File([b], farbe.slice(1) + '.jpg', { type: 'image/jpeg' }); };
    showPage('tagebuch'); openModal('modal-tagebuch');
    document.getElementById('tb-title').value = 'Foto-Tag';
    addDiaryPhotos({ files: [await datei('#aa0000'), await datei('#00aa00')], value: '' });
    await __warte(300);
    const vorschau = document.querySelectorAll('#tb-photo-previews img').length;
    await addDiary(); await __warte(300);
    const e = state.tagebuch.find(x => x.title === 'Foto-Tag');
    const inListe = [...document.querySelectorAll('#diary-list .diary-entry')].find(d => d.textContent.includes('Foto-Tag'))?.querySelectorAll('img').length || 0;
    editDiary(e.id); await __warte(100);
    const vorschauEdit = document.querySelectorAll('#tb-photo-previews img').length;
    const erstes = e.fotos[0].url;
    tbFotosBleiben.splice(0, 1); renderDiaryPhotoPreviews();
    addDiaryPhotos({ files: [await datei('#0000aa')], value: '' }); await __warte(300);
    await addDiary(); await __warte(300);
    const e2 = state.tagebuch.find(x => x.title === 'Foto-Tag');
    openModal('modal-tagebuch'); addDiaryPhotos({ files: [await datei('#888888')], value: '' }); await __warte(200);
    [...document.querySelectorAll('#modal-tagebuch .modal-actions button')].find(b => /abbrechen/i.test(b.textContent)).click(); await __warte(300);
    openModal('modal-tagebuch'); await __warte(50);
    const nachAbbruch = document.querySelectorAll('#tb-photo-previews img').length + tbPendingFiles.length;
    closeModal('modal-tagebuch'); await __warte(250);
    const tag = _baubuchDaten({}).kapitel.flatMap(k => k.eintraege).find(x => x.titel === 'Foto-Tag');
    e2.fotos.forEach((f, i) => { f.path = 'test/tb' + i; });
    const geloescht = []; const alt = deletePhotoFromStorage; deletePhotoFromStorage = async p => { geloescht.push(p); };
    window.showConfirm = async () => true;
    try { await deleteDiary(e2.id); } finally { deletePhotoFromStorage = alt; window.showConfirm = window.__echtesConfirm; }
    return { vorschau, anzahl: e.fotos.length, inListe, vorschauEdit, anzahl2: e2.fotos.length, ersteWeg: !e2.fotos.some(f => f.url === erstes),
             nachAbbruch, buchErstes: !!tag && tag.fotos[0]?.src === e2.fotos[0].url, buchAnzahl: tag ? tag.fotos.length : 0, geloescht: geloescht.length,
             noch: state.tagebuch.some(x => x.title === 'Foto-Tag') };
  });
  if (r.fehlt) return 'kein Foto-Upload im Bautagebuch';
  const p = [];
  if (r.vorschau !== 2) p.push(`Vorschau zeigt ${r.vorschau} statt 2 Fotos`);
  if (r.anzahl !== 2) p.push(`gespeichert ${r.anzahl} statt 2 Fotos`);
  if (r.inListe !== 2) p.push(`Liste zeigt ${r.inListe} Fotos`);
  if (r.vorschauEdit !== 2) p.push(`Bearbeiten zeigt ${r.vorschauEdit} Fotos`);
  if (r.anzahl2 !== 2 || !r.ersteWeg) p.push(`nach Bearbeiten ${r.anzahl2} Fotos, entferntes weg: ${r.ersteWeg}`);
  if (r.nachAbbruch) p.push('Abbrechen lässt Fotos im Fenster stehen');
  if (!r.buchErstes || r.buchAnzahl < 2) p.push('Buch: Fotos des Eintrags fehlen');
  if (r.geloescht !== 2 || r.noch) p.push(`Löschen: ${r.geloescht} Dateien entfernt, Eintrag noch da: ${r.noch}`);
  return p.join(' · ');
});

// ── Todoist (nur Web): nachgebauter Server unter /api/todoist ──
const TD = { calls: [], fail: null, status: { configured: true, connected: true, reason: null }, tasks: [], projektFehler: false, tasksDelay: 0 };
const TD_TASKS = () => [
  { id: 'T1', content: '<img src=x onerror="window.__xss=1">Fenster bestellen', description: 'Beim Tischler', priority: 4, parent_id: null, child_order: 1, due: { date: '2026-01-05', time: null, recurring: false, string: '5 Jan' }, url: 'https://app.todoist.com/app/task/T1', uncompletable: false },
  { id: 'T2', content: 'Wöchentlich Baustelle prüfen', description: '', priority: 1, parent_id: null, child_order: 2, due: { date: '2099-01-01', time: null, recurring: true, string: 'every week' }, url: 'https://app.todoist.com/app/task/T2', uncompletable: false },
  { id: 'T3', content: 'Speichern', description: '', priority: 2, parent_id: 'T1', child_order: 1, due: null, url: 'https://app.todoist.com/app/task/T3', uncompletable: false },
];
await page.route('**/api/todoist', async route => {
  const req = route.request();
  const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'POST, OPTIONS' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: hdr });
  const b = req.postDataJSON() || {};
  TD.calls.push(b);
  const send = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: hdr, body: JSON.stringify(body) });
  if (TD.fail && TD.fail.action === b.action) { const f = TD.fail; TD.fail = null; return send(f.status, f.body); }
  if (b.action === 'projects' && TD.projektFehler) return send(502, { error: 'todoist_unavailable' });
  if (b.action === 'tasks' && TD.tasksDelay) { const snap = JSON.parse(JSON.stringify(TD.tasks)); await new Promise(r => setTimeout(r, TD.tasksDelay)); return send(200, { tasks: snap, truncated: false }); }
  switch (b.action) {
    case 'status': return send(200, TD.status);
    case 'tasks': return send(200, { tasks: TD.tasks, truncated: false });
    case 'projects': return send(200, { projects: [{ id: 'P1', name: 'Inbox', depth: 0, inbox: true }, { id: 'P2', name: 'Hausbau', depth: 0 }, { id: 'P3', name: 'Elektro', depth: 1, parent_id: 'P2' }] });
    case 'close': case 'reopen': case 'delete': case 'disconnect': return send(200, { ok: true });
    case 'update': { const t = TD.tasks.find(x => x.id === b.id) || { id: b.id }; const n = { ...t, ...(b.content ? { content: b.content } : {}), ...(b.priority ? { priority: b.priority } : {}) }; return send(200, { task: n }); }
    case 'add': return send(200, { task: { id: 'N1', content: b.content, description: b.description || '', priority: b.priority || 1, parent_id: null, child_order: 9, due: b.due_date ? { date: b.due_date, time: null, recurring: false, string: '' } : null, url: 'https://app.todoist.com/app/task/N1', uncompletable: false } });
    case 'finish': return send(200, { connected: true });
    default: return send(400, { error: 'bad_request' });
  }
});
const TD_AN = `window.__tdAn = (projekt = 'P2') => {
  window.__tdVorher = { u: currentUser, h: _tdHasAccount, pid: state.settings.todoistProjectId, pn: state.settings.todoistProjectName };
  currentUser = { id: '33333333-3333-4333-8333-333333333333', email: 'test@planory.test', created_at: new Date().toISOString() };
  _tdHasAccount = () => true; _tdReset();
  state.settings.todoistProjectId = projekt; state.settings.todoistProjectName = 'Hausbau';
};
window.__tdAus = () => { const v = window.__tdVorher; currentUser = v.u; _tdHasAccount = v.h; state.settings.todoistProjectId = v.pid; state.settings.todoistProjectName = v.pn; _tdReset(); };
window.__bis = async (fn, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 50)); } return false; };`;
await page.evaluate(TD_AN);
const tdReset = (status = { configured: true, connected: true, reason: null }) => { TD.calls = []; TD.fail = null; TD.status = status; TD.tasks = TD_TASKS(); TD.projektFehler = false; TD.tasksDelay = 0; };

await scenario('Todoist: Aufgaben erscheinen unter „Aus Todoist" (sicher, ins Handy-Format passend)', async () => {
  tdReset();
  const r = await page.evaluate(async () => {
    if (typeof renderTodoistSection !== 'function') return { fehlt: true };
    __tdAn(); window.showConfirm = window.__echtesConfirm;
    try {
      showPage('aufgaben');
      const da = await __bis(() => document.querySelectorAll('#td-section input[type=checkbox]').length === 3);
      const sec = document.getElementById('td-section');
      const raus = [...sec.querySelectorAll('button, a')].filter(b => b.getBoundingClientRect().right > innerWidth + 1).length;
      return { da, kopf: sec.textContent.includes('Aus Todoist'), text: sec.textContent.includes('<img src=x'), xss: !!window.__xss,
               rekurrent: sec.textContent.includes('every week'), ueberfaellig: sec.textContent.includes('Überfällig'), raus, hinweis: sec.textContent.includes('nicht von Doist') };
    } finally { __tdAus(); }
  });
  if (r.fehlt) return 'Todoist-Bereich fehlt';
  const p = [];
  if (!r.da || !r.kopf) p.push('Aufgaben nicht angezeigt');
  if (!r.text || r.xss) p.push('Aufgabentext nicht sicher als Text ausgegeben');
  if (!r.rekurrent || !r.ueberfaellig) p.push('Wiederholung/Fälligkeit fehlt');
  if (r.raus) p.push(`${r.raus} Knöpfe außerhalb des Bildschirms`);
  if (!r.hinweis) p.push('Hinweis „nicht von Doist" fehlt');
  return p.join(' · ');
});
await scenario('Todoist: Abhaken schickt „close"; Fehler nimmt das Häkchen zurück', async () => {
  tdReset();
  const r1 = await page.evaluate(async () => {
    if (typeof tdToggleTask !== 'function') return { fehlt: true };
    __tdAn();
    try {
      showPage('aufgaben'); await __bis(() => document.querySelectorAll('#td-section input[type=checkbox]').length === 3);
      await tdToggleTask('T1');
      return { zu: !!(_td.geschlossen.P2 || {}).T1, kind: !!(_td.geschlossen.P2 || {}).T3 };
    } finally { __tdAus(); }
  });
  if (r1.fehlt) return 'Abhaken fehlt';
  const close = TD.calls.find(c => c.action === 'close');
  tdReset(); TD.fail = { action: 'close', status: 502, body: { error: 'todoist_unavailable' } };
  const r2 = await page.evaluate(async () => {
    __tdAn();
    try { showPage('aufgaben'); await __bis(() => document.querySelectorAll('#td-section input[type=checkbox]').length === 3);
      await tdToggleTask('T1'); return { zu: !!(_td.geschlossen.P2 || {}).T1 }; } finally { __tdAus(); }
  });
  const p = [];
  if (!close || close.id !== 'T1') p.push('kein „close" an Todoist');
  if (!r1.zu || !r1.kind) p.push('abgehakt nicht angezeigt (inkl. Unteraufgabe)');
  if (r2.zu) p.push('nach Fehler bleibt das Häkchen');
  return p.join(' · ');
});
await scenario('Todoist: Bearbeiten schickt nur Geändertes; wiederkehrendes Datum gesperrt; Neu & Löschen', async () => {
  tdReset();
  const r = await page.evaluate(async () => {
    if (typeof tdEditTask !== 'function') return { fehlt: true };
    __tdAn(); const altConfirm = window.showConfirm; window.showConfirm = async () => true;
    const aufgabenVorher = state.aufgaben.length;
    try {
      showPage('aufgaben'); await __bis(() => document.querySelectorAll('#td-section input[type=checkbox]').length === 3);
      tdEditTask('T2'); await new Promise(r => setTimeout(r, 50));
      const gesperrt = document.getElementById('td-datum').disabled && document.getElementById('td-lock-hint').style.display !== 'none';
      document.getElementById('td-name').value = 'Wöchentlich Baustelle prüfen!';
      await tdSaveTask(); await new Promise(r => setTimeout(r, 250));
      tdNewTask(); await new Promise(r => setTimeout(r, 50));
      document.getElementById('td-name').value = 'Neue Sache';
      await tdSaveTask(); await new Promise(r => setTimeout(r, 250));
      const neuDa = document.getElementById('td-section').textContent.includes('Neue Sache');
      await tdDeleteTask('T1');
      return { gesperrt, neuDa, weg: !(_td.tasks.P2.liste || []).some(t => t.id === 'T1' || t.id === 'T3'), aufgaben: state.aufgaben.length - aufgabenVorher };
    } finally { window.showConfirm = altConfirm; __tdAus(); }
  });
  if (r.fehlt) return 'Bearbeiten fehlt';
  const p = [];
  const upd = TD.calls.find(c => c.action === 'update');
  if (!r.gesperrt) p.push('Datum der wiederkehrenden Aufgabe nicht gesperrt');
  if (!upd || JSON.stringify(Object.keys(upd).sort()) !== '["action","content","id"]') p.push('Ändern schickt: ' + JSON.stringify(upd));
  const add = TD.calls.find(c => c.action === 'add');
  if (!add || add.project_id !== 'P2' || 'due_date' in add || !r.neuDa) p.push('Neu: ' + JSON.stringify(add));
  if (!TD.calls.some(c => c.action === 'delete' && c.id === 'T1') || !r.weg) p.push('Löschen (inkl. Unteraufgabe)');
  if (r.aufgaben) p.push('Todoist-Aufgaben landen in den Planory-Aufgaben');
  return p.join(' · ');
});
await scenario('Todoist: abgelaufene Verbindung zeigt „Neu verbinden"; Einstellungen mit Projektwahl', async () => {
  tdReset({ configured: true, connected: false, reason: 'revoked' });
  const r = await page.evaluate(async () => {
    if (typeof renderTodoistCard !== 'function') return { fehlt: true };
    __tdAn();
    try {
      showPage('aufgaben'); await __bis(() => document.getElementById('td-section').textContent.includes('Neu verbinden'));
      const neu = document.getElementById('td-section').textContent.includes('Neu verbinden');
      _td.status = { configured: true, connected: true, reason: null }; _td.statusAt = Date.now();
      showPage('settings'); await __bis(() => document.querySelectorAll('#td-projekt option').length > 2);
      const optionen = [...document.querySelectorAll('#td-projekt option')].map(o => o.value).join();
      tdSetProject('P3');
      return { neu, optionen, gesetzt: state.settings.todoistProjectId, karte: document.getElementById('td-card').style.display !== 'none' };
    } finally { __tdAus(); }
  });
  if (r.fehlt) return 'Einstellungen fehlen';
  const p = [];
  if (!r.neu) p.push('„Neu verbinden" fehlt');
  if (!r.karte || r.optionen !== ',P1,P2,P3') p.push('Projektwahl: ' + r.optionen);
  if (r.gesetzt !== 'P3') p.push('Projekt nicht gespeichert');
  return p.join(' · ');
});
await scenario('Todoist: in der iPhone-App unsichtbar und keine Anfragen', async () => {
  tdReset();
  const r = await page.evaluate(async () => {
    if (typeof renderTodoistSection !== 'function') return { fehlt: true };
    __tdAn(); const altCap = window.Capacitor;
    window.Capacitor = { isNativePlatform: () => true, Plugins: {} };
    try {
      showPage('aufgaben'); renderTodoistSection(); showPage('settings'); renderTodoistCard();
      await new Promise(r => setTimeout(r, 400));
      return { sec: document.getElementById('td-section').style.display, card: document.getElementById('td-card').style.display };
    } finally { window.Capacitor = altCap; __tdAus(); }
  });
  if (r.fehlt) return 'Todoist-Bereich fehlt';
  const p = [];
  if (r.sec !== 'none' || r.card !== 'none') p.push('in der App sichtbar');
  if (TD.calls.length) p.push(`${TD.calls.length} Anfragen in der App`);
  return p.join(' · ');
});
await scenario('Todoist: Rückkehr nach der Anmeldung schließt die Verbindung ab; Englisch', async () => {
  tdReset({ configured: true, connected: false, reason: null });
  const r = await page.evaluate(async () => {
    if (typeof _tdHandleReturn !== 'function') return { fehlt: true };
    __tdAn();
    try {
      sessionStorage.setItem('planoryTodoist', JSON.stringify({ t: 'finish', n: 'abc', grund: '', at: Date.now() }));
      await _tdHandleReturn();
      const verbunden = !!(_td.status && _td.status.connected);
      setLang('en', false); showPage('aufgaben');
      await __bis(() => document.querySelectorAll('#td-section input[type=checkbox]').length === 3);
      const en = document.getElementById('td-section').textContent;
      setLang('de', false);
      return { verbunden, from: en.includes('From Todoist'), speichern: en.includes('Speichern'), hinweis: en.includes('not created by') };
    } finally { __tdAus(); }
  });
  if (r.fehlt) return 'Rückkehr-Funktion fehlt';
  const p = [];
  if (!TD.calls.some(c => c.action === 'finish' && c.n === 'abc') || !r.verbunden) p.push('finish nicht aufgerufen/verbunden');
  if (!r.from || !r.hinweis) p.push('Englisch fehlt');
  if (!r.speichern) p.push('Aufgabe „Speichern" wurde übersetzt');
  return p.join(' · ');
});

await scenario('Todoist: Projektliste nicht ladbar → keine Endlosschleife, „Erneut versuchen"', async () => {
  tdReset(); TD.projektFehler = true;
  const r = await page.evaluate(async () => {
    __tdAn();
    try {
      showPage('settings'); renderTodoistCard();
      await new Promise(r => setTimeout(r, 1500));
      return { knopf: document.getElementById('td-card-body').textContent.includes('Erneut versuchen') };
    } finally { __tdAus(); }
  });
  const n = TD.calls.filter(c => c.action === 'projects').length;
  const p = [];
  if (n > 2) p.push(`${n} Anfragen in 1,5 s (Endlosschleife)`);
  if (!r.knopf) p.push('kein „Erneut versuchen"');
  return p.join(' · ');
});
await scenario('Todoist: bewusst getrennt → kein „abgelaufen"; Status-Fehler blendet nicht dauerhaft aus', async () => {
  tdReset();
  const r = await page.evaluate(async () => {
    __tdAn(); const altConfirm = window.showConfirm; window.showConfirm = async () => true;
    try {
      showPage('settings'); renderTodoistCard(); await __bis(() => !!document.getElementById('td-projekt'));
      await tdDisconnect();
      showPage('aufgaben'); await new Promise(r => setTimeout(r, 300));
      const nachTrennen = document.getElementById('td-section').style.display;
      // Status-Abfrage scheitert einmal (offline) -> danach darf Todoist nicht dauerhaft "nicht eingerichtet" sein
      _tdReset(); window.__tdStatusFehler = true;
      return { nachTrennen };
    } finally { window.showConfirm = altConfirm; __tdAus(); }
  });
  TD.fail = { action: 'status', status: 502, body: { error: 'todoist_unavailable' } };
  const r2 = await page.evaluate(async () => {
    __tdAn();
    try {
      await _tdLoadStatus();
      const nachFehler = _td.status && _td.status.configured === false;
      const bald = Date.now() - _td.statusAt > 25000;   // naechster Versuch in ~30 s statt nie
      await _tdLoadStatus(true);
      return { nachFehler, bald, jetzt: !!(_td.status && _td.status.configured) };
    } finally { __tdAus(); }
  });
  const p = [];
  if (r.nachTrennen !== 'none') p.push('nach bewusstem Trennen steht „abgelaufen"');
  if (r2.nachFehler) p.push('ein Fehler merkt sich „nicht eingerichtet"');
  if (!r2.bald) p.push('kein baldiger neuer Versuch');
  if (!r2.jetzt) p.push('Status kommt nicht wieder');
  return p.join(' · ');
});
await scenario('Todoist: Neu laden nach Änderung nimmt nicht die alte, laufende Antwort', async () => {
  tdReset(); TD.tasksDelay = 400;
  const r = await page.evaluate(async () => {
    __tdAn();
    try {
      const alt = _tdLoadTasks('P2');                 // laeuft (liefert den alten Stand)
      await new Promise(r => setTimeout(r, 100));
      window.__tdNeuStand = true;
      return { gestartet: true };
    } finally { /* Fortsetzung unten */ }
  });
  TD.tasks = TD.tasks.map(t => t.id === 'T2' ? { ...t, due: { ...t.due, date: '2099-01-08' } } : t);   // Todoist hat weitergeschoben
  const r2 = await page.evaluate(async () => {
    try {
      _tdGeaendert('P2');
      await _tdLoadTasks('P2', true);
      return { datum: (_td.tasks.P2.liste.find(t => t.id === 'T2') || {}).due?.date };
    } finally { __tdAus(); }
  });
  const n = TD.calls.filter(c => c.action === 'tasks').length;
  const p = [];
  if (r2.datum !== '2099-01-08') p.push(`zeigt altes Datum ${r2.datum}`);
  if (n < 2) p.push('kein frischer Abruf');
  return p.join(' · ');
});
await scenario('Tagebuch-Fotos: Abbrechen während des Hochladens speichert nichts und räumt auf', async () => {
  const r = await page.evaluate(async () => {
    if (typeof addDiaryPhotos !== 'function') return { fehlt: true };
    const datei = async () => { const c = document.createElement('canvas'); c.width = 50; c.height = 50; const b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.8)); return new File([b], 'x.jpg', { type: 'image/jpeg' }); };
    const id = _neueId();
    state.tagebuch.push({ id, datum: '2026-09-01', title: 'Mit Fotos', text: 'Wichtiger Text', weather: '☀️ Sonnig', tags: ['a'], workers: [],
      fotos: [{ url: 'data:image/png;base64,AA', path: 'test/alt1' }, { url: 'data:image/png;base64,BB', path: 'test/alt2' }] });
    const altUp = uploadPhotoToStorage, altDel = deletePhotoFromStorage;
    const geloescht = [];
    uploadPhotoToStorage = async f => { await new Promise(r => setTimeout(r, 400)); return { url: 'data:image/png;base64,CC', path: 'test/neu1' }; };
    deletePhotoFromStorage = async p => { geloescht.push(p); };
    try {
      editDiary(id); await new Promise(r => setTimeout(r, 50));
      addDiaryPhotos({ files: [await datei()], value: '' }); await new Promise(r => setTimeout(r, 100));
      const laeuft = addDiary(); await new Promise(r => setTimeout(r, 120));
      const keinX = document.querySelectorAll('#tb-photo-previews button').length === 0;
      [...document.querySelectorAll('#modal-tagebuch .modal-actions button')].find(b => /abbrechen/i.test(b.textContent)).click();
      await laeuft; await new Promise(r => setTimeout(r, 300));
      const e = state.tagebuch.find(x => x.id === id);
      return { titel: e.title, text: e.text, fotos: e.fotos.length, geloescht, keinX };
    } finally { uploadPhotoToStorage = altUp; deletePhotoFromStorage = altDel; state.tagebuch = state.tagebuch.filter(x => x.id !== id); }
  });
  if (r.fehlt) return 'Foto-Upload fehlt';
  const p = [];
  if (r.titel !== 'Mit Fotos' || r.text !== 'Wichtiger Text' || r.fotos !== 2) p.push(`Eintrag verändert: ${r.titel} / ${r.text} / ${r.fotos} Fotos`);
  if (r.geloescht.includes('test/alt1') || r.geloescht.includes('test/alt2')) p.push('vorhandene Fotos gelöscht');
  if (!r.geloescht.includes('test/neu1')) p.push('hochgeladenes Foto nicht aufgeräumt');
  if (!r.keinX) p.push('✕ während des Hochladens bedienbar');
  return p.join(' · ');
});
await scenario('Tagebuch-Fotos: Foto von anderem Gerät bleibt beim Speichern erhalten', async () => {
  const r = await page.evaluate(async () => {
    if (typeof addDiaryPhotos !== 'function') return { fehlt: true };
    const id = _neueId();
    state.tagebuch.push({ id, datum: '2026-09-02', title: 'Zwei Geräte', text: '', workers: [], fotos: [{ url: 'data:image/png;base64,AA', path: 'test/a' }] });
    const altDel = deletePhotoFromStorage, geloescht = [];
    deletePhotoFromStorage = async p => { geloescht.push(p); };
    try {
      editDiary(id); await new Promise(r => setTimeout(r, 50));
      // anderes Geraet fuegt waehrenddessen ein Foto hinzu (Realtime ersetzt den Eintrag)
      const i = state.tagebuch.findIndex(x => x.id === id);
      state.tagebuch[i] = { ...state.tagebuch[i], fotos: [...state.tagebuch[i].fotos, { url: 'data:image/png;base64,YY', path: 'test/remote' }] };
      document.getElementById('tb-text').value = 'Tippfehler korrigiert';
      await addDiary(); await new Promise(r => setTimeout(r, 250));
      const e = state.tagebuch.find(x => x.id === id);
      return { pfade: e.fotos.map(f => f.path), geloescht };
    } finally { deletePhotoFromStorage = altDel; state.tagebuch = state.tagebuch.filter(x => x.id !== id); }
  });
  if (r.fehlt) return 'Foto-Upload fehlt';
  const p = [];
  if (!r.pfade.includes('test/remote')) p.push('Foto vom anderen Gerät verschwunden');
  if (r.geloescht.length) p.push('Dateien gelöscht: ' + r.geloescht.join(','));
  return p.join(' · ');
});

// ── Simons Liste: Zeitplan · Fotos · Wetter · Startseite · „nicht im Budget" · Budget-Grafik · Zahlungstermine ──
await scenario('Zeitplan: „+ Abschnitt" holt den neuen Abschnitt ins Bild (hervorgehoben, Name markiert)', async () => {
  const r = await page.evaluate(async () => {
    showPage('planung'); window.scrollTo(0, 0);
    const knopf = [...document.querySelectorAll('#plan-header-btns button')].find(b => b.textContent.includes('Abschnitt'));
    knopf.click();
    await new Promise(res => setTimeout(res, 900));
    const neu = state.gantt[state.gantt.length - 1];
    const sec = document.activeElement && document.activeElement.closest('.pl-sec');
    const rc = sec ? sec.getBoundingClientRect() : null;
    const erg = { name: neu.name, fokus: !!sec && document.activeElement.classList.contains('pl-secname') && document.activeElement.value === neu.name,
      imBild: !!rc && rc.top >= 0 && rc.top < innerHeight - 60, hervor: !!sec && sec.classList.contains('pl-neu'),
      datum: !!sec && !!sec.querySelector('.pl-span input[type=date]') };
    _trackDeletion(neu.id, 'gantt'); state.gantt = state.gantt.filter(g => g !== neu); renderZeitplan();
    return erg;
  });
  const p = [];
  if (!r.fokus) p.push('Namensfeld des neuen Abschnitts hat keinen Fokus');
  if (!r.imBild) p.push('neuer Abschnitt nicht im Bild');
  if (!r.hervor) p.push('nicht hervorgehoben');
  if (!r.datum) p.push('Zeitraum-Felder beim neuen Abschnitt nicht offen');
  return p.join(' · ');
});
await scenario('Zeitplan: Punkte stehen im passenden Abschnitt – nichts doppelt, kein Kreis-Rätsel', async () => {
  const r = await page.evaluate(() => {
    showPage('planung');
    const el = document.getElementById('plan-timeline');
    const txt = el.innerText;
    const demoOk = (state.meilensteine || []).filter(m => m.id >= 4001 && m.id <= 4006)
      .every(m => el.querySelector(`.pl-sec[data-sec] .pl-item[data-item="${m.id}"]`));
    const ohneBlock = /Weitere Punkte|Ohne Abschnitt/.test(txt) ? (state.meilensteine || []).filter(m => !m.ganttId || !state.gantt.some(g => String(g.id) === String(m.ganttId))).map(m => m.name + '/' + (m.datum || '-')).join(', ') : '';
    return { ohne: ohneBlock, kreis: /Kreis antippen = Status/.test(txt), demoOk,
      hinweis: /Kreis antippen: Offen → In Arbeit → Erledigt/.test(txt), dots: el.querySelectorAll('.pl-dot').length, btn: el.querySelectorAll('.pl-stbtn').length };
  });
  const p = [];
  if (r.ohne) p.push('Block „Weitere Punkte/Ohne Abschnitt" erscheint, obwohl alles zuordenbar ist: ' + r.ohne);
  if (!r.demoOk) p.push('Demo-Punkte nicht im passenden Abschnitt');
  if (r.kreis || !r.hinweis) p.push('Hinweis zum Status fehlt oder ist der alte („Kreis antippen = Status ändern")');
  if (r.dots || !r.btn) p.push(`Status noch als Kreis (${r.dots}) statt Schaltfläche (${r.btn})`);
  return p.join(' · ');
});
await scenario('Zeitplan: Status-Kreis schaltet weiter (Offen → In Arbeit → Erledigt), mit Beschriftung', async () => {
  const r = await page.evaluate(() => {
    showPage('planung');
    const m = state.meilensteine.find(x => x.id === 4004);
    const vorher = m.status;
    const texte = [];
    for (let i = 0; i < 3; i++) {
      const b = document.querySelector(`#plan-timeline .pl-item[data-item="4004"] .pl-stbtn`);
      if (!b) return { fehlt: true };
      texte.push(b.getAttribute('aria-label') + (document.querySelector('#plan-timeline .pl-item[data-item="4004"] .pl-tag-arbeit') ? ' +Etikett' : ''));
      b.click();
    }
    const glocke = !!document.querySelector('#plan-timeline .pl-item[data-item="4004"] .pl-bell');
    m.status = vorher; m.done = vorher === 'erledigt'; renderZeitplan();
    return { texte, glocke };
  });
  if (r.fehlt) return 'keine Status-Schaltfläche';
  const soll = ['Status: Offen', 'Status: In Arbeit +Etikett', 'Status: Erledigt'];
  if (JSON.stringify(r.texte) !== JSON.stringify(soll)) return `Texte: ${r.texte.join(' | ')}`;
  return r.glocke ? '' : '🔔 fehlt bei Punkt mit Datum';
});
await scenario('Zeitplan: KI-Import ordnet Meilensteine den Phasen zu, Rest lässt sich zuordnen', async () => {
  const r = await page.evaluate(() => {
    const g0 = state.gantt.length, m0 = state.meilensteine.length;
    document.getElementById('ki-ms-list').innerHTML = ''; document.getElementById('ki-gantt-list').innerHTML = '';
    _kiZeitplanData = {
      phasen: [{ name: 'Keller', start: '2027-01-01', end: '2027-03-31' }, { name: 'Fassade', start: '2027-04-01', end: '2027-06-30' },
               { name: 'Übergabe', start: '2027-08-01', end: '2027-08-31' }],
      meilensteine: [{ name: 'Keller betoniert', datum: '2027-03-31' }, { name: 'Fassade fertig', datum: '' },
                     { name: 'Schlüssel', datum: '2027-09-15', phase: 'Übergabe' }, { name: 'Fenster bestellen', datum: '2027-07-15' }]
    };
    importKIZeitplan();
    const neuG = state.gantt.slice(g0), neuM = state.meilensteine.slice(m0);
    const sec = n => (neuG.find(g => g.name === n) || {}).id;
    const ist = n => { const m = neuM.find(x => x.name === n); return m && m.ganttId; };
    const erg = { keller: ist('Keller betoniert') === sec('Keller'), fassade: ist('Fassade fertig') === sec('Fassade'),
      schluessel: ist('Schlüssel') === sec('Übergabe'), fensterOhne: !ist('Fenster bestellen') };
    showPage('planung');
    const ohne = document.querySelector('#plan-timeline .pl-ohne');
    const fenster = neuM.find(x => x.name === 'Fenster bestellen');
    const sel = ohne && ohne.querySelector(`.pl-item[data-item="${fenster.id}"] select.pl-assign`);
    erg.block = !!ohne && ohne.innerText.includes('Ohne Abschnitt') && !!sel;
    if (sel) { sel.value = String(sec('Fassade')); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    erg.zugeordnet = String(fenster.ganttId) === String(sec('Fassade'));
    erg.blockWeg = !document.querySelector('#plan-timeline .pl-ohne');
    erg.idsEinzig = new Set([...state.gantt, ...state.meilensteine].map(x => String(x.id))).size === state.gantt.length + state.meilensteine.length;
    neuM.forEach(m => _trackDeletion(m.id, 'meilensteine')); neuG.forEach(g => _trackDeletion(g.id, 'gantt'));
    state.meilensteine = state.meilensteine.filter(m => !neuM.includes(m)); state.gantt = state.gantt.filter(g => !neuG.includes(g));
    renderZeitplan();
    return erg;
  });
  const p = [];
  if (!r.keller) p.push('„Keller betoniert" nicht per Datum zugeordnet');
  if (!r.fassade) p.push('„Fassade fertig" nicht per Name zugeordnet');
  if (!r.schluessel) p.push('„Schlüssel" nicht laut KI-Phase zugeordnet');
  if (!r.fensterOhne) p.push('„Fenster bestellen" falsch zugeordnet');
  if (!r.block) p.push('kein Block „Ohne Abschnitt" mit Auswahl');
  if (!r.zugeordnet || !r.blockWeg) p.push('Zuordnen per Auswahl klappt nicht');
  if (!r.idsEinzig) p.push('doppelte IDs');
  return p.join(' · ');
});
await scenario('Fotos/Einstellungen: Unterzeile steht unter der Überschrift', async () => {
  const r = await page.evaluate(() => ['fotos', 'settings'].map(id => {
    showPage(id);
    const h = document.querySelector(`#page-${id} .page-header h2`), s = document.querySelector(`#page-${id} .page-header p`);
    const a = h.getBoundingClientRect(), b = s.getBoundingClientRect();
    return b.top >= a.bottom - 2 ? '' : `${id}: Unterzeile neben der Überschrift`;
  }).filter(Boolean).join(' · '));
  return r;
});
await scenario('Bautagebuch: kein roter Fehler beim „+ Eintrag", Wetter per Antippen', async () => {
  const r = await page.evaluate(async () => {
    const alt = showToast, meldungen = [];
    showToast = (m, t) => meldungen.push(t + ':' + m);
    const adr = state.settings.address;
    try {
      state.settings.address = '4600 Wels';   // Ortssuche scheitert im Test (kein Netz) -> frueher rote Meldung
      showPage('tagebuch'); openModal('modal-tagebuch');
      await new Promise(res => setTimeout(res, 1200));
      const auto = meldungen.filter(m => m.startsWith('error')).length;
      const chips = [...document.querySelectorAll('#tb-wetter-chips .wx-chip')];
      const regen = chips.find(c => c.textContent.includes('Regen'));
      if (regen) regen.click();
      const wert = document.getElementById('tb-weather').value, an = regen && document.querySelector('#tb-wetter-chips .wx-chip.on')?.textContent;
      await fetchWetter(true);
      const manuell = meldungen.filter(m => m.startsWith('error')).length - auto;
      return { auto, chips: chips.length, wert, an, manuell, bleibt: document.getElementById('tb-weather').value };
    } finally {
      showToast = alt; state.settings.address = adr;
      const m = document.getElementById('modal-tagebuch'); m._dirty = false; closeModal('modal-tagebuch');
    }
  });
  const p = [];
  if (r.auto) p.push(`${r.auto} Fehlermeldung(en) beim Öffnen`);
  if (r.chips < 6) p.push(`nur ${r.chips} Wetter-Felder`);
  if (!/Regen/.test(r.wert || '') || !/Regen/.test(r.an || '')) p.push(`Antippen setzt Wetter nicht (${r.wert})`);
  if (r.manuell !== 1) p.push('„Abrufen" meldet den Fehler nicht');
  if (!/Regen/.test(r.bleibt || '')) p.push('gewähltes Wetter überschrieben');
  return p.join(' · ');
});
await scenario('Startseite: Statusbericht/Einstellungen weg, Schalter mit wechselnder Beschriftung werden gemerkt', async () => {
  const r = await page.evaluate(() => {
    showPage('dashboard');
    const kopf = document.querySelector('#page-dashboard .page-header').innerText;
    const pb = document.getElementById('privacy-btn');
    const l0 = pb.innerText.trim(); pb.click();
    const l1 = pb.innerText.trim(), versteckt = document.body.classList.contains('privacy-mode'), aria = pb.getAttribute('aria-checked');
    document.body.classList.remove('privacy-mode'); renderDashboard();   // wie nach Neustart
    const gemerkt = document.body.classList.contains('privacy-mode');
    pb.click();
    const kb = document.getElementById('ki-panel-btn'); kb.click();
    const kiAus = document.getElementById('ki-advisor-panel').style.display === 'none', leiste = getComputedStyle(document.getElementById('ki-advisor-off')).display !== 'none';
    document.getElementById('ki-advisor-panel').style.display = ''; renderDashboard();
    const kiGemerkt = document.getElementById('ki-advisor-panel').style.display === 'none';
    document.querySelector('#ki-advisor-off button, #ki-advisor-off [role=switch]').click();
    const kiWieder = document.getElementById('ki-advisor-panel').style.display !== 'none';
    return { statusbericht: /Statusbericht/.test(kopf), einst: /Einstellungen/.test(kopf), l0, l1, versteckt, aria, gemerkt,
      jetzt: document.body.classList.contains('privacy-mode'), kiAus, leiste, kiGemerkt, kiWieder };
  });
  const p = [];
  if (r.statusbericht || r.einst) p.push('Statusbericht/Einstellungen noch oben');
  if (r.l0 === r.l1 || !r.versteckt || r.aria !== 'false') p.push(`Beträge-Schalter: „${r.l0}" → „${r.l1}"`);
  if (!r.gemerkt) p.push('Beträge-Einstellung nicht gemerkt');
  if (r.jetzt) p.push('Beträge lassen sich nicht wieder einblenden');
  if (!r.kiAus || !r.leiste) p.push('KI ausblenden zeigt keine Leiste');
  if (!r.kiGemerkt) p.push('KI-Einstellung nicht gemerkt');
  if (!r.kiWieder) p.push('KI lässt sich über die Leiste nicht wieder einblenden');
  return p.join(' · ');
});
await scenario('Ausgaben: Eigenleistung raus – „Im Budget berücksichtigen" (Standard an), zählt nicht ins Budget', async () => {
  const r = await page.evaluate(async () => {
    showPage('kosten');
    const ui = !!document.getElementById('modal-eigenleistung') || /Eigenleistung \(Wert\)|\+ Eigenleistung/.test(document.getElementById('page-kosten').innerText);
    openModal('modal-kosten');
    const cb = document.getElementById('k-im-budget');
    const standard = !!cb && cb.checked;
    closeModal('modal-kosten');
    const summe = () => { showPage('budget'); const b = document.getElementById('bg-total-spent').textContent;
      showPage('dashboard'); const d = document.getElementById('dash-spent')?.textContent || document.querySelector('#dash-cards')?.innerText; return b + '|' + d; };
    const vorher = summe();
    state.kosten.push({ id: 9810001, datum: '2026-09-20', beschr: 'Fliesen selbst verlegt', kat: state.budgetKat[0].name, mwst: 0, netto: 1234, betrag: 1234, status: 'Bezahlt', anbieter: '', imBudget: false, _updatedAt: 1 });
    const nachher = summe();
    showPage('kosten');
    const zeile = [...document.querySelectorAll('#page-kosten tr, #page-kosten .mobile-card, #page-kosten .card')].find(x => x.innerText.includes('Fliesen selbst verlegt'));
    const badge = !!zeile && /nicht im Budget/i.test(zeile.innerText);
    const nibSoll = fmt(state.kosten.filter(k => k.imBudget === false && k.status !== 'Storniert').reduce((s, k) => s + (parseFloat(k.betrag) || 0), 0));
    const karte = document.getElementById('k-nib-card'), nib = karte && karte.style.display !== 'none' && document.getElementById('k-nib').textContent === nibSoll && /1\s?234|1\s?684/.test(nibSoll);
    // per Fenster: Haken raus -> imBudget:false, wieder rein -> Feld weg
    editKosten(9810001); const gezeigt = document.getElementById('k-im-budget').checked;
    document.getElementById('k-im-budget').checked = true; await saveKosten();
    const wiederDrin = state.kosten.find(k => k.id === 9810001).imBudget !== false;
    _trackDeletion(9810001, 'kosten'); state.kosten = state.kosten.filter(k => k.id !== 9810001);
    return { ui, standard, gleich: vorher === nachher, vorher, nachher, badge, nib, gezeigt, wiederDrin };
  });
  const p = [];
  if (r.ui) p.push('Eigenleistung-Bereich noch da');
  if (!r.standard) p.push('Häkchen „Im Budget berücksichtigen" fehlt oder ist aus');
  if (!r.gleich) p.push(`Budget/Startseite zählen es mit: ${r.vorher} → ${r.nachher}`);
  if (!r.badge) p.push('kein Hinweis „nicht im Budget" in der Liste');
  if (!r.nib) p.push('Karte „Nicht im Budget" fehlt');
  if (r.gezeigt) p.push('Bearbeiten zeigt Häkchen an, obwohl nicht im Budget');
  if (!r.wiederDrin) p.push('Häkchen wieder an wirkt nicht');
  return p.join(' · ');
});
await scenario('Ausgaben: bestehende Eigenleistungen werden einmalig übernommen, gelöschte kommen nicht wieder', async () => {
  const r = await page.evaluate(async () => {
    if (typeof _eigenleistungenUebernehmen !== 'function') return { fehlt: true };
    state.eigenleistungen = [{ id: 98200, datum: '2026-08-01', beschr: 'Dämmung selbst', kat: state.budgetKat[0].name, wert: 900, von: 'Simon', notiz: '' }];
    const n1 = _eigenleistungenUebernehmen(state), n2 = _eigenleistungenUebernehmen(state);
    const neu = state.kosten.filter(k => k.id === 982007);
    const ok = neu.length === 1 && neu[0].imBudget === false && neu[0].betrag === 900;
    const mitNotiz = (() => { state.eigenleistungen.push({ id: 98201, datum: '2026-08-02', beschr: 'Fliesen', kat: '', wert: 300, von: '', notiz: 'mit Papa' });
      _eigenleistungenUebernehmen(state); const k = state.kosten.find(x => x.id === 982017); return k && k.beschr; })();
    window.showConfirm = async () => true;
    await deleteKosten(982007);
    window.showConfirm = window.__echtesConfirm;
    const quelleWeg = !state.eigenleistungen.some(e => e.id === 98200) && !!state._deletedIds['98200'];
    // alte App-Version hat die Eigenleistung noch und speichert sie neu (ohne Merker)
    state.eigenleistungen.push({ id: 98200, datum: '2026-08-01', beschr: 'Dämmung selbst', kat: state.budgetKat[0].name, wert: 900, von: 'Simon', notiz: '' });
    _eigenleistungenUebernehmen(state);
    const wieder = state.kosten.some(k => k.id === 982007);
    state.kosten = state.kosten.filter(k => k.id !== 982017);
    state.eigenleistungen = [];
    return { n1, n2, ok, wieder, quelleWeg, mitNotiz };
  });
  if (r.fehlt) return 'Übernahme fehlt';
  const p = [];
  if (r.n1 !== 1 || r.n2 !== 0 || !r.ok) p.push(`Übernahme: ${r.n1}/${r.n2}, ok=${r.ok}`);
  if (r.wieder) p.push('gelöschte übernommene Ausgabe kam wieder');
  if (!r.quelleWeg) p.push('alte Eigenleistung bleibt nach dem Löschen der Ausgabe bestehen');
  if (!/mit Papa/.test(r.mitNotiz || '')) p.push(`Notiz der Eigenleistung geht verloren („${r.mitNotiz}")`);
  return p.join(' · ');
});
await scenario('Budget: Grafik (Ring + Balken je Kategorie) mit Zahlen, ohne „nicht im Budget"', async () => {
  if (!CHART) return '';
  const r = await page.evaluate(async () => {
    state.kosten.push({ id: 9830001, datum: '2026-09-21', beschr: 'Geschenk', kat: state.budgetKat[0].name, mwst: 0, netto: 5000, betrag: 5000, status: 'Bezahlt', imBudget: false, _updatedAt: 1 });
    showPage('budget'); await new Promise(res => setTimeout(res, 300));
    const ring = document.getElementById('bg-ring-chart'), bar = document.getElementById('bg-bar-chart');
    const soll = state.kosten.filter(k => k.status !== 'Storniert' && k.imBudget !== false).reduce((s, k) => s + (parseFloat(k.betrag) || 0), 0);
    const erg = { da: !!(ring && ring._chart && bar && bar._chart),
      ring: ring && ring._chart ? ring._chart.data.datasets[0].data[0] : null, soll,
      kats: bar && bar._chart ? bar._chart.data.labels.length : 0, anzKat: state.budgetKat.length,
      zahl: /\d/.test(document.getElementById('bg-total-spent').textContent),
      breit: document.querySelector('.bg-blick').scrollWidth <= document.querySelector('.bg-blick').clientWidth + 1 };
    _trackDeletion(9830001, 'kosten'); state.kosten = state.kosten.filter(k => k.id !== 9830001);
    return erg;
  });
  const p = [];
  if (!r.da) return 'Grafik fehlt';
  if (Math.abs(r.ring - r.soll) > 0.01) p.push(`Ring zeigt ${r.ring}, erwartet ${r.soll}`);
  if (r.kats !== r.anzKat) p.push(`Balken: ${r.kats} statt ${r.anzKat} Kategorien`);
  if (!r.zahl) p.push('Zahlen fehlen');
  if (!r.breit) p.push('Grafik ragt über den Rand');
  return p.join(' · ');
});
await scenario('Zahlungstermine: verständlicher Text statt „Abschlagszahlungen"', async () => {
  const t = await page.evaluate(() => { showPage('zahlungsplan'); return document.getElementById('page-zahlungsplan').innerText; });
  return /Abschlagszahlung/.test(t) ? 'Text „Abschlagszahlungen" noch da' : '';
});

await scenario('Zeitplan: Datum tippen (Computer) – erst nach dem Verlassen speichern/zeichnen, kein halbes Datum', async () => {
  // Am Computer tippt man das Datum ein (am Handy kommt ein Kalender) -> eigenes Desktop-Fenster
  const d = await boot({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  let r, waehrend;
  try {
    const sid = await d.page.evaluate(() => { showPage('planung'); planAddSection(); return state.gantt[state.gantt.length - 1].id; });
    await d.page.waitForTimeout(400);
    const feld = d.page.locator(`#plan-timeline .pl-sec[data-sec="${sid}"] .pl-span input[type=date]`).first();
    await feld.focus();
    await feld.pressSequentially('01012027', { delay: 40 });   // feuert schon nach der 1. Jahresziffer „change" (0002-01-01)
    waehrend = await d.page.evaluate(() => document.activeElement && document.activeElement.type);
    await d.page.evaluate(() => document.activeElement && document.activeElement.blur());
    await d.page.waitForTimeout(400);
    r = await d.page.evaluate(id => { const s = state.gantt.find(g => g.id === id);
      return { start: s.start, text: document.querySelector(`#plan-timeline .pl-sec[data-sec="${id}"] .pl-range`)?.textContent || '' }; }, sid);
    if (d.errors.length) r.fehler = d.errors.join(' · ');
  } finally { await d.ctx.close(); }
  const p = [];
  if (r.fehler) p.push('JS-Fehler: ' + r.fehler);
  if (waehrend !== 'date') p.push('Fokus ging beim Tippen verloren');
  if (r.start !== '2027-01-01') p.push(`gespeichert: ${r.start}`);
  if (!/1\.1\.2027/.test(r.text)) p.push(`Zeitraum-Text nicht aktualisiert: ${r.text.trim()}`);
  return p.join(' · ');
});
await scenario('Zeitplan: Punkt lässt sich verschieben (auch „Ohne Abschnitt"), falsche Zuordnung rückgängig', async () => {
  const r = await page.evaluate(async () => {
    showPage('planung');
    const m = state.meilensteine.find(x => x.id === 4003), alt = m.ganttId;
    const sel = document.querySelector('#plan-timeline .pl-item[data-item="4003"] select.pl-move');
    if (!sel) return { fehlt: true };
    sel.value = 'ohne'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    renderZeitplan();   // darf NICHT automatisch zurueckgeordnet werden
    const ohne = !!document.querySelector('#plan-timeline .pl-ohne .pl-item[data-item="4003"]');
    const sel2 = document.querySelector('#plan-timeline .pl-ohne .pl-item[data-item="4003"] select.pl-assign');
    sel2.value = '4104'; sel2.dispatchEvent(new Event('change', { bubbles: true }));
    const verschoben = String(m.ganttId) === '4104' && !!document.querySelector('#plan-timeline .pl-sec[data-sec="4104"] .pl-item[data-item="4003"]');
    m.ganttId = alt; renderZeitplan();
    // Namen nur als ganzes Wort/Wortanfang: „Bau" greift nicht bei „Baugenehmigung"
    state.gantt.push({ id: 4199, name: 'Bau', start: '', end: '' });
    state.meilensteine.push({ id: 4198, name: 'Baugenehmigung', datum: '', status: 'offen' }, { id: 4197, name: 'Dachstuhl fertig', datum: '' });
    // kaputtes Datum (z.B. von der KI) darf die Seite nicht leeren
    state.gantt.push({ id: 4196, name: 'Kaputt', start: '2026-3-5', end: '' });
    let fehler = '';
    try { renderZeitplan(); } catch (e) { fehler = e.message; }
    const bau = state.meilensteine.find(x => x.id === 4198).ganttId, dach = state.meilensteine.find(x => x.id === 4197).ganttId;
    state.meilensteine = state.meilensteine.filter(x => x.id !== 4198 && x.id !== 4197); state.gantt = state.gantt.filter(g => g.id !== 4199 && g.id !== 4196);
    renderZeitplan();
    return { ohne, verschoben, bau, dach, fehler, karten: document.querySelectorAll('#plan-timeline .pl-sec').length };
  });
  if (r.fehlt) return 'keine Verschieben-Auswahl bei den Punkten';
  const p = [];
  if (!r.ohne) p.push('„Ohne Abschnitt" wird sofort wieder automatisch zugeordnet');
  if (!r.verschoben) p.push('Zuordnen aus „Ohne Abschnitt" klappt nicht');
  if (r.bau) p.push('„Baugenehmigung" landete im Abschnitt „Bau"');
  if (String(r.dach) !== '4102') p.push(`„Dachstuhl fertig" nicht bei „Dach" (${r.dach})`);
  if (r.fehler) p.push('Absturz bei kaputtem Datum: ' + r.fehler);
  return p.join(' · ');
});
await scenario('Bautagebuch: automatischer Wetter-Abruf überschreibt Getipptes nicht, „Abrufen" schon', async () => {
  const r = await page.evaluate(async () => {
    const altFetch = window.fetch, alt = showToast, adr = state.settings.address;
    window.fetch = async (u) => ({ json: async () => String(u).includes('geocoding') ? { results: [{ name: 'Wels', latitude: 48.16, longitude: 14.03 }] } : { current: { weathercode: 61, temperature_2m: 7.4 } } });
    showToast = () => {};
    try {
      state.settings.address = '4600 Wels';
      showPage('tagebuch'); openModal('modal-tagebuch');
      document.getElementById('tb-temp').value = '12';   // selbst eingetragen, bevor der Abruf fertig ist
      await new Promise(res => setTimeout(res, 900));
      const auto = { temp: document.getElementById('tb-temp').value, wetter: document.getElementById('tb-weather').value };
      await fetchWetter(true);
      const manuell = { temp: document.getElementById('tb-temp').value, wetter: document.getElementById('tb-weather').value };
      return { auto, manuell };
    } finally {
      window.fetch = altFetch; showToast = alt; state.settings.address = adr;
      const m = document.getElementById('modal-tagebuch'); m._dirty = false; closeModal('modal-tagebuch');
    }
  });
  const p = [];
  if (r.auto.temp !== '12') p.push(`getippte Temperatur überschrieben (${r.auto.temp})`);
  if (!/Regen/.test(r.auto.wetter)) p.push(`Wetter nicht automatisch gesetzt (${r.auto.wetter})`);
  if (r.manuell.temp !== '7.4') p.push(`„Abrufen" setzt die Temperatur nicht (${r.manuell.temp})`);
  return p.join(' · ');
});
await scenario('Budget: Ring im Datenschutz-Modus verborgen, ohne Budget kein voller Ring, Titel auf Englisch', async () => {
  const r = await page.evaluate(() => {
    showPage('budget');
    document.body.classList.add('privacy-mode');
    const ring = document.querySelector('.bg-ring'), cs = getComputedStyle(ring);
    const verborgen = /blur/.test(cs.filter) && cs.pointerEvents === 'none';
    document.body.classList.remove('privacy-mode');
    const altKat = state.budgetKat; state.budgetKat = [];
    renderBudget();
    const c = document.getElementById('bg-ring-chart')._chart;
    const ohne = { mitte: document.getElementById('bg-ring-pct').textContent, daten: c ? c.data.datasets[0].data.join(',') : '' };
    state.budgetKat = altKat;
    setLang('en', false); showPage('budget');
    const en = document.querySelector('.bg-blick .table-title').textContent + ' | ' + document.querySelector('#bg-kat-grafik .bg-zl').textContent;
    setLang('de', false); showPage('budget');
    return { verborgen, ohne, en };
  });
  const p = [];
  if (!r.verborgen) p.push('Ring zeigt Beträge im Datenschutz-Modus');
  if (r.ohne.mitte !== '–' || (r.ohne.daten && r.ohne.daten !== '0,1')) p.push(`ohne Budget: Mitte „${r.ohne.mitte}", Ring ${r.ohne.daten}`);
  if (/Budget auf einen Blick|Geplant und ausgegeben/.test(r.en)) p.push('Englisch: ' + r.en);
  return p.join(' · ');
});

await scenario('Zeitplan am Computer (dunkel): ein Punkt = eine Zeile, kompakt, keine Eingabe-Balken', async () => {
  const d = await boot({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  let r;
  try {
    r = await d.page.evaluate(() => {
      document.body.classList.add('dark-mode'); showPage('planung');
      const tl = document.getElementById('plan-timeline');
      const zeilen = [...tl.querySelectorAll('.pl-item')].map(it => {
        const mitte = el => { const b = el.getBoundingClientRect(); return b.top + b.height / 2; };
        const k = mitte(it.querySelector('.pl-stbtn')), n = mitte(it.querySelector('.pl-iname')), dt = mitte(it.querySelector('.pl-idate'));
        return Math.max(Math.abs(k - n), Math.abs(dt - n));
      });
      const bg = el => getComputedStyle(el).backgroundColor;
      const durchsichtig = [tl.querySelector('.pl-iname'), tl.querySelector('.pl-secname'), tl.querySelector('.pl-addrow input')]
        .every(el => /rgba\(0, 0, 0, 0\)|transparent/.test(bg(el)));
      return { breite: tl.getBoundingClientRect().width, versatz: Math.max(...zeilen), anzahl: zeilen.length, durchsichtig };
    });
    if (d.errors.length) r.fehler = d.errors.join(' · ');
  } finally { await d.ctx.close(); }
  const p = [];
  if (r.fehler) p.push('JS-Fehler: ' + r.fehler);
  if (r.breite > 861) p.push(`Zeitplan ${Math.round(r.breite)} px breit`);
  if (!r.anzahl || r.versatz > 10) p.push(`Status, Name und Datum nicht in einer Zeile (Versatz ${Math.round(r.versatz)} px)`);
  if (!r.durchsichtig) p.push('Eingabefelder zeigen im Dunkelmodus einen Balken');
  return p.join(' · ');
});
await scenario('Zeitplan am Handy: nichts ragt über den Rand', async () => {
  const r = await page.evaluate(() => { showPage('planung'); const tl = document.getElementById('plan-timeline');
    return [...tl.querySelectorAll('.pl-item, .pl-sechead')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > innerWidth + 1).length; });
  return r ? `${r} Zeilen ragen über den Rand` : '';
});

if (errors.length) results.push([false, 'Keine JavaScript-Fehler', errors.slice(0, 3).join(' · '), 0]);
await ctx.close();
await browser.close();

console.log('\n  PLANORY – Handy-Test (390 px, Deutsch)');
console.log('  ' + '─'.repeat(64));
let fail = 0;
for (const [ok, name, msg] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (!ok) { fail++; console.log('      → ' + msg); }
}
console.log('  ' + '─'.repeat(64));
console.log(`  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);
