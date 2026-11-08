// App-Bilder für die Website (Demo-Projekt „Musterhaus Graz“, keine Kundendaten).
// Aufruf: node site-quelle/screens.mjs [nur-name …]  → site/img/<name>-de.webp und -en.webp
// iPhone-Bilder 390×844 @2x, dazu ein Web-Bild (1440×900) für „iPhone & Web“.
// Die App läuft unter einem Test-Hostnamen (nie file://), Supabase ist nachgebildet.
const { chromium } = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default;
import { readFileSync, mkdirSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = HERE + '/..';
const HTML = readFileSync(ROOT + '/index.html', 'utf8');
const CHART = readFileSync(ROOT + '/node_modules/chart.js/dist/chart.umd.js', 'utf8');
const OUT = ROOT + '/site/img';
mkdirSync(OUT, { recursive: true });
const NUR = process.argv.slice(2);

// name, Aktion in der App, Optionen (scroll = Pixel oder CSS-Selektor, der oben unter der Leiste stehen soll; el = nur dieses Element)
const SHOTS = [
  ['start', () => showPage('dashboard')],
  ['budget', () => showPage('budget')],
  ['kosten', () => showPage('kostenchart')],
  ['scan', () => { showPage('dashboard'); openModal('modal-rechnung-scan'); _scanBeispiel(); }, { modal: '#modal-rechnung-scan .modal' }],
  ['angebote', () => showPage('angebote'), { scroll: '#page-angebote .chart-tabs' }],
  ['zahlungsplan', () => showPage('zahlungsplan'), { scroll: '#zp-timeline' }],
  ['zeitplan', () => showPage('meilensteine')],
  ['aufgaben', () => showPage('aufgaben')],
  ['tagebuch', () => showPage('tagebuch')],
  ['plaene', () => showPage('grundrisse'), { scroll: '#gr-tabs' }],
  ['dokumente', () => showPage('dokumente'), { scroll: '#datei-list > .card:nth-last-child(2)' }],
  ['maengel', () => showPage('maengel'), { scroll: '#page-maengel .chart-tabs' }],
  ['helfer', () => showPage('helfer'), { scroll: '#helfer-cal' }],
  ['wartung', () => showPage('wartung'), { scroll: '#wartung-list' }],
  ['ki', () => { showPage('dashboard'); }, { el: '#ki-advisor-panel' }],
];

const b = await chromium.launch({ args: ['--lang=de-AT'] });
async function lauf(lang, web) {
  const ctx = await b.newContext(web
    ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: lang === 'de' ? 'de-AT' : 'en-GB', timezoneId: 'Europe/Vienna', colorScheme: 'light' }
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: lang === 'de' ? 'de-AT' : 'en-GB', timezoneId: 'Europe/Vienna', colorScheme: 'light' });
  const p = await ctx.newPage();
  await p.addInitScript(l => { localStorage.setItem('planoryLang', l); localStorage.setItem('dsgvoAccepted', '1'); localStorage.setItem('planory_ki_hinweis', '1');
    const q = () => { const o = { select(){return o}, eq(){return o}, in(){return o}, order(){return o}, maybeSingle(){return o}, single(){return o}, insert(){return o}, update(){return o}, upsert(){return o}, delete(){return o}, then(r){ return Promise.resolve({ data: null, error: null }).then(r); } }; return o; };
    window.supabase = { createClient: () => ({ from: q, auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; } }, channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; }, removeChannel(){}, storage: { from(){ return {}; } } }) }; }, lang);
  await p.route('**/*', r => { const u = r.request().url();
    if (u.startsWith('https://planory.test/index.html')) return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HTML });
    if (u.includes('chart.umd')) return r.fulfill({ status: 200, contentType: 'application/javascript', body: CHART });
    if (u.includes('fonts.g')) return r.continue();
    return r.abort(); });
  await p.goto('https://planory.test/index.html?demo=planory2025');
  await p.waitForFunction(() => typeof _demoMode !== 'undefined' && _demoMode && state.kosten.length > 0);
  await p.evaluate(() => {
    const bn = document.getElementById('demo-banner'); if (bn) bn.style.display = 'none';
    document.body.classList.remove('demo-aktiv'); document.body.style.removeProperty('--demo-h');
    const sb = document.querySelector('.sidebar'); if (sb) sb.style.top = ''; const m = document.querySelector('.main'); if (m) m.style.paddingTop = '';
    Object.keys(PAGE_HINTS || {}).forEach(k => _seenHints.add(k));
    window.showToast = () => {};
    // Demo-Daten (um Sept. 2025 gebaut) auf „jetzt“ verschieben
    const tage = Math.round((Date.now() - Date.parse('2025-09-10')) / 86400000);
    const schieb = v => { const d = new Date(v + 'T12:00:00'); d.setDate(d.getDate() + tage); return d.toISOString().slice(0, 10); };
    const lauf = o => { if (Array.isArray(o)) o.forEach((x, i) => { if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) o[i] = schieb(x); else if (x && typeof x === 'object') lauf(x); });
      else if (o && typeof o === 'object') for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) o[k] = schieb(v); else if (v && typeof v === 'object') lauf(v); } };
    const auf = state.aufgaben; state.aufgaben = []; lauf(state); state.aufgaben = auf;

    // ── Beispieldaten für Seiten, die im Demo sonst leer sind (alles erfunden, nur lokal im Browser) ──
    const tag = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

    state.angebote = [
      { id: 9101, datum: tag(-62), gueltig: tag(-32), beschr: 'Dacheindeckung Tondachziegel', anbieter: 'Dachdeckerei Berger', kat: 'Dach', betrag: 17000, status: 'Angenommen', notiz: 'inkl. Spenglerarbeiten' },
      { id: 9102, datum: tag(-48), gueltig: tag(-18), beschr: 'Elektroinstallation komplett', anbieter: 'Elektro Gruber', kat: 'Elektro', betrag: 29800, status: 'Angenommen', notiz: 'inkl. Netzwerk & Smart-Home-Vorbereitung' },
      { id: 9103, datum: tag(-41), gueltig: tag(-11), beschr: 'Fenster & Hebeschiebetür Holz-Alu', anbieter: 'Fenster Huber GmbH', kat: 'Innenausbau', betrag: 38400, status: 'Angenommen', notiz: '3-fach verglast, inkl. Montage' },
      { id: 9104, datum: tag(-39), gueltig: tag(-9), beschr: 'Fenster Kunststoff (Vergleich)', anbieter: 'Fensterbau Lechner', kat: 'Innenausbau', betrag: 31900, status: 'Abgelehnt', notiz: 'günstiger, aber längere Lieferzeit' },
      { id: 9105, datum: tag(-12), gueltig: tag(18), beschr: 'Estrich EG + OG', anbieter: 'Estrich Wagner GmbH', kat: 'Innenausbau', betrag: 11200, status: 'In Verhandlung', notiz: 'Skonto 3 % angefragt' },
      { id: 9106, datum: tag(-6), gueltig: tag(24), beschr: 'Fliesen Bad & WC', anbieter: 'Fliesen Pichler', kat: 'Innenausbau', betrag: 9850, status: 'Ausstehend', notiz: 'Feinsteinzeug 60×120' },
      { id: 9107, datum: tag(-3), gueltig: tag(27), beschr: 'Parkett Eiche geölt', anbieter: 'Bodenleger Hofer', kat: 'Innenausbau', betrag: 14600, status: 'Ausstehend', notiz: 'ca. 118 m², Landhausdiele' },
    ];

    state.zahlungen = [
      { id: 9201, beschr: 'Schlussrate Dach', kat: 'Dach', anbieter: 'Dachdeckerei Berger', faellig: tag(-9), betrag: 17000, status: 'Bezahlt', bezahltDatum: tag(-11), notiz: '' },
      { id: 9202, beschr: 'Restzahlung Fenster', kat: 'Innenausbau', anbieter: 'Fenster Huber GmbH', faellig: tag(3), betrag: 26880, status: 'Offen', bezahltDatum: '', notiz: '2 % Skonto' },
      { id: 9203, beschr: '2. Rate Elektro', kat: 'Elektro', anbieter: 'Elektro Gruber', faellig: tag(12), betrag: 7500, status: 'Offen', bezahltDatum: '', notiz: '' },
      { id: 9204, beschr: '1. Rate Sanitär', kat: 'Sanitär', anbieter: 'Haustechnik Steiner GmbH', faellig: tag(21), betrag: 10000, status: 'Offen', bezahltDatum: '', notiz: '' },
      { id: 9205, beschr: 'Estrich EG + OG', kat: 'Innenausbau', anbieter: 'Estrich Wagner GmbH', faellig: tag(38), betrag: 11200, status: 'Offen', bezahltDatum: '', notiz: 'nach Abnahme' },
    ];

    state.tagebuch = [
      { id: 9301, datum: tag(-9), datumBis: null, title: 'Baubesprechung mit dem Bauleiter', text: 'Termine für Estrich und Installateur fixiert. Estrich voraussichtlich in drei Wochen, vorher Abnahme der Rohinstallation.', weather: '⛅ Bewölkt', temp: 10, workers: [], tags: ['Besprechung'], fotos: [] },
      { id: 9302, datum: tag(-7), datumBis: null, title: 'Dachrinnen & Spenglerarbeiten', text: 'Dachdeckerei Berger hat Dachrinnen, Fallrohre und Kaminverblechung montiert. Dach ist jetzt komplett dicht.', weather: '☀️ Sonnig', temp: 11, workers: [{ name: 'Dachdeckerei Berger', hours: 14 }], tags: ['Dach'], fotos: [] },
      { id: 9303, datum: tag(-4), datumBis: null, title: 'Fenster im EG eingebaut', text: '7 Fenster und die Hebeschiebetür sind drin. Anschlussfugen werden nächste Woche abgedichtet. Kleiner Kratzer am Küchenfenster – als Mangel erfasst.', weather: '🌧️ Regen', temp: 7, workers: [{ name: 'Fenster Huber GmbH', hours: 24 }], tags: ['Fenster', 'Mangel'], fotos: [] },
      { id: 9304, datum: tag(-2), datumBis: null, title: 'Elektro-Rohinstallation OG fertig', text: 'Alle Leerrohre und Dosen im OG gesetzt. Schlitze mit dem Bauleiter kontrolliert – passt so.', weather: '☀️ Sonnig', temp: 12, workers: [{ name: 'Elektro Gruber', hours: 16 }, { name: 'Bauleiter', hours: 2 }], tags: ['Elektro', 'Abnahme'], fotos: [] },
      { id: 9305, datum: tag(-1), datumBis: null, title: 'Helfertag: Dämmung Dachboden', text: 'Mineralwolle im Dachboden verlegt und Dampfbremse vorbereitet. Material für nächste Woche ist bestellt.', weather: '⛅ Bewölkt', temp: 9, workers: [{ name: 'Lukas', hours: 8 }, { name: 'Onkel Franz', hours: 8 }, { name: 'Martin', hours: 5 }], tags: ['Dach', 'Helfer'], fotos: [] },
    ];

    state.maengel = [
      { id: 9401, titel: 'Dachrinne tropft an der Verbindung', gewerk: 'Dach', raum: 'Nordseite, über dem Eingang', beschr: 'Bei Regen tropft es an der Rinnenverbindung. Dichtung prüfen lassen.', prio: 'Hoch', status: 'In Bearbeitung', datum: tag(-6), behobenDatum: '', zustaendig: 'Dachdeckerei Berger', fotos: [] },
      { id: 9402, titel: 'Leerrohr verstopft', gewerk: 'Elektro', raum: 'Wohnzimmer', beschr: 'Netzwerkkabel lässt sich nicht einziehen – Leerrohr vermutlich geknickt.', prio: 'Hoch', status: 'Offen', datum: tag(-2), behobenDatum: '', zustaendig: 'Elektro Gruber', fotos: [] },
      { id: 9403, titel: 'Kratzer am Küchenfenster', gewerk: 'Fenster & Türen', raum: 'Küche', beschr: 'Rahmen außen beim Einbau beschädigt, ca. 4 cm lang.', prio: 'Mittel', status: 'Offen', datum: tag(-4), behobenDatum: '', zustaendig: 'Fenster Huber GmbH', fotos: [] },
      { id: 9404, titel: 'Haarriss im Innenputz', gewerk: 'Innenausbau', raum: 'Stiegenhaus EG', beschr: 'Ca. 40 cm über der Tür. Vor dem Ausmalen verspachteln.', prio: 'Niedrig', status: 'Offen', datum: tag(-12), behobenDatum: '', zustaendig: 'Baumeister Müller GmbH', fotos: [] },
      { id: 9405, titel: 'Abflussrohr ohne Gefälle', gewerk: 'Sanitär', raum: 'Technikraum', beschr: 'Rohr neu abgehängt, Gefälle jetzt in Ordnung.', prio: 'Mittel', status: 'Behoben', datum: tag(-20), behobenDatum: tag(-15), zustaendig: 'Haustechnik Steiner GmbH', fotos: [] },
    ];

    // Helfer-Tage rund um die nächsten Samstage
    const sa = ((6 - new Date().getDay() + 7) % 7) || 7;
    state.helfer = [
      { id: 9501, name: 'Lukas', tel: '', notiz: 'kann gut fliesen' },
      { id: 9502, name: 'Onkel Franz', tel: '', notiz: 'hat einen Anhänger' },
      { id: 9503, name: 'Martin', tel: '', notiz: 'Nachbar' },
      { id: 9504, name: 'Stefan', tel: '', notiz: '' },
      { id: 9505, name: 'Julia', tel: '', notiz: '' },
    ];
    state.helfereinsaetze = [
      { id: 9511, datum: tag(sa - 7), bedarf: 3, umfang: 'full', zugewiesen: ['Lukas', 'Onkel Franz', 'Martin'], stunden: { Martin: 5 }, remind: '7', notiz: 'Dämmung Dachboden' },
      { id: 9512, datum: tag(sa), bedarf: 4, umfang: 'full', zugewiesen: ['Lukas', 'Stefan', 'Onkel Franz'], stunden: {}, remind: '7', notiz: 'Dampfbremse & Lattung Dachboden' },
      { id: 9513, datum: tag(sa + 4), bedarf: 2, umfang: 'half', zugewiesen: ['Martin', 'Julia'], stunden: {}, remind: '3', notiz: 'Baustelle aufräumen, Schutt wegbringen' },
      { id: 9514, datum: tag(sa + 7), bedarf: 3, umfang: 'full', zugewiesen: ['Lukas'], stunden: {}, remind: '7', notiz: 'Vorbereitung Estrich: Randdämmstreifen' },
    ];

    state.wartungen = [
      { id: 9601, name: 'Filter Wohnraumlüftung tauschen', kat: '📋 Sonstiges', desc: 'Zu- und Abluftfilter am Lüftungsgerät wechseln', intervall: 6, einheit: 'Monate', next: tag(-3), remind: '7', who: 'selbst', kosten: 65 },
      { id: 9602, name: 'Wärmepumpe – Jahresservice', kat: '🔥 Heizung', desc: 'Kältekreis prüfen, Filter reinigen, Fehlerspeicher auslesen', intervall: 1, einheit: 'Jahre', next: tag(12), remind: '14', who: 'Haustechnik Steiner GmbH', kosten: 280 },
      { id: 9603, name: 'Dachrinnen reinigen', kat: '🏠 Dach & Fassade', desc: 'Laub entfernen, Fallrohre durchspülen', intervall: 1, einheit: 'Jahre', next: tag(20), remind: '7', who: 'Dachdeckerei Berger', kosten: 180 },
      { id: 9604, name: 'Rauchmelder testen', kat: '🔑 Sicherheit', desc: 'Prüftaste drücken, Batterien kontrollieren', intervall: 1, einheit: 'Jahre', next: tag(26), remind: '3', who: 'selbst', kosten: 0 },
      { id: 9605, name: 'Wasserfilter rückspülen', kat: '💧 Wasser', desc: '', intervall: 6, einheit: 'Monate', next: tag(48), remind: '3', who: 'selbst', kosten: 0 },
      { id: 9606, name: 'FI-Schutzschalter prüfen', kat: '⚡ Elektro', desc: 'Prüftaste am Verteiler drücken', intervall: 6, einheit: 'Monate', next: tag(64), remind: '3', who: 'selbst', kosten: 0 },
      { id: 9607, name: 'Fensterbeschläge ölen', kat: '🪟 Fenster & Türen', desc: 'Beschläge reinigen und ölen, Dichtungen pflegen', intervall: 1, einheit: 'Jahre', next: tag(140), remind: '7', who: 'selbst', kosten: 0 },
    ];

    // Grundriss Erdgeschoss als schlichte SVG-Zeichnung (10,00 × 12,50 m)
    const wand = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const fenster = (x, y, l, v) => v
      ? `<rect x="${x - 6}" y="${y}" width="12" height="${l}" fill="#fff" stroke="#1e293b" stroke-width="1.5"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y + l}" stroke="#60a5fa" stroke-width="2.5"/>`
      : `<rect x="${x}" y="${y - 6}" width="${l}" height="12" fill="#fff" stroke="#1e293b" stroke-width="1.5"/><line x1="${x}" y1="${y}" x2="${x + l}" y2="${y}" stroke="#60a5fa" stroke-width="2.5"/>`;
    const raum = (x, y, n, m2) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="19" font-weight="700" fill="#1e293b">${n}</text><text x="${x}" y="${y + 20}" text-anchor="middle" font-size="14" fill="#64748b">${m2}</text>`;
    const stufen = Array.from({ length: 9 }, (_, i) => wand(66 + i * 16, 337, 66 + i * 16, 393)).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="780" viewBox="0 0 620 780" font-family="Helvetica, Arial, sans-serif">
      <defs><pattern id="r" width="27" height="27" patternUnits="userSpaceOnUse"><path d="M27 0H0V27" fill="none" stroke="#eef2f7" stroke-width="1"/></pattern></defs>
      <rect width="620" height="780" fill="#fff"/><rect x="40" y="70" width="540" height="675" fill="url(#r)"/>
      <g fill="#eef2f7" stroke="#94a3b8" stroke-width="1.5">
        <rect x="60" y="118" width="40" height="150" rx="6"/><rect x="60" y="228" width="130" height="40" rx="6"/><rect x="122" y="150" width="56" height="48" rx="4"/>
        <rect x="222" y="150" width="88" height="120" rx="6"/><circle cx="207" cy="182" r="10"/><circle cx="207" cy="238" r="10"/><circle cx="325" cy="182" r="10"/><circle cx="325" cy="238" r="10"/>
        <rect x="380" y="80" width="190" height="34" /><rect x="536" y="114" width="34" height="186"/><rect x="400" y="198" width="92" height="44" rx="4"/>
        <rect x="52" y="412" width="56" height="40" rx="3"/><circle cx="168" cy="434" r="20"/>
        <rect x="50" y="550" width="70" height="70"/><rect x="138" y="550" width="52" height="30" rx="4"/><ellipse cx="172" cy="716" rx="13" ry="18"/>
        <rect x="462" y="410" width="106" height="44" rx="3"/><circle cx="515" cy="474" r="12"/>
        <rect x="372" y="590" width="196" height="26"/><rect x="206" y="664" width="28" height="74"/>
      </g>
      <g fill="none" stroke="#94a3b8" stroke-width="1.5">
        <circle cx="430" cy="97" r="9"/><circle cx="420" cy="214" r="6"/><circle cx="440" cy="214" r="6"/><circle cx="420" cy="230" r="6"/><circle cx="440" cy="230" r="6"/>
        <path d="M50 550 L120 620 M120 550 L50 620"/><ellipse cx="164" cy="565" rx="14" ry="9"/>
      </g>
      <rect x="50" y="335" width="160" height="60" fill="#fff" stroke="#64748b" stroke-width="1.5"/>
      <g stroke="#94a3b8" stroke-width="1.2">${stufen}</g>
      <path d="M60 365 H196 M186 358 L198 365 L186 372" fill="none" stroke="#475569" stroke-width="1.8"/>
      <g stroke="#1e293b" stroke-width="6" stroke-linecap="square">
        ${wand(40, 400, 230, 400)}${wand(330, 400, 580, 400)}
        ${wand(200, 400, 200, 430)}${wand(200, 480, 200, 600)}${wand(200, 650, 200, 745)}${wand(40, 540, 200, 540)}
        ${wand(360, 300, 360, 430)}${wand(360, 480, 360, 620)}${wand(360, 670, 360, 745)}${wand(360, 580, 580, 580)}
      </g>
      <rect x="40" y="70" width="540" height="675" fill="none" stroke="#1e293b" stroke-width="12"/>
      <rect x="250" y="738" width="60" height="14" fill="#fff"/>
      <g fill="none" stroke="#64748b" stroke-width="1.5">
        <path d="M200 430 L150 430 A50 50 0 0 0 200 480"/><path d="M200 600 L150 600 A50 50 0 0 0 200 650"/>
        <path d="M360 430 L410 430 A50 50 0 0 1 360 480"/><path d="M360 620 L410 620 A50 50 0 0 1 360 670"/>
        <path d="M250 745 L250 685 A60 60 0 0 1 310 745"/>
      </g>
      ${fenster(80, 70, 110)}${fenster(230, 70, 100)}${fenster(410, 70, 110)}
      ${fenster(40, 120, 160, 1)}${fenster(40, 440, 60, 1)}${fenster(40, 610, 70, 1)}
      ${fenster(580, 150, 110, 1)}${fenster(580, 430, 110, 1)}
      ${raum(282, 305, 'Wohnen / Essen', '38,4 m²')}${raum(462, 312, 'Küche', '16,2 m²')}
      ${raum(122, 492, 'Technik', '7,7 m²')}${raum(124, 660, 'Bad / WC', '11,2 m²')}
      ${raum(280, 540, 'Diele', '18,9 m²')}${raum(470, 515, 'Büro', '13,6 m²')}${raum(470, 672, 'Abstellraum', '12,5 m²')}
      <g stroke="#94a3b8" stroke-width="1.2"><line x1="40" y1="42" x2="580" y2="42"/><line x1="40" y1="34" x2="40" y2="50"/><line x1="580" y1="34" x2="580" y2="50"/></g>
      <rect x="270" y="30" width="80" height="22" fill="#fff"/><text x="310" y="47" text-anchor="middle" font-size="15" fill="#64748b">10,00 m</text>
      <text x="280" y="772" text-anchor="middle" font-size="13" fill="#64748b">Eingang</text>
    </svg>`;
    const bild = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const pin = (id, typ, x, y, titel, notiz, n) => ({ id, typ, x: x / 620, y: y / 780, titel, notiz, datum: tag(n), fotos: [] });
    state.grundrisse = [
      { id: 9701, name: 'Erdgeschoss', bild, bildPath: null, pins: [
        pin(9711, 'Elektro', 178, 520, 'Zählerkasten & Verteiler', 'Hauptschalter oben links, FI daneben', -30),
        pin(9712, 'Heizung', 80, 432, 'Wärmepumpe Innengerät', 'Vorlauf/Rücklauf Fußbodenheizung', -24),
        pin(9713, 'Wasser', 72, 712, 'Hauptabsperrhahn', 'hinter der Revisionsklappe', -24),
        pin(9714, 'Internet/TV', 150, 96, 'Netzwerk- & TV-Dose', 'Leerrohr zum Technikraum', -2),
        pin(9715, 'Lüftung', 330, 118, 'Zuluft Wohnraumlüftung', 'Deckenauslass', -16),
        pin(9716, 'Elektro', 446, 220, 'Steckdosen Kochinsel', 'Leerrohr im Boden, 2× 230 V', -9),
      ] },
      { id: 9702, name: 'Obergeschoss', bild: null, bildPath: null, pins: [] },
    ];

    state.dateien = [
      { id: 9801, name: 'Baubewilligung_Bescheid.pdf', type: 'application/pdf', size: 1258291, kat: 'Genehmigung', datum: tag(-240), storage: 'demo/1.pdf' },
      { id: 9802, name: 'Einreichplan_Musterhaus.pdf', type: 'application/pdf', size: 4718592, kat: 'Bauplan', datum: tag(-230), storage: 'demo/2.pdf' },
      { id: 9803, name: 'Werkvertrag_Baumeister.pdf', type: 'application/pdf', size: 880640, kat: 'Vertrag', datum: tag(-200), storage: 'demo/3.pdf' },
      { id: 9804, name: 'Energieausweis.pdf', type: 'application/pdf', size: 655360, kat: 'Genehmigung', datum: tag(-120), storage: 'demo/4.pdf' },
      { id: 9805, name: 'Angebot_Fenster_Huber.pdf', type: 'application/pdf', size: 389120, kat: 'Kostenvoranschlag', datum: tag(-41), storage: 'demo/5.pdf' },
      { id: 9806, name: 'Elektroplan_EG_OG.pdf', type: 'application/pdf', size: 1887437, kat: 'Bauplan', datum: tag(-14), storage: 'demo/6.pdf' },
      { id: 9807, name: 'Abnahme_Fenster.jpg', type: 'image/jpeg', size: 2202010, kat: 'Foto', datum: tag(-4), storage: 'demo/7.jpg' },
    ];
    state.notizen = [
      { id: 9851, title: 'Fragen an den Installateur', text: '• Außenwasserhahn Terrasse – wo genau?\n• Fußbodenheizung im Abstellraum nötig?\n• Zirkulationsleitung ja oder nein?', ergebnis: '', color: '#dbeafe', datum: tag(-9) },
      { id: 9852, title: 'Estrich – Trocknungszeit', text: 'Belegreif erst nach ca. 4–6 Wochen. Vor dem Parkettverlegen CM-Messung machen lassen!', ergebnis: 'Messung übernimmt der Bodenleger.', color: '#fef9c3', datum: tag(-5) },
      { id: 9853, title: 'Farben Innenräume', text: 'Wohnen: Kalkweiß\nSchlafzimmer: Salbeigrün\nBad: Fliesen grau 60×120', ergebnis: '', color: '#dcfce7', datum: tag(-2) },
    ];
    // Beispiel-Ergebnis einer gescannten Rechnung (wie in marketing/serie/screens.mjs)
    window._scanBeispiel = () => {
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      document.getElementById('scan-upload-area').style.display = 'none';
      const pv = document.getElementById('scan-preview'); if (pv) pv.style.display = 'none';
      document.getElementById('scan-loading').style.display = 'none';
      document.getElementById('scan-result').style.display = 'block';
      document.getElementById('scan-confirm-btn').style.display = 'inline-flex';
      set('scan-beschr', 'Sanitär Rohinstallation'); set('scan-anbieter', 'Installateur Muster GmbH');
      const sd = document.getElementById('scan-datum'), j = new Date(); sd.value = sd.type === 'date' ? j.toISOString().slice(0, 10) : `${j.getDate()}.${j.getMonth() + 1}.${j.getFullYear()}`;
      set('scan-netto', 16666.67); set('scan-brutto', 20000);
      const k = document.getElementById('scan-kat'); const o = [...k.options].find(x => /Sanit/i.test(x.textContent)) || k.options[1]; if (o) k.value = o.value;
    };
  });
  const tidy = () => p.evaluate(() => {
    document.querySelectorAll('[id^="page-hint-"], .erinnerung').forEach(e => e.remove());
    document.querySelectorAll('input[type=date]').forEach(i => { if (!i.value) { i.type = 'text'; i.placeholder = ''; return; } const [y, m, d] = i.value.split('-'); i.type = 'text'; i.value = `${+d}.${+m}.${y}`; });
  });
  const speichern = (png, name) => {
    const ziel = `${OUT}/${name}-${lang}.webp`;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '86', '-compression_level', '6', ziel]);
    unlinkSync(png); console.log('✓', name, lang);
  };
  if (web) {
    if (NUR.length && !NUR.includes('web')) { await ctx.close(); return; }
    await p.evaluate(() => showPage('dashboard')); await p.waitForTimeout(1200); await tidy();
    await p.screenshot({ path: '/tmp/pl-web.png' }); speichern('/tmp/pl-web.png', 'web');
    await ctx.close(); return;
  }
  for (const [name, fn, opt = {}] of SHOTS) {
    if (NUR.length && !NUR.includes(name)) continue;
    await p.evaluate(() => { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });
    await p.evaluate(fn); await p.waitForTimeout(1100); await tidy();
    await p.evaluate(s => {
      if (typeof s !== 'string') return window.scrollTo(0, s || 0);
      const e = document.querySelector(s); if (!e) return;
      const leiste = document.getElementById('mobile-topbar'), unten = leiste ? leiste.getBoundingClientRect().bottom : 0;
      window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - unten - 14);
    }, opt.scroll);
    await p.waitForTimeout(250);
    if (opt.el) { await p.locator(opt.el).first().scrollIntoViewIfNeeded(); await p.locator(opt.el).first().screenshot({ path: '/tmp/pl-shot.png' }); }
    else await p.screenshot({ path: '/tmp/pl-shot.png' });
    speichern('/tmp/pl-shot.png', name);
  }
  await ctx.close();
}
for (const lang of ['de', 'en']) { await lauf(lang, false); await lauf(lang, true); }
await b.close();
