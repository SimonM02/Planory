// Soundeffekte fürs Baustellen-Reel (Bausteine: ../reel/sfx.cjs). Zeiten = reel2.html
// node reel2/sound.cjs ton.wav
const M = require('../reel/sfx.cjs')(17, 815);
const { put, whoosh, riser, boom, kick, snap, pop, tick, bell, sparkle, scanner, SR, TAU } = M;
const B = 3, C = 6, D = 9, Ew = [12, 12.4, 12.8, 13.2, 13.6], EF = 14.0, F = 14.4;
const cut = (t, g = 0.5) => { kick(t, { gain: g, f0: 140 }); whoosh(t - 0.18, 0.22, { f0: 800, f1: 5000, peak: 0.95, gain: 0.18 }); };

// A – Einstieg
whoosh(0.0, 0.6, { f0: 200, f1: 1200, peak: 0.8, gain: 0.3, rev: 0.35 });
whoosh(0.2, 0.35, { f0: 700, f1: 3200, peak: 0.45, gain: 0.2, pan: -0.3 });
whoosh(1.0, 0.35, { f0: 700, f1: 3200, peak: 0.45, gain: 0.22, pan: -0.3 });
boom(1.1, { f0: 100, f1: 38, len: 1.0, gain: 0.7, click: 0.3, nz: 0.25, rev: 0.4 });
riser(2.45, 0.55, { f0: 300, f1: 4000, gain: 0.35, q: 0.9 });
// B – Budget
cut(B, 0.6);
whoosh(B + 0.1, 0.6, { f0: 250, f1: 1600, peak: 0.35, gain: 0.4, pan: 0.4 });
pop(B + 0.55, { f: 520, gain: 0.3, pan: -0.5 });
{ const oc = x => 1 - Math.pow(1 - x, 3); let last = -1, lt = -1;
  for (let t = B + 0.7; t <= B + 1.6; t += 0.001) { const v = Math.round(30 * oc((t - B - 0.7) / 0.9)); if (v !== last && t - lt > 0.024) { tick(t, { f: 4200, gain: 0.05, pan: -0.45 }); lt = t; } last = v; }
  for (let s = 1; s <= 22; s++) tick(B + 0.8 + (1 - Math.cbrt(1 - s / 22)), { f: 3300, gain: 0.04, pan: -0.3 }); }
whoosh(C - 0.22, 0.3, { f0: 600, f1: 2500, peak: 0.7, gain: 0.25 });
// C – Rechnung
cut(C, 0.55);
pop(C + 0.36, { f: 2300, up: 0, len: 0.05, gain: 0.12 }); pop(C + 0.44, { f: 2300, up: 0, len: 0.05, gain: 0.12 });
tick(C + 0.5, { f: 1200, gain: 0.12 });
scanner(C + 0.58, 0.76, { pan: 0 });
whoosh(C + 1.42, 0.3, { f0: 900, f1: 3000, peak: 0.4, gain: 0.14 });
pop(C + 1.45, { f: 600, gain: 0.3 });
bell(C + 1.6, { f: 1047, len: 0.9, gain: 0.2 }); bell(C + 1.72, { f: 1319, len: 1.0, gain: 0.2 });
whoosh(D - 0.15, 0.25, { f0: 600, f1: 2500, peak: 0.7, gain: 0.22 });
// D – Zeitplan
cut(D, 0.55);
pop(D + 0.35, { f: 480, gain: 0.28, pan: -0.3 });
for (let i = 0; i < 4; i++) tick(D + 0.47 + i * 0.08, { f: 2600 + i * 200, gain: 0.05, pan: -0.4 });
for (const tc of [9.7, 10.25]) { pop(tc, { f: 700, gain: 0.3, pan: -0.5 }); tick(tc + 0.12, { f: 2600, gain: 0.08, pan: -0.5 }); sparkle(tc + 0.04, 0.3, { n: 6, gain: 0.05, pan: -0.5 }); }
bell(10.72, { f: 1568, len: 0.6, gain: 0.14 }); bell(10.83, { f: 2349, len: 0.7, gain: 0.13 });
// E – Wort-Schnitte
riser(11.62, 0.38, { f0: 300, f1: 5000, gain: 0.5, q: 0.9 });
Ew.forEach((t, i) => { kick(t, { gain: 0.95 }); snap(t, { gain: 0.32, f: 1700 + i * 150 }); });
boom(EF, { f0: 130, f1: 38, len: 1.0, gain: 0.95, click: 0.7, nz: 0.4, rev: 0.45 });
snap(EF, { gain: 0.28, f: 2400, rev: 0.5 }); whoosh(EF, 0.6, { f0: 6000, f1: 2500, peak: 0.03, gain: 0.2, q: 0.7, rev: 0.5 });
// F – Abschluss
whoosh(F - 0.2, 0.6, { f0: 300, f1: 2000, f2: 500, peak: 0.4, gain: 0.45, rev: 0.35 });
for (let i = 0; i < 10; i++) tick(F + 0.1 + (0.04 + i * 0.045) / 2.1, { f: 2200 + i * 150, gain: 0.05, pan: i % 2 ? 0.2 : -0.2 });
pop(F + 0.1 + 0.42 / 2.1, { f: 90, up: 0.8, len: 0.25, gain: 0.4 });
boom(F + 0.1 + 0.945 / 2.1, { f0: 110, f1: 40, len: 1.2, gain: 0.8, click: 0.5, nz: 0.3, rev: 0.5 });
sparkle(F + 0.56, 0.45, { n: 10, gain: 0.06 });
whoosh(F + 0.3, 0.3, { f0: 900, f1: 3200, peak: 0.4, gain: 0.14 });
pop(F + 0.72, { f: 760, gain: 0.34 });
whoosh(F + 0.85, 0.3, { f0: 900, f1: 3200, peak: 0.4, gain: 0.1 });
put(F + 1.15, 0.55, (() => { let ph = 0; return (lt) => { ph += TAU * (3000 + 5000 * lt / 0.55) / SR; return Math.sin(ph) * Math.sin(Math.PI * lt / 0.55); }; })(), { gain: 0.05, pan: x => -0.6 + 1.2 * x, rev: 0.5 });
sparkle(F + 1.2, 0.5, { n: 7, gain: 0.05 });

M.write(process.argv[2] || 'ton.wav');
console.log('ok');
