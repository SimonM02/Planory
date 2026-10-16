#!/usr/bin/env node
/**
 * Planory – Automatische Prüfungen vor jedem Hochladen.
 *
 * Aufruf:  node tests/pruefen.mjs
 * Ergebnis: Liste aller Prüfungen + am Ende BESTANDEN / FEHLGESCHLAGEN.
 * Exit-Code 1 bei Fehlern -> nichts darf live gehen.
 *
 * Zweck: Fehler finden, BEVOR sie bei echten Nutzern landen.
 * Entstanden nach dem Sync-Vorfall vom 23.07.2026 (alte lokale Daten wurden
 * beim Zusammenführen wieder eingespielt und in die Cloud geschrieben).
 */

import fs from 'fs';
import vm from 'vm';

const WEB = 'index.html';      // Web-Version (planory.at)
const APP = 'www/index.html';  // Datei, die in die iOS-App gebacken wird

const results = [];
let warnings = 0;

function check(name, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) results.push({ ok: true, name });
    else results.push({ ok: false, name, msg: String(r) });
  } catch (e) {
    results.push({ ok: false, name, msg: e.message });
  }
}
function warn(name, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) results.push({ ok: true, name });
    else { results.push({ ok: 'warn', name, msg: String(r) }); warnings++; }
  } catch (e) { results.push({ ok: 'warn', name, msg: e.message }); warnings++; }
}

const read = f => fs.readFileSync(f, 'utf8');
const web = read(WEB);
const app = read(APP);

/** Holt den Quelltext einer Funktion (per Klammer-Zählung). */
function extractFn(src, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(src);
  if (!m) return null;
  // Erst die Parameterliste überspringen – sonst wird "= {}" als Rumpf gelesen.
  let i = src.indexOf('(', m.index), par = 0;
  for (; i < src.length; i++) {
    if (src[i] === '(') par++;
    else if (src[i] === ')') { par--; if (par === 0) { i++; break; } }
  }
  const start = src.indexOf('{', i);
  if (start < 0) return null;
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(m.index, j + 1); }
  }
  return null;
}

/** Holt den grossen <script>-Block, der einen bestimmten Text enthält. */
function mainScript(src, marker) {
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) if (m[1].includes(marker)) return m[1];
  return null;
}

// ───────────────────────────────────────────────────────────────────
// 1. SYNTAX – bricht die App beim Laden?
// ───────────────────────────────────────────────────────────────────
for (const [label, src] of [['Web', web], ['App', app]]) {
  check(`Syntax ${label}: Haupt-Skript ist gültiges JavaScript`, () => {
    const body = mainScript(src, 'function syncToCloud');
    if (!body) return 'Haupt-Skript nicht gefunden';
    new vm.Script(body); // wirft bei Syntaxfehler
  });
}

// ───────────────────────────────────────────────────────────────────
// 2. WEB und APP im Gleichstand – der häufigste Flüchtigkeitsfehler
//    (Änderung nur in einer der beiden Dateien gemacht)
// ───────────────────────────────────────────────────────────────────
// Staerkste Pruefung zuerst: die App-Datei ist eine exakte Kopie der Web-Datei.
// Jede Abweichung heisst: eine Aenderung wurde nur in einer Datei gemacht.
check('Gleichstand: Web- und App-Datei sind Byte für Byte identisch', () => {
  if (web !== app) {
    const wl = web.split('\n'), al = app.split('\n');
    for (let i = 0; i < Math.max(wl.length, al.length); i++) {
      if (wl[i] !== al[i]) return `erste Abweichung in Zeile ${i + 1}`;
    }
    return 'Dateien unterschiedlich lang';
  }
});

const KRITISCH = ['syncToCloud', 'loadFromCloud', '_mergeArr', '_mergeProjects',
                  'saveAll', '_trackDeletion', 'requireSub', '_subActive'];
for (const fn of KRITISCH) {
  check(`Gleichstand: ${fn}() ist in Web und App identisch`, () => {
    const a = extractFn(web, fn), b = extractFn(app, fn);
    if (!a) return `${fn} fehlt in ${WEB}`;
    if (!b) return `${fn} fehlt in ${APP}`;
    if (a !== b) return `${fn} unterscheidet sich zwischen Web und App!`;
  });
}

check('Gleichstand: Übersetzungen (TEXTE) in beiden Dateien gleich', () => {
  const keys = src => {
    const s = src.indexOf('const TEXTE = {');
    const e = src.indexOf('const OPTIONEN');
    let b = src.slice(s, e); b = b.slice(0, b.lastIndexOf('}') + 1);
    const obj = vm.runInNewContext('(' + b.replace('const TEXTE = ', '') + ')');
    return Object.keys(obj).sort();
  };
  const a = keys(web), b = keys(app);
  if (a.length !== b.length) return `Web hat ${a.length}, App hat ${b.length} Einträge`;
  const diff = a.find((k, i) => k !== b[i]);
  if (diff) return `Unterschied bei: ${diff}`;
});

// ───────────────────────────────────────────────────────────────────
// 3. SYNC-REGELN – die Logik, die den Vorfall verursacht hat
// ───────────────────────────────────────────────────────────────────
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(extractFn(web, '_mergeArr') || '', sandbox);
const mergeArr = sandbox._mergeArr;

check('Sync-Regel: Zusammenführen-Funktion ist vorhanden', () =>
  typeof mergeArr === 'function' || 'Funktion _mergeArr nicht gefunden');

if (typeof mergeArr === 'function') {
  check('Sync-Regel: Gelöschtes kommt NICHT zurück (Grabstein wird beachtet)', () => {
    const lokal = [{ id: 1, name: 'A', _updatedAt: 500 }];       // Gerät hat es noch
    const cloud = [];                                            // in der Cloud gelöscht
    const grab  = { '1': { ts: 900 } };                          // Grabstein
    const r = mergeArr(lokal, cloud, grab);
    if (r.length !== 0) return `Gelöschter Eintrag kam zurück (${r.length} statt 0)`;
  });

  check('Sync-Regel: Neuere Änderung gewinnt', () => {
    const lokal = [{ id: 1, name: 'NEU', _updatedAt: 2000 }];
    const cloud = [{ id: 1, name: 'ALT', _updatedAt: 1000 }];
    const r = mergeArr(lokal, cloud, {});
    if (r[0]?.name !== 'NEU') return `Falsche Version gewonnen: ${r[0]?.name}`;
  });

  check('Sync-Regel: Frisch Angelegtes geht NICHT verloren', () => {
    const lokal = [{ id: 1, name: 'A', _updatedAt: 1 }, { id: 2, name: 'NEU', _updatedAt: 9 }];
    const cloud = [{ id: 1, name: 'A', _updatedAt: 1 }];  // Cloud kennt "NEU" noch nicht
    const r = mergeArr(lokal, cloud, {});
    if (!r.find(x => x.id === 2)) return 'Der neue Eintrag wurde verschluckt';
  });

  check('Sync-Regel: Keine Doppelten bei Text- vs. Zahlen-IDs', () => {
    const lokal = [{ id: 7, name: 'A' }];
    const cloud = [{ id: '7', name: 'A' }];               // gleiche ID, anderer Typ
    const r = mergeArr(lokal, cloud, {});
    if (r.length !== 1) return `Eintrag doppelt (${r.length} statt 1)`;
  });

  // Der Vorfall vom 23.07.: Der Browser hatte uralte lokale Daten. Beim
  // Zusammenführen sehen die aus wie "neu angelegt" -> wurden behalten und
  // hochgeladen. Reines Zusammenführen KANN das nicht unterscheiden.
  warn('⚠️ Bekannte Lücke: uralte lokale Daten sehen aus wie "neu angelegt"', () => {
    const uralt = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, name: 'alt' }));
    const cloud = [{ id: 1, name: 'aktuell' }];
    const r = mergeArr(uralt, cloud, {});
    if (r.length > 1) return `${r.length} statt 1 Einträge – deshalb darf beim Sync-Umbau nicht blind gemergt werden (Merkzettel, kein Fehler)`;
  });
}

// ───────────────────────────────────────────────────────────────────
// 3a. DATENVERLUST-SCHUTZ – der Fix, der Budgetkategorien gerettet hat.
//     Diese Prüfungen verhindern, dass der gefährliche Code je zurückkommt.
// ───────────────────────────────────────────────────────────────────
check('Datenschutz: _deduplicateProject löscht NICHTS aus der Cloud', () => {
  const fn = extractFn(web, '_deduplicateProject');
  if (!fn) return '_deduplicateProject nicht gefunden';
  if (/\.delete\s*\(/.test(fn)) return 'GEFÄHRLICH: _deduplicateProject enthält eine Löschung (.delete) – das hat schon einmal Daten gelöscht!';
  if (/_deletedIds\s*\[/.test(fn)) return 'GEFÄHRLICH: _deduplicateProject setzt Grabsteine (_deletedIds) – kann echte Einträge löschen!';
});

check('Datenschutz: syncToCloud schützt noch vorhandene Einträge (Sicherheitsnetz)', () => {
  const fn = extractFn(web, 'syncToCloud');
  if (!fn) return 'syncToCloud nicht gefunden';
  if (!/liveIds/.test(fn)) return 'Sicherheitsnetz fehlt: keine liveIds-Prüfung in syncToCloud';
  if (!/delete\s+proj\._deletedIds\[/.test(fn)) return 'Sicherheitsnetz fehlt: Grabstein wird für vorhandene Einträge nicht entfernt';
});

// ───────────────────────────────────────────────────────────────────
// 3b. FRISTEN & TERMINE – Zeitzonen-Fehler kosteten schon mal Skonto
// ───────────────────────────────────────────────────────────────────
{
  const dctx = {};
  vm.createContext(dctx);
  vm.runInContext(extractFn(web, '_daysUntilDateStr') || ';', dctx);
  vm.runInContext(extractFn(web, 'getNextDate') || ';', dctx);

  const lokalDatum = (verschiebungTage) => {
    const d = new Date(); d.setHours(12, 0, 0, 0); // Mittag: DST-sicher
    d.setDate(d.getDate() + verschiebungTage);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  check('Fristen: heute fällig = 0 Tage (kein Zeitzonen-Verschieber)', () => {
    if (typeof dctx._daysUntilDateStr !== 'function') return '_daysUntilDateStr fehlt';
    const r = dctx._daysUntilDateStr(lokalDatum(0));
    if (r !== 0) return `heute ergibt ${r} statt 0 – Fristen wären falsch!`;
  });
  check('Fristen: morgen = 1, gestern = -1', () => {
    const m = dctx._daysUntilDateStr(lokalDatum(1));
    const g = dctx._daysUntilDateStr(lokalDatum(-1));
    if (m !== 1) return `morgen ergibt ${m} statt 1`;
    if (g !== -1) return `gestern ergibt ${g} statt -1 (überfällig würde verschluckt)`;
  });
  check('Wartung: Intervalle Wochen/Monate/Jahre rechnen korrekt', () => {
    if (typeof dctx.getNextDate !== 'function') return 'getNextDate fehlt';
    const w = dctx.getNextDate('2026-01-01', 2, 'Wochen');
    const m = dctx.getNextDate('2026-01-31', 1, 'Monate');
    const j = dctx.getNextDate('2026-01-01', 1, 'Jahre');
    if (w.getDate() !== 15) return `2 Wochen ab 1.1. ergibt Tag ${w.getDate()} statt 15`;
    if (j.getFullYear() !== 2027) return `1 Jahr ab 2026 ergibt ${j.getFullYear()}`;
    if (isNaN(m.getTime())) return '1 Monat ab 31.1. ergibt ungültiges Datum';
  });
}

// ───────────────────────────────────────────────────────────────────
// 3c. GRABSTEIN-VEREINIGUNG – gelöschte Kategorien dürfen nie zurück
// ───────────────────────────────────────────────────────────────────
{
  const mctx = {};
  vm.createContext(mctx);
  vm.runInContext((extractFn(web, '_mergeArr') || ';') + '\n' + (extractFn(web, '_mergeProjects') || ';'), mctx);
  check('Merge: Grabsteine beider Seiten werden vereinigt', () => {
    if (typeof mctx._mergeProjects !== 'function') return '_mergeProjects fehlt';
    const lokal = [{ id: 1, _deletedIds: { 'a': { ts: 100 } }, kosten: [] }];
    const cloud = [{ id: 1, _deletedIds: { 'b': { ts: 200 } }, kosten: [{ id: 'a', name: 'Geist' }, { id: 'c', name: 'Echt' }] }];
    const r = mctx._mergeProjects(lokal, cloud);
    const del = r[0]._deletedIds || {};
    if (!del['a'] || !del['b']) return 'Vereinigung unvollständig – Gelöschtes käme zurück';
    if (r[0].kosten.some(k => String(k.id) === 'a')) return 'Grabstein-Eintrag überlebte den Merge';
    if (!r[0].kosten.some(k => String(k.id) === 'c')) return 'echter Eintrag ging verloren';
  });
}

// ───────────────────────────────────────────────────────────────────
// 3d. UNGESICHERTE ÄNDERUNGEN – Vorfall 11.10.2026: "Ausgabe erscheint kurz
//     und verschwindet wieder". Ein Neuladen aus der Cloud hat noch nicht
//     hochgeladene Einträge überschrieben (nachgestellt in tests/sync-e2e.mjs).
// ───────────────────────────────────────────────────────────────────
{
  const pctx = { ITEM_TYPES: ['kosten', 'aufgaben', 'budgetKat'] };
  vm.createContext(pctx);
  vm.runInContext(['_stableStr', '_reapplyPending'].map(n => extractFn(web, n) || ';').join('\n'), pctx);
  const re = pctx._reapplyPending, ss = pctx._stableStr;
  const P = (kosten, del = {}) => [{ id: 1, kosten, _deletedIds: del }];
  const pend = (item) => new Map([['1|kosten|' + item.id, { pid: '1', typ: 'kosten', id: String(item.id), item, j: 'x', syncedAt: 0 }]]);

  check('Ungesichert: Schutz-Funktionen vorhanden', () =>
    (typeof re === 'function' && typeof ss === 'function') || '_reapplyPending / _stableStr fehlen');
  if (typeof re === 'function' && typeof ss === 'function') {
    check('Ungesichert: neue Ausgabe überlebt das Neuladen aus der Cloud', () => {
      const cloud = P([{ id: 10, betrag: 1000, _updatedAt: 1 }]);
      re(cloud, pend({ id: 11, betrag: 4160, _updatedAt: 5 }), [], {}, 1, 0);
      if (!cloud[0].kosten.some(k => k.id === 11 && k.betrag === 4160)) return 'Ungesicherter Eintrag wurde vom Cloud-Stand überschrieben';
      if (!cloud[0].kosten.some(k => k.id === 10)) return 'Cloud-Eintrag ging verloren';
    });
    check('Ungesichert: lokale Änderung gewinnt gegen ältere Cloud-Fassung', () => {
      const cloud = P([{ id: 11, betrag: 100, _updatedAt: 3 }]);
      re(cloud, pend({ id: 11, betrag: 4160, _updatedAt: 5 }), [], {}, 1, 0);
      if (cloud[0].kosten[0].betrag !== 4160) return `Betrag ${cloud[0].kosten[0].betrag} statt 4160`;
    });
    check('Ungesichert: neuere Fassung von anderem Gerät gewinnt', () => {
      const cloud = P([{ id: 11, betrag: 999, _updatedAt: 9 }]);
      const p = pend({ id: 11, betrag: 4160, _updatedAt: 5 });
      re(cloud, p, [], {}, 1, 0);
      if (cloud[0].kosten[0].betrag !== 999) return 'Ältere lokale Fassung hat die neuere überschrieben';
      if (p.size) return 'Veralteter lokaler Stand bleibt als "ungesichert" hängen';
    });
    check('Ungesichert: frisch Gelöschtes kommt nicht zurück', () => {
      const cloud = P([{ id: 12, betrag: 5 }]);
      const p = pend({ id: 12, betrag: 5, _updatedAt: 7 });
      re(cloud, p, [], { '12': { ts: 500 } }, 1, 100);
      if (cloud[0].kosten.some(k => k.id === 12)) return 'Gelöschter Eintrag ist wieder da';
      if (p.size) return 'Gelöschter Eintrag bleibt als "ungesichert" hängen';
    });
    check('Ungesichert: alte lokale Grabsteine löschen keine echten Cloud-Einträge', () => {
      const cloud = P([{ id: 13, betrag: 5 }]);
      re(cloud, new Map(), [], { '13': { ts: 50 } }, 1, 100);
      if (!cloud[0].kosten.some(k => k.id === 13)) return 'Echter Eintrag wurde wegen eines alten Grabsteins entfernt';
    });
    check('Ungesichert: alte lokale Daten werden NICHT wiederbelebt, neue Projekte bleiben', () => {
      const cloud = P([]);
      re(cloud, new Map(), [{ id: 50, kosten: [] }, { id: 5000, kosten: [] }], {}, 1, 1000);
      if (cloud.some(p => p.id === 50)) return 'Uraltes lokales Projekt wurde wiederbelebt';
      if (!cloud.some(p => p.id === 5000)) return 'Gerade angelegtes Projekt ging verloren';
    });
    check('Ungesichert: Schlüssel-Reihenfolge spielt keine Rolle (Postgres ordnet um)', () =>
      ss({ a: 1, b: { c: 2, d: [1, { x: 1, y: 2 }] } }) === ss({ b: { d: [1, { y: 2, x: 1 }], c: 2 }, a: 1 })
        || 'Vergleich hängt von der Schlüssel-Reihenfolge ab – alles sähe "geändert" aus');
  }
}
for (const [label, src] of [['Web', web], ['App', app]]) {
  check(`${label}: Neuladen setzt ungesicherte Einträge wieder ein`, () => {
    const lf = extractFn(src, 'loadFromCloud');
    if (!lf) return 'loadFromCloud nicht gefunden';
    const a = lf.indexOf('_reapplyPending('), b = lf.indexOf('projects = finalProjects');
    if (a < 0) return 'loadFromCloud ruft _reapplyPending nicht auf – Eingetipptes kann beim Neuladen verschwinden';
    if (b > -1 && a > b) return '_reapplyPending kommt erst NACH dem Ersetzen – zu spät';
  });
  check(`${label}: Speichern merkt ungesicherte Änderungen`, () => {
    const sa = extractFn(src, 'saveAll');
    if (!sa || !sa.includes('_markPending()')) return 'saveAll ruft _markPending nicht auf';
  });
  check(`${label}: nie zwei Uploads gleichzeitig`, () => {
    const sc = extractFn(src, 'syncToCloud');
    if (!sc || !/if \(_syncRunning\)/.test(sc)) return 'syncToCloud hat keine Sperre gegen parallele Uploads';
  });
  check(`${label}: Abo-Prüfung sperrt nicht, solange der Status noch lädt`, () => {
    const rs = extractFn(src, 'requireSub');
    if (!rs || !/_userPlan === undefined/.test(rs)) return 'requireSub sperrt Einträge in den ersten Sekunden nach dem Start';
  });
}

// ───────────────────────────────────────────────────────────────────
// 3e. AUSWAHLFELDER – Vorfall 12.10.2026: translateOptions ersetzte beim Start
//     eigene Werte (MwSt 0/10/20, "Alle Kategorien" = "") durch den Anzeige-Text.
//     Folge: MwSt sprang beim Bearbeiten auf 20 %, Filter zeigten nichts.
// ───────────────────────────────────────────────────────────────────
{
  const octx = { OPTIONEN: { 'Ohne MwSt (0%)': { en: 'No VAT (0%)' }, 'Alle Kategorien': { en: 'All categories' }, 'Bezahlt': { en: 'Paid' } }, _lang: 'en' };
  vm.createContext(octx);
  vm.runInContext(extractFn(web, 'translateOptions') || ';', octx);
  const opt = (text, value) => {
    const attrs = value === undefined ? {} : { value };
    const o = { textContent: text, dataset: {}, hasAttribute: a => a in attrs,
      get value() { return 'value' in attrs ? attrs.value : this.textContent; }, set value(v) { attrs.value = v; } };
    return o;
  };
  const root = (opts) => ({ querySelectorAll: () => opts });
  check('Auswahl: eigener Wert (MwSt "0") bleibt beim Übersetzen erhalten', () => {
    if (typeof octx.translateOptions !== 'function') return 'translateOptions nicht gefunden';
    const o = opt('Ohne MwSt (0%)', '0');
    octx.translateOptions(root([o]));
    if (o.value !== '0') return `Wert wurde zu "${o.value}" – MwSt springt beim Bearbeiten falsch`;
    if (o.textContent !== 'No VAT (0%)') return 'Anzeige-Text wurde nicht übersetzt';
  });
  check('Auswahl: leerer Wert ("Alle Kategorien") bleibt leer', () => {
    const o = opt('Alle Kategorien', '');
    octx.translateOptions(root([o]));
    if (o.value !== '') return `Wert wurde zu "${o.value}" – Filter zeigt dann nichts mehr an`;
  });
  check('Auswahl: Option ohne eigenen Wert speichert weiter deutsch', () => {
    const o = opt('Bezahlt');
    octx.translateOptions(root([o]));
    if (o.value !== 'Bezahlt') return `Gespeicherter Wert wäre "${o.value}" statt "Bezahlt"`;
    if (o.textContent !== 'Paid') return 'Anzeige-Text wurde nicht übersetzt';
  });
}
check('Fotos: Filter bietet "Alle Kategorien" an', () => {
  const f = extractFn(web, 'refreshFotoKat');
  if (!f) return 'refreshFotoKat nicht gefunden';
  if (!/value=""/.test(f) || !/foto-filter/.test(f)) return 'Foto-Filter ohne "Alle"-Option – Fotos anderer Kategorien wirken verschwunden';
});
{
  const lctx = {};
  vm.createContext(lctx);
  const src = web.match(/const _LABEL_FIX = \{[\s\S]*?\n\};/);
  vm.runInContext((src ? src[0].replace('const _LABEL_FIX', 'var _LABEL_FIX') : '') + '\n' + (extractFn(web, '_fixLabelValues') || ';'), lctx);
  check('Reparatur: falsch gespeicherte Anzeige-Texte werden korrigiert', () => {
    if (typeof lctx._fixLabelValues !== 'function') return '_fixLabelValues nicht gefunden';
    const p = { settings: { type: '🏠 Neubau' }, grundrisse: [{ id: 1, pins: [{ typ: '🔥 Heizung' }, { typ: 'Elektro' }] }],
      notizen: [{ id: 2, color: 'Gelb' }], dokumentation: [{ id: 3, typ: '⚡ Elektro' }], gantt: [{ id: 4, type: 'phase' }] };
    const n = lctx._fixLabelValues(p);
    if (p.settings.type !== 'Neubau' || p.grundrisse[0].pins[0].typ !== 'Heizung' || p.notizen[0].color !== '#fef9c3' || p.dokumentation[0].typ !== 'Elektro')
      return 'nicht alle Werte korrigiert: ' + JSON.stringify(p);
    if (p.grundrisse[0].pins[1].typ !== 'Elektro' || p.gantt[0].type !== 'phase') return 'korrekte Werte wurden verändert';
    if (n !== 4) return `${n} statt 4 Korrekturen gezählt`;
    if (lctx._fixLabelValues(p) !== 0) return 'zweiter Durchlauf ändert noch etwas (nicht stabil)';
  });
}
for (const [label, src] of [['Web', web], ['App', app]]) {
  check(`${label}: Cloud-Laden repariert alte Auswahl-Werte`, () => {
    const lf = extractFn(src, 'loadFromCloud');
    if (!lf || !lf.includes('_fixLabelValues(')) return 'loadFromCloud ruft _fixLabelValues nicht auf';
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. ZUGESAGTE FUNKTIONEN – dürfen nie versehentlich gesperrt werden
// ───────────────────────────────────────────────────────────────────
for (const [label, src] of [['Web', web], ['App', app]]) {
  check(`${label}: Scan bucht sofort ein (wartet nicht auf den Beleg-Upload)`, () => {
    const f = extractFn(src, 'confirmRechnungScan');
    if (!f) return 'confirmRechnungScan nicht gefunden';
    const i = f.indexOf('state.kosten.push');
    if (i < 0) return 'Scan bucht keine Ausgabe ein';
    if (/\bawait\b/.test(f.slice(0, i))) return 'vor dem Einbuchen wird gewartet (Ausgabe erscheint erst nach dem Upload)';
    if (!f.includes('_belegVormerken(')) return 'Beleg wird nicht vorgemerkt (geht verloren, wenn die App gleich geschlossen wird)';
  });
  check(`${label}: „Bezahlt von" erlaubt eine neue Person`, () => {
    const f = extractFn(src, 'refreshBezahltVonSelects');
    if (!f || !f.includes('BV_NEU')) return 'Option „Neue Person…" fehlt beim Neuaufbau der Auswahl';
  });
  check(`${label}: Aufgaben abhaken bleibt ohne Abo möglich`, () => {
    const f = extractFn(src, 'toggleTask');
    if (!f) return 'toggleTask nicht gefunden';
    if (f.includes('requireSub')) return 'toggleTask ist gesperrt – muss gratis bleiben!';
  });
  check(`${label}: Wartung abhaken bleibt ohne Abo möglich`, () => {
    const f = extractFn(src, 'markWartungDone');
    if (!f) return 'markWartungDone nicht gefunden';
    if (f.includes('requireSub')) return 'markWartungDone ist gesperrt – muss gratis bleiben!';
  });
  check(`${label}: In der iOS-App sind alle Funktionen frei (Apple 3.1.1)`, () => {
    const f = extractFn(src, 'requireSub');
    if (!f) return 'requireSub nicht gefunden';
    if (!f.includes('isNativeApp()')) return 'Abo-Sperre greift in der App – Apple lehnt das ab!';
  });
}

// ───────────────────────────────────────────────────────────────────
// 4b. SICHERHEITSNETZ SYNC (nach dem Vorfall vom 29.07.)
// ───────────────────────────────────────────────────────────────────
for (const [label, src] of [['Web', web], ['App', app]]) {
  check(`${label}: Upload ist gesperrt, bis die Cloud geladen wurde`, () => {
    const f = extractFn(src, 'syncToCloud');
    if (!f) return 'syncToCloud nicht gefunden';
    if (!f.includes('_cloudLoadedOk')) return 'Sicherheitsnetz fehlt in syncToCloud!';
    const idxGate = f.indexOf('_cloudLoadedOk');
    const idxWork = f.indexOf('projektdaten');
    if (idxWork > -1 && idxGate > idxWork) return 'Sperre kommt zu spät (nach dem Schreiben)';
  });
  check(`${label}: Cloud-Laden setzt die Freigabe erst nach BEIDEN Abfragen`, () => {
    const f = extractFn(src, 'loadFromCloud');
    if (!f) return 'loadFromCloud nicht gefunden';
    if (!f.includes('itemsResult.error')) return 'itemsResult.error wird nicht geprüft';
    const ok = f.indexOf('_cloudLoadedOk = true');
    if (ok < 0) return 'Freigabe wird nie gesetzt';
    if (ok < f.indexOf('itemsResult.error')) return 'Freigabe kommt vor der Fehlerprüfung';
  });
  check(`${label}: gefährliche Sync-Knöpfe sind entfernt`, () => {
    for (const fn of ['forceCloudOverwrite', 'forceSyncFromCloud', 'forceSyncToCloud']) {
      if (src.includes(fn)) return `${fn} existiert noch`;
    }
    if (src.includes('sync-info-output')) return 'Diagnose-Feld existiert noch';
  });
  check(`${label}: Offline-Hinweis an allen drei Fehlstellen beim Laden`, () => {
    const f = extractFn(src, 'loadFromCloud');
    if (!f) return 'loadFromCloud nicht gefunden';
    const n = (f.match(/_notifyOffline\(\)/g) || []).length;
    if (n < 3) return `nur ${n} von 3 Fehlstellen melden Offline`;
  });
  check(`${label}: Abmelden gesperrt, wenn Änderungen nicht gesichert werden können`, () => {
    const f = extractFn(src, 'doLogout');
    if (!f) return 'doLogout nicht gefunden';
    const guard = f.indexOf('_cloudLoadedOk');
    const clear = f.indexOf('removeItem');
    if (guard < 0) return 'Abmelde-Schutz fehlt – lokaler Speicher würde ungesichert geleert';
    if (clear > -1 && guard > clear) return 'Schutz kommt erst NACH dem Leeren des Speichers';
  });
  check(`${label}: Bei Rückkehr der Verbindung wird automatisch neu geladen`, () => {
    if (!src.includes("addEventListener('online'")) return 'online-Listener fehlt';
  });
  check(`${label}: Wiederherstellen-Banner meldet keinen falschen Erfolg`, () => {
    const f = extractFn(src, '_confirmRestoreToCloud');
    if (!f) return '_confirmRestoreToCloud nicht gefunden';
    if (!f.includes('_cloudLoadedOk')) return 'zeigt Erfolg auch bei gesperrtem Sync';
  });
  check(`${label}: Datei-Umräumung bearbeitet das maßgebliche state-Objekt`, () => {
    const f = extractFn(src, '_migrateEmbeddedFiles');
    if (!f) return '_migrateEmbeddedFiles nicht gefunden';
    if (!f.includes('String(state.id) === String(p.id)')) return 'nutzt state nicht – Speichern während der Umräumung würde sie rückgängig machen';
    if (f.includes('state = cur')) return 'alte state-Ersetzung noch vorhanden (Verlust-Risiko)';
  });
  check(`${label}: Ersteinrichtung wird zuerst lokal gesichert`, () => {
    const f = extractFn(src, 'finishOnboarding');
    if (!f) return 'finishOnboarding nicht gefunden';
    const a = f.indexOf('saveAll()'), b = f.indexOf('syncToCloud()');
    if (a < 0) return 'saveAll fehlt – Onboarding ginge bei Reload ohne Verbindung verloren';
    if (b > -1 && a > b) return 'lokales Sichern kommt erst NACH dem Cloud-Versuch';
  });
  check(`${label}: Dokument-Anzeige unterstützt alte UND neue Ablage`, () => {
    const f = extractFn(src, '_getDokumentUrl');
    if (!f) return '_getDokumentUrl nicht gefunden';
    if (!f.includes('d.storage')) return 'alter Storage-Pfad wird nicht mehr unterstützt';
    if (!f.includes('d.url')) return 'neue Storage-URL wird nicht unterstützt';
    if (!f.includes('d.data')) return 'alte Base64-Einträge werden nicht mehr unterstützt';
  });
  check(`${label}: Budget-Kategorien werden ZEILENWEISE gespeichert (Umbau)`, () => {
    // Der eigentliche Fix gegen den Budget-Vorfall: jede Kategorie ist eine eigene
    // Zeile in projekt_items (wie Rechnungen), kein "ganzer Block" mehr.
    const sc = extractFn(src, 'syncToCloud');
    if (!sc) return 'syncToCloud nicht gefunden';
    if (/typ === 'budgetKat'\s*\)\s*continue/.test(sc))
      return 'syncToCloud überspringt budgetKat noch – Kategorien landen nicht als Zeilen';
    if (!sc.includes('_budgetKatV2'))
      return 'Umbau-Merker _budgetKatV2 fehlt in syncToCloud';
  });
  check(`${label}: Budget-Kategorie löschen setzt einen Grabstein`, () => {
    // Ohne Grabstein (_trackDeletion) konnte eine gelöschte Kategorie von einem
    // anderen Gerät wieder hochgeladen werden.
    const f = extractFn(src, 'deleteBudgetKat');
    if (!f) return 'deleteBudgetKat nicht gefunden';
    if (!f.includes('_trackDeletion'))
      return 'deleteBudgetKat setzt keinen Grabstein – gelöschte Kategorie kann zurückkommen';
  });
  check(`${label}: Budget-Kategorien werden aus den Zeilen geladen`, () => {
    const lf = extractFn(src, 'loadFromCloud');
    if (!lf) return 'loadFromCloud nicht gefunden';
    if (/hasBudgetKatInMeta/.test(lf))
      return 'loadFromCloud bevorzugt noch den alten Block statt der Zeilen';
    // Rückfall auf den Block MUSS existieren: wenn keine Kategorie-Zeilen ankamen
    // (z.B. Sync brach nach projektdaten, aber vor den Zeilen ab), rettet der Block
    // die Kategorien statt sie leer zu laden.
    if (!/meta\.budgetKat/.test(lf))
      return 'loadFromCloud hat keinen Block-Rückfall (Datenverlust bei abgebrochenem Sync möglich)';
    // …und dabei Grabsteine herausfiltern, damit "alle gelöscht" nicht zurückkommt.
    if (!/filter\(k => !del\[/.test(lf))
      return 'Block-Rückfall filtert keine Grabsteine – gelöschte Kategorie kann zurückkommen';
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. KLEINKRAM, der schon mal Ärger gemacht hat
// ───────────────────────────────────────────────────────────────────
for (const [label, src] of [['Web', web], ['App', app]]) {
  check(`${label}: kein abgekündigtes KI-Modell`, () => {
    if (src.includes('claude-sonnet-4-20250514')) return 'Altes Modell liefert HTTP 404';
  });
  check(`${label}: API-Adresse gesetzt (sonst KI/Bezahlen tot in der App)`, () => {
    if (!/const API_BASE = 'https:\/\//.test(src)) return 'API_BASE fehlt oder ist relativ';
  });
}

// ───────────────────────────────────────────────────────────────────
// Ausgabe
// ───────────────────────────────────────────────────────────────────
console.log('\n  PLANORY – Prüfung vor dem Hochladen\n' + '  ' + '─'.repeat(52));
let failed = 0;
for (const r of results) {
  if (r.ok === true) console.log(`  ✅ ${r.name}`);
  else if (r.ok === 'warn') console.log(`  ⚠️  ${r.name}\n      ${r.msg}`);
  else { failed++; console.log(`  ❌ ${r.name}\n      ${r.msg}`); }
}
console.log('  ' + '─'.repeat(52));
const passed = results.filter(r => r.ok === true).length;
console.log(`  ${passed} bestanden, ${warnings} Hinweise, ${failed} FEHLER\n`);
if (failed > 0) {
  console.log('  🛑 NICHT hochladen – zuerst die Fehler beheben.\n');
  process.exit(1);
}
console.log('  ✅ Alles in Ordnung – Hochladen ist freigegeben.\n');
