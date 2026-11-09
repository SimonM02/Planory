// Website-Test: alle Seiten der neuen Website in einem echten Browser (lokaler Server, nie file://).
// Prüft je Seite am Handy (390 px) und am Computer (1440 px):
//   kein Querscroll · alle Bilder laden · alle internen Links führen zu einer Datei · keine JS-Fehler ·
//   keine Emojis · Englisch vollständig (Unterseiten) · Google bekommt Deutsch.
// Außerdem: support.html leitet auf /hilfe/ weiter, „Kostenlos starten“ auf einer Unterseite öffnet
// in der App direkt das Registrieren, „Anmelden“ das Login.
// Aufruf: node tests/website.mjs
import http from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { chromium } = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYP = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'application/javascript', webp: 'image/webp', png: 'image/png', svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2', json: 'application/json', xml: 'application/xml', txt: 'text/plain' };
function datei(urlPfad) {
  let p = decodeURIComponent(urlPfad.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  return f.startsWith(ROOT) && existsSync(f) && statSync(f).isFile() ? f : null;
}
const server = http.createServer((req, res) => {
  const f = datei(req.url);
  if (!f) { res.writeHead(404); return res.end('nicht gefunden'); }
  res.writeHead(200, { 'Content-Type': TYP[f.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASIS = `http://localhost:${server.address().port}`;

const SUPA = () => {
  window.supabase = { createClient: () => ({ from: () => { const o = { select() { return o; }, eq() { return o; }, maybeSingle: async () => ({ data: null }), then(r) { return Promise.resolve({ data: null, error: null }).then(r); } }; return o; },
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
    channel() { const k = { on() { return k; }, subscribe() { return k; } }; return k; }, removeChannel() {}, storage: { from() { return {}; } } }) };
};
const browser = await chromium.launch();
const results = [];
async function scenario(name, fn) {
  try { const msg = await fn(); results.push([!msg, name, msg]); }
  catch (e) { results.push([false, name, e.message.split('\n')[0]]); }
}
async function neu({ breite = 1440, lang = 'de', ua } = {}) {
  const c = await browser.newContext({ viewport: { width: breite, height: 900 }, locale: lang === 'de' ? 'de-AT' : 'en-GB', serviceWorkers: 'block', ...(ua ? { userAgent: ua } : {}) });
  await c.addInitScript(SUPA);
  await c.route(/^https?:\/\/(?!localhost)/, r => r.abort());   // nichts aus dem Internet (Google Fonts, Supabase …)
  return c;
}

const UNTERSEITEN = ['/funktionen/', '/preise/', '/ueber/', '/hilfe/', '/impressum.html', '/datenschutz.html', '/agb.html'];
const linkCache = new Map();

for (const breite of [390, 1440]) {
  for (const seite of UNTERSEITEN) {
    await scenario(`${seite} (${breite} px): Aufbau, Bilder, Links, Englisch`, async () => {
      const c = await neu({ breite });
      try {
        const p = await c.newPage();
        const fehler = []; p.on('pageerror', e => fehler.push(e.message));
        await p.goto(BASIS + seite, { waitUntil: 'load' });
        const r = await p.evaluate(async () => {
          document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; });
          await new Promise(res => setTimeout(res, 800));
          await document.fonts.ready;
          const zuBreit = document.documentElement.scrollWidth - innerWidth;
          const raus = [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).map(e => e.className || e.tagName).slice(0, 3);
          const bilder = [...document.images].filter(i => !(i.naturalWidth > 0) || !i.hasAttribute('alt')).map(i => i.getAttribute('src'));
          const links = [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href'));
          const emoji = (document.body.innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []);
          const kopf = !!document.querySelector('.s-kopf') && !!document.querySelector('.s-fuss');
          const schrift = getComputedStyle(document.querySelector('h1')).fontFamily;
          const aktiv = [...document.querySelectorAll('.s-links a[aria-current=page]')].map(a => a.getAttribute('href'));
          return { zuBreit, raus, bilder, links, emoji, kopf, schrift, aktiv, lang: document.documentElement.lang };
        });
        const f = [];
        if (r.zuBreit > 0 || r.raus.length) f.push(`ragt über den Rand (${r.zuBreit}px: ${r.raus.join(', ')})`);
        if (r.bilder.length) f.push('Bilder fehlen/ohne alt: ' + r.bilder.join(', '));
        if (r.emoji.length) f.push('Emojis: ' + r.emoji.slice(0, 5).join(' '));
        if (!r.kopf) f.push('Kopf oder Fuß fehlt');
        if (!/PL Archivo/.test(r.schrift)) f.push('eigene Schrift fehlt: ' + r.schrift);
        if (r.lang !== 'de') f.push('Sprache ' + r.lang);
        if (!seite.endsWith('.html') && !(r.aktiv.length === 1 && r.aktiv[0] === seite)) f.push('Menüpunkt nicht markiert: ' + JSON.stringify(r.aktiv));
        for (const l of new Set(r.links)) {
          const ziel = l.split('?')[0].split('#')[0] || '/';
          if (!linkCache.has(ziel)) linkCache.set(ziel, !!datei(ziel));
          if (!linkCache.get(ziel)) f.push('toter Link: ' + l);
        }
        // Englisch (Rechtstexte sind nur deutsch – dort nur Kopf/Fuß prüfen)
        await p.click('.s-kopf [data-lang="en"]', { force: true }).catch(async () => { await p.evaluate(() => document.querySelector('[data-lang="en"]').click()); });
        const en = await p.evaluate(sel => {
          const teile = [...document.querySelectorAll(sel)].map(e => e.innerText).join('\n');
          const deutsch = teile.split('\n').filter(z => /[äöüßÄÖÜ]|\b(und|der|die|das|mit|für|nicht|oder|ist|dein|deine)\b/.test(z) && !/Musterhaus|moser\.simon|Munderfing|Oberösterreich|Upper Austria|„|planory\.at/.test(z));
          const bilder = [...document.images].filter(i => i.dataset.enSrc).every(i => i.getAttribute('src') === i.dataset.enSrc);
          return { deutsch: deutsch.slice(0, 3), bilder, lang: document.documentElement.lang, titel: document.title, gemerkt: localStorage.getItem('planoryLang') };
        }, seite.endsWith('.html') ? '.s-kopf .s-links, .s-fuss' : 'main, .s-kopf .s-links, .s-fuss');
        if (en.deutsch.length) f.push('auf Englisch noch deutsch: ' + en.deutsch.join(' | '));
        if (!en.bilder) f.push('Bilder nicht auf Englisch');
        if (en.lang !== 'en' || en.gemerkt !== 'en') f.push('Sprachwechsel klappt nicht');
        if (!seite.endsWith('.html') && !/Planory/.test(en.titel)) f.push('Titel fehlt');
        if (fehler.length) f.push('JS-Fehler: ' + fehler[0]);
        return f.join(' · ');
      } finally { await c.close(); }
    });
  }
}

await scenario('Handy-Menü öffnet und schließt (Unterseite)', async () => {
  const c = await neu({ breite: 390 });
  try {
    const p = await c.newPage(); await p.goto(BASIS + '/preise/');
    await p.click('[data-menu]');
    const auf = await p.evaluate(() => [document.querySelector('.s-kopf').classList.contains('offen'), getComputedStyle(document.querySelector('.s-menu')).display]);
    await p.click('[data-menu]');
    const zu = await p.evaluate(() => document.querySelector('.s-kopf').classList.contains('offen'));
    return auf[0] && auf[1] !== 'none' && !zu ? '' : `Menü: offen=${JSON.stringify(auf)} danach offen=${zu}`;
  } finally { await c.close(); }
});

await scenario('Google bekommt auf Unterseiten Deutsch, englische Besucher Englisch', async () => {
  const bot = await neu({ lang: 'en', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
  const mensch = await neu({ lang: 'en' });
  try {
    const lies = async c => { const p = await c.newPage(); await p.goto(BASIS + '/funktionen/'); await p.waitForTimeout(300); return p.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('h1').textContent })); };
    const a = await lies(bot), b = await lies(mensch);
    const f = [];
    if (a.lang !== 'de' || !/^Alles, was/.test(a.h1)) f.push('Google sieht ' + JSON.stringify(a));
    if (b.lang !== 'en' || !/^Everything/.test(b.h1)) f.push('englischer Besucher sieht ' + JSON.stringify(b));
    return f.join(' · ');
  } finally { await bot.close(); await mensch.close(); }
});

await scenario('support.html (App-Store-Link) leitet auf /hilfe/ weiter', async () => {
  const c = await neu();
  try { const p = await c.newPage(); await p.goto(BASIS + '/support.html'); await p.waitForURL(/\/hilfe\/$/, { timeout: 5000 }); return ''; }
  finally { await c.close(); }
});

for (const [ziel, form] of [['register', 'auth-form-register'], ['login', 'auth-form-login']]) {
  await scenario(`Unterseite → „${ziel === 'register' ? 'Kostenlos starten' : 'Anmelden'}“ öffnet in der App direkt das richtige Formular`, async () => {
    const c = await neu({ breite: 1440 });
    try {
      const p = await c.newPage();
      const fehler = []; p.on('pageerror', e => fehler.push(e.message));
      await p.goto(BASIS + '/preise/');
      await Promise.all([p.waitForURL(u => new URL(u).pathname === '/', { timeout: 10000 }), p.click(`.s-kopf .s-rechts [data-start="${ziel}"]`, { force: true }).catch(() => p.evaluate(z => document.querySelector(`[data-start="${z}"]`).click(), ziel))]);
      await p.waitForFunction(() => getComputedStyle(document.getElementById('auth-overlay')).display !== 'none', null, { timeout: 15000 });
      const r = await p.evaluate(f => ({ form: getComputedStyle(document.getElementById(f)).display, landing: getComputedStyle(document.getElementById('landing-overlay')).display, url: location.search }), form);
      const f = [];
      if (r.form === 'none') f.push('falsches Formular');
      if (r.landing !== 'none') f.push('Startseite liegt noch darüber');
      if (r.url) f.push('Parameter bleibt in der Adresse: ' + r.url);
      if (fehler.length) f.push('JS-Fehler: ' + fehler[0]);
      return f.join(' · ');
    } finally { await c.close(); }
  });
}

await scenario('Startseite: Stile geladen, Menü-Knöpfe öffnen Anmelden/Registrieren ohne Seitenwechsel', async () => {
  const c = await neu({ breite: 1440 });
  try {
    const p = await c.newPage();
    await p.goto(BASIS + '/');
    await p.waitForFunction(() => getComputedStyle(document.getElementById('landing-overlay')).display !== 'none', null, { timeout: 15000 });
    const vorher = await p.evaluate(() => ({ css: !!document.getElementById('pl-site-css'), schrift: getComputedStyle(document.querySelector('#landing-overlay h1')).fontFamily, bg: getComputedStyle(document.getElementById('landing-overlay')).backgroundColor }));
    await p.click('#landing-overlay .s-rechts [data-start="register"]');
    const r = await p.evaluate(() => ({ url: location.pathname + location.search, landing: getComputedStyle(document.getElementById('landing-overlay')).display, reg: getComputedStyle(document.getElementById('auth-form-register')).display }));
    const f = [];
    if (!vorher.css || !/PL Archivo/.test(vorher.schrift)) f.push('Website-Stil nicht geladen: ' + JSON.stringify(vorher));
    if (r.url !== '/' || r.landing !== 'none' || r.reg === 'none') f.push(JSON.stringify(r));
    return f.join(' · ');
  } finally { await c.close(); }
});

await scenario('Startseite im dunklen Modus des Handys: Überschriften bleiben lesbar (dunkel auf hell)', async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', serviceWorkers: 'block' });
  await c.addInitScript(SUPA);
  await c.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  try {
    const p = await c.newPage();
    await p.goto(BASIS + '/');
    await p.waitForFunction(() => getComputedStyle(document.getElementById('landing-overlay')).display !== 'none', null, { timeout: 15000 });
    const r = await p.evaluate(() => ({ dunkel: document.body.classList.contains('dark-mode'),
      h1: getComputedStyle(document.querySelector('#landing-overlay h1')).color,
      h2hell: getComputedStyle(document.querySelector('#landing-overlay .s-abschnitt h2')).color,
      h2band: getComputedStyle(document.querySelector('#landing-overlay .s-band h2')).color }));
    const f = [];
    if (!r.dunkel) f.push('dunkler Modus nicht aktiv (Test ungültig)');
    if (r.h1 !== 'rgb(22, 25, 31)') f.push('Hauptüberschrift ' + r.h1);
    if (r.h2hell !== 'rgb(22, 25, 31)') f.push('Überschrift auf hellem Grund ' + r.h2hell);
    if (r.h2band !== 'rgb(243, 240, 232)') f.push('Überschrift auf dunklem Band ' + r.h2band);
    return f.join(' · ');
  } finally { await c.close(); }
});

await browser.close();
server.close();
console.log('\n  PLANORY – Website-Test (alle Seiten, Handy + Computer)');
console.log('  ' + '─'.repeat(64));
let fail = 0;
for (const [ok, name, msg] of results) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (!ok) { fail++; console.log('      → ' + msg); }
}
console.log('  ' + '─'.repeat(64));
console.log(`  ${results.length - fail} bestanden, ${fail} FEHLER\n`);
process.exit(fail ? 1 : 0);
