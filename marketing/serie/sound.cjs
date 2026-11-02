// Soundeffekte für die Serie „Planory erklärt“ – Zeiten kommen aus folgen.js.
// node serie/sound.cjs <folge> ton.wav
// folgen.js ist eine Browser-Datei (setzt window.FOLGEN) – hier mit einem Ersatz-window laden
const _w = {}; new Function('window', 'module', require('fs').readFileSync(__dirname + '/folgen.js', 'utf8'))(_w, undefined);
const FOLGEN = _w.FOLGEN;
const EP = FOLGEN[+(process.argv[2] || 1)];
const COVER = 1.3;   // wie in serie.html
const M = require('../reel/sfx.cjs')(COVER + EP.dur, 900 + EP.nr);
// Alles nach dem Titelbild läuft um COVER versetzt
const off = f => (t, ...a) => f(t + COVER, ...a);
const [put, whoosh, riser, boom, kick, pop, tick, bell, sparkle, scanner] = ['put', 'whoosh', 'riser', 'boom', 'kick', 'pop', 'tick', 'bell', 'sparkle', 'scanner'].map(n => off(M[n]));
const { SR, TAU } = M;
const HOOK_END = EP.hookEnd || EP.steps[0].t0, PH_IN = EP.steps[0].t0, END = EP.end.t0;

// Titelbild
M.whoosh(0, 0.35, { f0: 300, f1: 2400, peak: 0.85, gain: 0.3 });
M.kick(0.12, { gain: 0.8 }); M.boom(0.12, { f0: 120, f1: 40, len: 0.7, gain: 0.5, click: 0.4, nz: 0.2, rev: 0.4 });
M.pop(0.26, { f: 560, gain: 0.25 });
for (let i = 0; i < 4; i++) M.tick(0.32 + i * 0.12, { f: 2400 + i * 300, gain: 0.05 });
M.whoosh(COVER - 0.32, 0.4, { f0: 500, f1: 3500, f2: 1200, peak: 0.6, gain: 0.35 });

// Einstieg
whoosh(0.05, 0.32, { f0: 700, f1: 3200, peak: 0.45, gain: 0.2, pan: -0.2 });
whoosh(0.3, 0.32, { f0: 700, f1: 3200, peak: 0.45, gain: 0.2, pan: 0.2 });
boom(0.45, { f0: 110, f1: 40, len: 0.8, gain: 0.55, click: 0.3, nz: 0.2, rev: 0.35 });
riser(HOOK_END - 0.4, 0.4, { f0: 300, f1: 3500, gain: 0.32, q: 0.9 });

// Intro: Marke
if (EP.brand) { const b = EP.brand.t0;
  for (let i = 0; i < 10; i++) tick(b + (0.04 + i * 0.045) / 1.4, { f: 2200 + i * 150, gain: 0.06, pan: i % 2 ? 0.2 : -0.2 });
  pop(b + 0.42 / 1.4, { f: 90, up: 0.8, len: 0.25, gain: 0.45 });
  boom(b + 0.945 / 1.4, { f0: 115, f1: 40, len: 1.0, gain: 0.8, click: 0.5, nz: 0.3, rev: 0.45 });
  whoosh(b + 0.5, 0.35, { f0: 900, f1: 3200, peak: 0.4, gain: 0.16 });
  whoosh(b + 0.95, 0.35, { f0: 900, f1: 3200, peak: 0.4, gain: 0.12 });
}
whoosh(PH_IN, 0.6, { f0: 200, f1: 1200, peak: 0.3, gain: 0.4 });   // Handy kommt

// Übergänge im Handy (gleiche Regeln wie serie.html)
function trType(prev, cur) {
  if (!prev) return 'none'; if (cur.tr) return cur.tr;
  if (prev.modal && !cur.modal) return 'close';
  if (!prev.modal && cur.modal) return prev.page === cur.page ? 'open' : 'push';
  if (prev.page !== cur.page) return 'push'; if (prev.modal !== cur.modal) return 'fade'; return 'none';
}
const shots = EP.steps.flatMap(s => s.shots);
shots.forEach((sh, i) => { const ty = trType(shots[i - 1], sh);
  if (ty === 'push') whoosh(sh.t - 0.05, 0.45, { f0: 600, f1: 2600, f2: 900, peak: 0.45, gain: 0.26, pan: x => 0.6 - 1.2 * x });
  if (ty === 'open') whoosh(sh.t, 0.4, { f0: 300, f1: 1800, peak: 0.6, gain: 0.24 });
  if (ty === 'close') whoosh(sh.t, 0.35, { f0: 1800, f1: 300, peak: 0.25, gain: 0.2 });
  if (ty === 'fade') whoosh(sh.t, 0.3, { f0: 1400, f1: 4200, peak: 0.3, q: 0.8, gain: 0.12 });
});

EP.steps.forEach((s, si) => {
  if (si > 0) whoosh(s.t0 - 0.1, 0.32, { f0: 600, f1: 2800, peak: 0.55, gain: 0.2 });
  if (!s.noNum) pop(s.t0 + 0.06, { f: 480 + si * 40, gain: 0.26 });
  s.fx.forEach(f => {
    if (f.k === 'hl') bell(f.t, { f: 1760, len: 0.35, gain: 0.05 });
    if (f.k === 'lens') { pop(f.t, { f: 540, gain: 0.28 }); whoosh(f.t - 0.05, 0.22, { f0: 900, f1: 3000, peak: 0.4, gain: 0.12 }); }
    if (f.k === 'tap') { tick(f.t, { f: 1500, gain: 0.14 }); pop(f.t + 0.01, { f: 900, up: 0.4, len: 0.08, gain: 0.18 }); }
    if (f.k === 'grow') put(f.t, f.d, (() => { let ph = 0; return (lt) => { ph += TAU * (300 + 900 * lt / f.d) / SR; return Math.sin(ph) * Math.min(1, lt * 8) * (1 - lt / f.d); }; })(), { gain: 0.08, rev: 0.3 });
    if (f.k === 'uncheck') tick(f.t + 0.02, { f: 900, gain: 0.12 });
    if (f.k === 'checks') f.rs.forEach((r, j) => { pop(f.t + j * f.dt, { f: 700 + j * 90, gain: 0.22, len: 0.12 }); tick(f.t + j * f.dt + 0.1, { f: 2600, gain: 0.05 }); });
    if (f.k === 'toast') { bell(f.t, { f: 1047, len: 0.8, gain: 0.16 }); bell(f.t + 0.12, { f: 1319, len: 0.9, gain: 0.16 }); }
    if (f.k === 'chip') whoosh(f.t, 0.3, { f0: 900, f1: 2600, peak: 0.3, gain: 0.12 });
    if (f.k === 'scan') {
      whoosh(f.t, 0.4, { f0: 1500, f1: 4500, peak: 0.25, q: 0.8, gain: 0.3, pan: -0.3 });
      pop(f.t + 0.52, { f: 2300, up: 0, len: 0.05, gain: 0.1 }); pop(f.t + 0.6, { f: 2300, up: 0, len: 0.05, gain: 0.1 });
      scanner(f.t + 0.73, 1.07, { pan: 0 });
      whoosh(f.t1 - 0.42, 0.4, { f0: 800, f1: 3600, peak: 0.75, gain: 0.3 });
    }
  });
});

// Intro: Kacheln + Start
if (EP.grid) { const g = EP.grid;
  whoosh(g.t0 - 0.1, 0.4, { f0: 500, f1: 2600, f2: 900, peak: 0.5, gain: 0.3 });
  g.items.forEach((it, i) => pop(g.t0 + 0.7 + i * 0.2, { f: 520 + i * 45, gain: 0.16, len: 0.1, pan: ((i % 3) - 1) * 0.5 }));
  bell(g.t1 - 1.0, { f: 1568, len: 0.7, gain: 0.14 });
}
if (EP.start) { const r = EP.start;
  whoosh(r.t0 - 0.1, 0.35, { f0: 600, f1: 3000, peak: 0.6, gain: 0.3 });
  kick(r.t0 + 0.2, { gain: 0.9 }); boom(r.t0 + 0.2, { f0: 120, f1: 38, len: 1.0, gain: 0.7, click: 0.5, nz: 0.3, rev: 0.45 });
}

// Ende
whoosh(END - 0.1, 0.5, { f0: 300, f1: 2200, f2: 600, peak: 0.5, gain: 0.45, rev: 0.3 });
for (let i = 0; i < 10; i++) tick(END + 0.05 + (0.04 + i * 0.045) / 2.1, { f: 2200 + i * 150, gain: 0.05, pan: i % 2 ? 0.2 : -0.2 });
pop(END + 0.05 + 0.42 / 2.1, { f: 90, up: 0.8, len: 0.25, gain: 0.4 });
boom(END + 0.05 + 0.945 / 2.1, { f0: 110, f1: 40, len: 1.1, gain: 0.75, click: 0.5, nz: 0.3, rev: 0.5 });
sparkle(END + 0.5, 0.45, { n: 9, gain: 0.05 });
pop(END + 0.7, { f: 620, gain: 0.25 });
pop(END + 0.85, { f: 760, gain: 0.32 });
put(END + 1.4, 0.55, (() => { let ph = 0; return (lt) => { ph += TAU * (3000 + 5000 * lt / 0.55) / SR; return Math.sin(ph) * Math.sin(Math.PI * lt / 0.55); }; })(), { gain: 0.05, pan: x => -0.6 + 1.2 * x, rev: 0.5 });

M.write(process.argv[3] || 'ton.wav');
