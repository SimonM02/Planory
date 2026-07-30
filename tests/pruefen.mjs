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

check('Gleichstand: Übersetzungen (PHRASES) in beiden Dateien gleich', () => {
  const keys = src => {
    const s = src.indexOf('const PHRASES = {');
    const e = src.indexOf('const _phrasesEN2DE');
    let b = src.slice(s, e); b = b.slice(0, b.lastIndexOf('}') + 1);
    const obj = vm.runInNewContext('(' + b.replace('const PHRASES = ', '') + ')');
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
// 4. ZUGESAGTE FUNKTIONEN – dürfen nie versehentlich gesperrt werden
// ───────────────────────────────────────────────────────────────────
for (const [label, src] of [['Web', web], ['App', app]]) {
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
  check(`${label}: Dokument-Anzeige unterstützt alte UND neue Ablage`, () => {
    const f = extractFn(src, '_getDokumentUrl');
    if (!f) return '_getDokumentUrl nicht gefunden';
    if (!f.includes('d.storage')) return 'alter Storage-Pfad wird nicht mehr unterstützt';
    if (!f.includes('d.url')) return 'neue Storage-URL wird nicht unterstützt';
    if (!f.includes('d.data')) return 'alte Base64-Einträge werden nicht mehr unterstützt';
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
