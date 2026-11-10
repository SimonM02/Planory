// Baut die Planory-Website aus den Quellen in site-quelle/:
//   teile/kopf.html + teile/fuss.html  → Kopf und Fuß aller Seiten (nur einmal gepflegt)
//   seiten/<name>.html                 → Inhalt der Seite (nur <main>)
// Ergebnis:
//   index.html + www/index.html        → Startseite (zwischen <!-- WEBSITE:START --> und <!-- WEBSITE:END -->)
//   funktionen/ preise/ ueber/ hilfe/  → je eine index.html
//   impressum.html, datenschutz.html, agb.html → neuer Kopf/Fuß, Rechtstext bleibt unverändert
//     (steht zwischen <!-- RECHT:START --> und <!-- RECHT:END -->)
//   support.html                       → leitet auf /hilfe/ weiter (App-Store-Link bleibt gültig)
// Aufruf:  node site-quelle/bauen.mjs          (schreibt alles)
//          node site-quelle/bauen.mjs --check  (prüft nur, ob alles aktuell ist; Fehlercode 1 wenn nicht)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CHECK = process.argv.includes('--check');
const lies = p => readFileSync(join(ROOT, p), 'utf8');
const KOPF = readFileSync(join(HERE, 'teile/kopf.html'), 'utf8').trim();
const FUSS = readFileSync(join(HERE, 'teile/fuss.html'), 'utf8').trim();
const BASIS = 'https://planory.at';

const SEITEN = [
  { name: 'funktionen', kurz: 'Funktionen', datei: 'funktionen/index.html', pfad: '/funktionen/',
    titel: 'Funktionen – Planory, die App für dein Bauprojekt', titelEn: 'Features – Planory, the app for your building project',
    beschreibung: 'Budget, Rechnungen scannen, Angebote, Zahlungsplan, Zeitplan, Aufgaben, Bautagebuch, Pläne, Mängel, Helfer, Wartung und KI-Berater – alle Funktionen von Planory mit echten App-Bildern.' },
  { name: 'preise', kurz: 'Preise', datei: 'preise/index.html', pfad: '/preise/',
    titel: 'Preise – Planory: 30 Tage gratis, danach 3,99 € im Monat', titelEn: 'Pricing – Planory: 30 days free, then €3.99 a month',
    beschreibung: 'Ein Preis, alle Funktionen: 30 Tage gratis testen, danach 3,99 € im Monat oder 28,99 € im Jahr. Jederzeit kündbar.' },
  { name: 'ueber', kurz: 'Über Planory', datei: 'ueber/index.html', pfad: '/ueber/',
    titel: 'Über Planory – entstanden aus einem eigenen Bauprojekt', titelEn: 'About Planory – born out of a building project of our own',
    beschreibung: 'Planory ist aus einem eigenen Bauprojekt entstanden und wird in Oberösterreich entwickelt. Projektdaten in der EU, keine Werbung.' },
  { name: 'hilfe', kurz: 'Hilfe & Kontakt', datei: 'hilfe/index.html', pfad: '/hilfe/',
    titel: 'Hilfe & Kontakt – Planory', titelEn: 'Help & contact – Planory',
    beschreibung: 'Antworten auf häufige Fragen zu Planory: Projekt anlegen, Abo, Kündigung, Daten und Konto löschen – und der direkte Kontakt.' },
];
const RECHT = ['impressum.html', 'datenschutz.html', 'agb.html'];

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Kopf mit markiertem Menüpunkt der aktuellen Seite
const kopf = aktiv => KOPF.replace(new RegExp(`data-seite="${aktiv}"`, 'g'), `data-seite="${aktiv}" aria-current="page"`);

// Brotkrumen für Google (Planory › Seite) – hilft, Unterseiten in der Suche unter „Planory“ zu zeigen
const brotkrumen = (kurz, url) => kurz ? `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Planory', item: BASIS + '/' }, { '@type': 'ListItem', position: 2, name: kurz, item: url }] })}\n</script>\n` : '';
function kopfbereich({ titel, titelEn, beschreibung, url, kurz, robots = 'index,follow' }) {
  return `<!doctype html>
<html lang="de"${titelEn ? ` data-en-title="${esc(titelEn)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titel)}</title>
${beschreibung ? `<meta name="description" content="${esc(beschreibung)}">\n` : ''}<meta name="robots" content="${robots}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Planory">
<meta property="og:title" content="${esc(titel)}">
${beschreibung ? `<meta property="og:description" content="${esc(beschreibung)}">\n` : ''}<meta property="og:url" content="${url}">
<meta property="og:locale" content="de_AT">
<meta property="og:image" content="${BASIS}/og-image.png">
<meta name="theme-color" content="#f3f0e8">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/site/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site/site.css">
${brotkrumen(kurz, url)}</head>`;
}
const seite = (meta, aktiv, inhalt) => `${kopfbereich(meta)}
<body class="pl-site">
${kopf(aktiv)}
<main>
${inhalt.trim()}
</main>
${FUSS}
<script src="/site/site.js" defer></script>
</body>
</html>
`;

const ausgabe = new Map();   // Datei → neuer Inhalt

// 1) Unterseiten
for (const s of SEITEN) {
  const inhalt = readFileSync(join(HERE, `seiten/${s.name}.html`), 'utf8');
  ausgabe.set(s.datei, seite({ ...s, url: BASIS + s.pfad }, s.name, inhalt));
}

// 2) Rechtliches: Text unverändert übernehmen, nur Kopf/Fuß/Aussehen neu
for (const datei of RECHT) {
  const alt = lies(datei);
  let text;
  const m = alt.match(/<!-- RECHT:START -->\n([\s\S]*?)\n<!-- RECHT:END -->/);
  if (m) text = m[1];
  else {   // erstes Mal: alter Aufbau <div class="wrap"> Marke … Inhalt … <a class="back"> <footer>
    const a = alt.indexOf('</a>', alt.indexOf('<div class="wrap">')) + 4;
    const e = alt.indexOf('<a class="back"');
    if (a < 4 || e < 0) throw new Error(datei + ': alter Aufbau nicht erkannt');
    text = alt.slice(a, e).replace(/^\s*\n/, '').replace(/\s+$/, '');
  }
  const titel = (alt.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Planory';
  const besch = (alt.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const url = (alt.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || `${BASIS}/${datei}`;
  const kopfHtml = kopfbereich({ titel: titel.replace(/&amp;/g, '&'), beschreibung: besch.replace(/&amp;/g, '&').replace(/&quot;/g, '"'), url, kurz: titel.split(' – ')[0].replace(/&amp;/g, '&') });
  ausgabe.set(datei, `${kopfHtml}
<body class="pl-site">
${kopf('')}
<main id="inhalt" class="s-w s-recht">
<!-- RECHT:START -->
${text}
<!-- RECHT:END -->
</main>
${FUSS}
<script src="/site/site.js" defer></script>
</body>
</html>
`);
}

// 3) support.html → /hilfe/ (Support-Adresse in App Store Connect bleibt gültig)
ausgabe.set('support.html', `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hilfe & Kontakt – Planory</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${BASIS}/hilfe/">
<meta http-equiv="refresh" content="0; url=/hilfe/">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body>
<p>Weiter zu <a href="/hilfe/">Hilfe &amp; Kontakt</a></p>
<script>location.replace('/hilfe/' + location.hash);</script>
</body>
</html>
`);

// 4) Startseite in index.html (+ www/index.html, byte-gleich)
{
  const html = lies('index.html');
  const A = '<!-- WEBSITE:START -->', E = '<!-- WEBSITE:END -->';
  const i = html.indexOf(A), j = html.indexOf(E);
  if (i < 0 || j < i) throw new Error('index.html: Markierungen WEBSITE:START/END fehlen');
  const start = readFileSync(join(HERE, 'seiten/start.html'), 'utf8').trim();
  const block = `${A}\n${kopf('start')}\n<main>\n${start}\n</main>\n${FUSS}\n${E}`;
  const neu = html.slice(0, i) + block + html.slice(j + E.length);
  ausgabe.set('index.html', neu);
  ausgabe.set('www/index.html', neu);
}

// Schreiben bzw. prüfen
let veraltet = [];
for (const [datei, inhalt] of ausgabe) {
  const pfad = join(ROOT, datei);
  const alt = existsSync(pfad) ? readFileSync(pfad, 'utf8') : null;
  if (alt === inhalt) continue;
  if (CHECK) { veraltet.push(datei); continue; }
  mkdirSync(dirname(pfad), { recursive: true });
  writeFileSync(pfad, inhalt);
  console.log('geschrieben:', datei);
}
if (CHECK) {
  if (veraltet.length) { console.log('Website nicht aktuell – bitte `node site-quelle/bauen.mjs` ausführen:', veraltet.join(', ')); process.exit(1); }
  console.log('Website aktuell.');
}
