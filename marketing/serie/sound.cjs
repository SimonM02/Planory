// Dezente Soundeffekte für die Serie „Planory erklärt“ – Zeiten kommen aus folgen.js.
// Nur: weiches Wusch bei Bildwechseln, leises Klicken beim Antippen, sanfter Ton bei „fertig“.
// (Simon: vorher zu viel, „wie ein Videospiel“.) Die Musik trägt das Video.
// node serie/sound.cjs <folge> ton.wav
// folgen.js ist eine Browser-Datei (setzt window.FOLGEN) – hier mit einem Ersatz-window laden
const _w = {}; new Function('window', 'module', require('fs').readFileSync(__dirname + '/folgen.js', 'utf8'))(_w, undefined);
const FOLGEN = _w.FOLGEN;
const EP = FOLGEN[+(process.argv[2] || 1)];
const COVER = 1.3;   // wie in serie.html
const M = require('../reel/sfx.cjs')(COVER + EP.dur, 900 + EP.nr);
const off = f => (t, ...a) => f(t + COVER, ...a);   // alles nach dem Titelbild um COVER versetzt
const [whoosh, tick, bell, scanner] = ['whoosh', 'tick', 'bell', 'scanner'].map(n => off(M[n]));
const END = EP.end.t0, PH_IN = EP.steps[0].t0;
// weiches, gedämpftes Wusch (tiefe Frequenzen, kein Zischen)
const sanft = (t, g = 0.1, auf = true) => whoosh(t, 0.45, { f0: auf ? 220 : 900, f1: auf ? 900 : 220, peak: 0.5, q: 0.7, gain: g, rev: 0.25 });
const klick = t => tick(t, { f: 1000, gain: 0.05, rev: 0.08 });
const fertig = t => { bell(t, { f: 1047, len: 0.9, gain: 0.06, rev: 0.4 }); bell(t + 0.11, { f: 1319, len: 1.0, gain: 0.055, rev: 0.4 }); };

// Titelbild
M.whoosh(0, 0.6, { f0: 180, f1: 700, peak: 0.6, q: 0.7, gain: 0.1, rev: 0.3 });
M.whoosh(COVER - 0.3, 0.5, { f0: 300, f1: 1000, f2: 400, peak: 0.5, q: 0.7, gain: 0.08, rev: 0.3 });
// Intro: Marke / Handy / Kacheln / Start
if (EP.brand) sanft(EP.brand.t0, 0.08);
sanft(PH_IN, 0.1);
if (EP.grid) sanft(EP.grid.t0 - 0.1, 0.08);
if (EP.start) sanft(EP.start.t0 - 0.05, 0.09);

// Übergänge im Handy (gleiche Regeln wie serie.html)
function trType(prev, cur) {
  if (!prev) return 'none'; if (cur.tr) return cur.tr;
  if (prev.modal && !cur.modal) return 'close';
  if (!prev.modal && cur.modal) return prev.page === cur.page ? 'open' : 'push';
  if (prev.page !== cur.page) return 'push'; if (prev.modal !== cur.modal) return 'fade'; return 'none';
}
const shots = EP.steps.flatMap(s => s.shots);
shots.forEach((sh, i) => { const ty = trType(shots[i - 1], sh);
  if (ty === 'push' || ty === 'open') sanft(sh.t, ty === 'push' ? 0.09 : 0.08, true);
  if (ty === 'close') sanft(sh.t, 0.07, false);
});

EP.steps.forEach(s => s.fx.forEach(f => {
  if (f.k === 'tap') klick(f.t);
  if (f.k === 'checks') fertig(f.t + (f.rs.length - 1) * f.dt + 0.2);   // einmal pro Gruppe
  if (f.k === 'toast') fertig(f.t);
  if (f.k === 'scan') scanner(f.t + 0.73, 1.07, { pan: 0, gain: 0.04 });
}));

// Ende: ein sanfter Übergang
sanft(END - 0.05, 0.1);

M.write(process.argv[3] || 'ton.wav');
