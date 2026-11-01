// Soundeffekte fürs Planory-Reel 1 (Bausteine: sfx.cjs).
// node reel/sound.cjs ton.wav   -> 48 kHz Stereo, 16,5 s, Zeitpunkte = reel.html
const M = require('./sfx.cjs')(16.5);
const { SR, TAU, put, whoosh, riser, boom, kick, snap, pop, tick, bell, sparkle, glitch, scanner, paper } = M;

// ---------------- Ablauf (Zeiten wie reel.html) ----------------
// 1 Hook
whoosh(0.0, 0.45, { f0: 250, f1: 1400, peak: 0.75, gain: 0.3, rev: 0.3 });
for (let i = 0; i < 10; i++) tick(0.04 + i * 0.045, { f: 2000 + i * 160, gain: 0.07, pan: i % 2 ? 0.25 : -0.25 });
whoosh(0.28, 0.3, { f0: 700, f1: 3200, peak: 0.45, gain: 0.22, pan: -0.2 });
whoosh(0.42, 0.3, { f0: 700, f1: 3200, peak: 0.45, gain: 0.22, pan: 0.2 });
pop(0.45, { f: 85, up: 0.8, len: 0.3, gain: 0.55, rev: 0.15 });          // Haus wächst
pop(0.55, { f: 900, gain: 0.16 }); pop(0.74, { f: 1250, gain: 0.14 });
put(0.8, 0.15, (() => { let ph = 0; return (lt) => { ph += TAU * (1900 - 9000 * lt) / SR; return Math.sin(ph) * (lt / 0.15); }; })(), { gain: 0.07, rev: 0.2 }); // Dach fällt
whoosh(0.78, 0.18, { f0: 3000, f1: 900, peak: 0.8, gain: 0.25 });
boom(0.945, { f0: 120, f1: 40, len: 0.9, gain: 0.95, click: 0.6, nz: 0.35, rev: 0.3 }); // Dach landet
kick(1.091, { gain: 0.22, f0: 140 }); tick(1.164, { f: 900, gain: 0.08 });
whoosh(1.16, 0.4, { f0: 1500, f1: 4500, peak: 0.35, gain: 0.18, pan: x => -0.3 + 0.6 * x }); // Unterstreichen
// Wischblende
whoosh(1.84, 0.6, { f0: 300, f1: 2600, f2: 700, peak: 0.45, gain: 0.75, pan: x => -0.8 + 1.6 * x, rev: 0.25 });
// 2 Zettelchaos
[300, 770, 230, 820, 690, 560, 190, 870, 440, 520, 150, 860, 640].forEach((x, i) => paper(2.13 + i * 0.032, (x - 540) / 540));
whoosh(2.18, 0.3, { f0: 600, f1: 2600, peak: 0.4, gain: 0.2 }); whoosh(2.28, 0.3, { f0: 600, f1: 2600, peak: 0.4, gain: 0.2 });
glitch(2.42, 0.14); glitch(2.93, 0.07, { gain: 0.13 });
riser(3.12, 0.5, { f0: 250, f1: 4200, gain: 0.6, q: 0.9, rev: 0.15 });          // Sog
boom(3.62, { f0: 95, f1: 32, len: 1.2, gain: 1.0, click: 0.5, nz: 0.5, rev: 0.4 }); // Druckwelle
whoosh(3.62, 0.7, { f0: 2500, f1: 400, peak: 0.08, gain: 0.35, rev: 0.4 });
// 3 Budget
whoosh(3.74, 0.3, { f0: 800, f1: 3000, peak: 0.4, gain: 0.12 });
pop(4.05, { f: 520, gain: 0.32, pan: -0.5 }); pop(4.4, { f: 660, gain: 0.3, pan: 0.45 });
{ const oc = x => 1 - Math.pow(1 - x, 3); let last = -1, lt = -1;
  for (let t = 4.2; t <= 5.05; t += 0.001) { const v = Math.round(30 * oc((t - 4.2) / 0.85)); if (v !== last && t - lt > 0.024) { tick(t, { f: 4200, gain: 0.05, pan: -0.45 }); lt = t; } last = v; }
  for (let s = 1; s <= 24; s++) { const t = 4.5 + 0.9 * (1 - Math.cbrt(1 - s / 24)); tick(t, { f: 3300, gain: 0.045, pan: 0.45 }); } }
// Schwenk
whoosh(5.86, 0.46, { f0: 500, f1: 3200, f2: 900, peak: 0.55, gain: 0.7, pan: x => 0.8 - 1.6 * x, rev: 0.2 });
// 4 Rechnung
whoosh(6.2, 0.32, { f0: 1500, f1: 4500, peak: 0.25, q: 0.8, gain: 0.3, pan: -0.5 });
pop(6.62, { f: 2300, up: 0, len: 0.05, gain: 0.12, pan: -0.35 }); pop(6.7, { f: 2300, up: 0, len: 0.05, gain: 0.12, pan: -0.35 });
tick(6.68, { f: 1200, gain: 0.12, pan: -0.35 });
scanner(6.78, 0.56);
bell(7.023, { f: 1760, len: 0.4, gain: 0.08, pan: -0.35 }); bell(7.051, { f: 2093, len: 0.4, gain: 0.08, pan: -0.35 });
bell(7.126, { f: 2637, len: 0.45, gain: 0.09, pan: -0.35 });
whoosh(7.3, 0.36, { f0: 800, f1: 3600, peak: 0.75, gain: 0.4, pan: x => -0.45 + 0.9 * x });
pop(7.6, { f: 420, gain: 0.25, pan: 0.4 });
whoosh(7.55, 0.28, { f0: 900, f1: 3000, peak: 0.4, gain: 0.12 });
bell(7.7, { f: 1047, len: 0.9, gain: 0.2, pan: -0.3 }); bell(7.82, { f: 1319, len: 1.0, gain: 0.2, pan: -0.3 });
// Übergang + 5 Zeitplan/Aufgaben
whoosh(8.36, 0.4, { f0: 400, f1: 2400, peak: 0.7, gain: 0.5 });
whoosh(8.56, 0.35, { f0: 200, f1: 1000, peak: 0.25, gain: 0.3, pan: -0.45 }); whoosh(8.68, 0.35, { f0: 200, f1: 1000, peak: 0.25, gain: 0.3, pan: 0.45 });
bell(9.3, { f: 1568, len: 0.6, gain: 0.14, pan: 0.1 }); bell(9.41, { f: 2349, len: 0.7, gain: 0.13, pan: 0.1 });   // Benachrichtigung
whoosh(9.5, 0.26, { f0: 1200, f1: 3500, peak: 0.3, gain: 0.2, pan: x => -0.9 + 0.5 * x });
whoosh(9.62, 0.26, { f0: 1200, f1: 3500, peak: 0.3, gain: 0.2, pan: x => -0.9 + 0.5 * x });
for (const tc of [9.95, 10.3]) { pop(tc, { f: 700, gain: 0.32, pan: -0.55 }); tick(tc + 0.12, { f: 2600, gain: 0.08, pan: -0.55 }); sparkle(tc + 0.04, 0.3, { n: 6, gain: 0.05, pan: -0.5 }); }
// Steigerung + 6 Wort-Schnitte
riser(10.72, 0.33, { f0: 300, f1: 5000, gain: 0.5, q: 0.9 });
[11.05, 11.41, 11.77, 12.13, 12.49].forEach((t, i) => { kick(t, { gain: 0.95 }); snap(t, { gain: 0.32, f: 1700 + i * 150 });
  whoosh(t - 0.12, 0.14, { f0: 1500, f1: 6000, peak: 0.95, gain: 0.1 }); });
boom(12.85, { f0: 130, f1: 38, len: 1.1, gain: 1.0, click: 0.7, nz: 0.4, rev: 0.45 });
snap(12.85, { gain: 0.3, f: 2400, rev: 0.5 }); whoosh(12.85, 0.9, { f0: 6000, f1: 2500, peak: 0.03, gain: 0.25, q: 0.7, rev: 0.5 });
for (let k = 0; k < 6; k++) pop(12.85 + k * 0.045, { f: 900 + k * 180, gain: 0.12, len: 0.1, pan: -0.6 + k * 0.24 });
whoosh(13.15, 0.35, { f0: 800, f1: 2800, peak: 0.4, gain: 0.14 });
// 7 Abschluss (+0,97 s)
whoosh(14.17, 0.5, { f0: 300, f1: 2200, f2: 600, peak: 0.5, gain: 0.5, rev: 0.3 });
for (let i = 0; i < 10; i++) tick(14.27 + (0.04 + i * 0.045) / 2.1, { f: 2200 + i * 150, gain: 0.05, pan: i % 2 ? 0.2 : -0.2 });
pop(14.47, { f: 90, up: 0.8, len: 0.25, gain: 0.4 });
boom(14.72, { f0: 110, f1: 40, len: 1.2, gain: 0.8, click: 0.5, nz: 0.3, rev: 0.5 });
sparkle(14.73, 0.45, { n: 10, gain: 0.06 });
whoosh(14.45, 0.3, { f0: 900, f1: 3200, peak: 0.4, gain: 0.14 });
pop(14.89, { f: 760, gain: 0.34 });
whoosh(14.99, 0.3, { f0: 900, f1: 3200, peak: 0.4, gain: 0.1 });
put(15.27, 0.6, (() => { let ph = 0; return (lt) => { ph += TAU * (3000 + 5000 * lt / 0.6) / SR; return Math.sin(ph) * Math.sin(Math.PI * lt / 0.6); }; })(), { gain: 0.05, pan: x => -0.6 + 1.2 * x, rev: 0.5 });
sparkle(15.3, 0.5, { n: 7, gain: 0.05 });

M.write(process.argv[2] || 'ton.wav');
console.log('ok');
