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
// Nicht als file:// oeffnen (startet eine leere Vorschau) – echte Adresse + Demo-Parameter
const URL_DEMO = 'https://planory.test/index.html?demo=planory2025';

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});

async function boot() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true,
    hasTouch: true, locale: 'de-AT', timezoneId: 'Europe/Vienna', serviceWorkers: 'block' });
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
await scenario('Bearbeiten ohne Änderung: Eigenleistung-Kategorie, Brutto 99,99 €, leeres Aufgaben-Datum bleiben', async () => {
  const r = await page.evaluate(async () => {
    const kat2 = state.budgetKat[1].name;
    state.eigenleistungen = state.eigenleistungen || [];
    state.eigenleistungen.push({ id: 9800010, datum: '2026-09-01', beschr: 'Schlitze', kat: kat2, wert: 450, von: '', notiz: '' });
    editEigenleistung(9800010); addEigenleistung();
    state.kosten.push({ id: 9800011, datum: '2026-10-01', beschr: 'Cent-Test', kat: state.budgetKat[0].name, mwst: 20, netto: 83.33, betrag: 99.99, status: 'Bezahlt', anbieter: '', _updatedAt: 1 });
    editKosten(9800011); await saveKosten();
    state.aufgaben.push({ id: 9800012, name: 'Ohne Termin', prio: 'Mittel', status: 'Offen', datum: '', notiz: '' });
    editTask(9800012); await saveTask();
    return { kat: state.eigenleistungen.find(e => e.id === 9800010).kat, kat2, betrag: state.kosten.find(k => k.id === 9800011).betrag,
             datum: state.aufgaben.find(t => t.id === 9800012).datum };
  });
  const p = [];
  if (r.kat !== r.kat2) p.push(`Eigenleistung-Kategorie wurde „${r.kat}"`);
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
