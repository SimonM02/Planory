// Soundeffekte fürs Planory-Reel (selbst erzeugt, keine fremden Samples/Musik).
// node reel/sound.cjs ton.wav   -> 48 kHz Stereo, 16,5 s, Zeitpunkte = reel.html
const fs = require('fs');
const SR = 48000, DUR = 16.5, N = Math.round(SR * DUR);
const L = new Float64Array(N), R = new Float64Array(N), VL = new Float64Array(N), VR = new Float64Array(N);
let seed = 4711; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rand() * 2 - 1;
const TAU = 2 * Math.PI;

class BQ { // RBJ-Biquad
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, q) {
    f = Math.min(Math.max(f, 20), SR * 0.45);
    const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a; this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = -2 * c / a0; this.a2 = (1 - a) / a0;
    return this;
  }
  p(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
// Klang an Zeitpunkt t0 einmischen; pan -1 links … +1 rechts (Zahl oder Funktion von 0..1)
function put(t0, len, gen, { gain = 1, pan = 0, rev = 0.15 } = {}) {
  const i0 = Math.round(t0 * SR), n = Math.round(len * SR);
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i < 0 || i >= N) continue;
    const lt = k / SR, edge = Math.min(1, lt * 2000, (len - lt) * 400);
    const v = gen(lt, k) * gain * edge;
    const pn = typeof pan === 'function' ? pan(lt / len) : pan, a = (pn + 1) * Math.PI / 4;
    const gl = Math.cos(a), gr = Math.sin(a);
    L[i] += v * gl; R[i] += v * gr; VL[i] += v * gl * rev; VR[i] += v * gr * rev;
  }
}
// gefiltertes Rauschen mit Frequenz-Verlauf f0 -> f1 (-> f2)
function whoosh(t0, len, { f0 = 400, f1 = 3000, f2 = null, peak = 0.6, q = 1.1, gain = 0.5, pan = 0, rev = 0.2, curve = 2 } = {}) {
  const bp = new BQ(), lp = new BQ().set('lp', 10000, 0.7); let comp = 1;
  put(t0, len, (lt, k) => {
    const x = lt / len;
    const f = f2 == null ? f0 * Math.pow(f1 / f0, x)
      : x < peak ? f0 * Math.pow(f1 / f0, x / peak) : f1 * Math.pow(f2 / f1, (x - peak) / (1 - peak));
    if (k % 16 === 0) { bp.set('bp', f, q); comp = Math.min(9, Math.sqrt(q * 12000 / f)); }
    const e = x < peak ? Math.pow(x / peak, curve) : Math.pow(1 - (x - peak) / (1 - peak), 1.6);
    return lp.p(bp.p(noise())) * comp * e;
  }, { gain, pan, rev });
}
// Sog / Steigerung: wird lauter und höher, endet hart
const riser = (t0, len, o = {}) => whoosh(t0, len, { peak: 0.985, curve: 2.6, ...o });
function boom(t0, { f0 = 110, f1 = 36, len = 0.9, gain = 1, click = 0.5, nz = 0.3, rev = 0.25, pan = 0, drive = 1.2 } = {}) {
  let ph = 0; const lp = new BQ().set('lp', 1600, 0.7), hp = new BQ().set('hp', 1800, 0.7);
  put(t0, len, (lt) => {
    const f = f1 + (f0 - f1) * Math.exp(-lt * 14); ph += TAU * f / SR;
    const body = Math.sin(ph) * Math.exp(-lt * (3.4 / len));
    const cl = hp.p(noise()) * Math.exp(-lt * 140) * click;
    const n = lp.p(noise()) * Math.exp(-lt * 8) * nz * 3;
    return Math.tanh((body * 1.3 + cl + n) * drive);
  }, { gain, pan, rev });
}
const kick = (t0, o = {}) => boom(t0, { f0: 170, f1: 48, len: 0.42, click: 0.7, nz: 0.04, rev: 0.06, drive: 1.6, ...o });
function snap(t0, { gain = 0.4, pan = 0, f = 1900, rev = 0.25 } = {}) {
  const bp = new BQ().set('bp', f, 0.9);
  put(t0, 0.22, (lt) => {
    let e = 0; for (const d of [0, 0.011, 0.022]) if (lt >= d) e += Math.exp(-(lt - d) * 260);
    e += 0.5 * Math.exp(-lt * 28);
    return bp.p(noise()) * 4 * e;
  }, { gain, pan, rev });
}
function pop(t0, { f = 600, len = 0.16, gain = 0.35, pan = 0, rev = 0.12, up = 1.2 } = {}) {
  let ph = 0;
  put(t0, len, (lt) => { const fr = f * (1 + up * (1 - Math.exp(-lt * 60))); ph += TAU * fr / SR;
    return Math.sin(ph) * Math.exp(-lt * 28); }, { gain, pan, rev });
}
function tick(t0, { f = 3500, gain = 0.1, pan = 0, rev = 0.05 } = {}) {
  let ph = 0;
  put(t0, 0.03, (lt) => { ph += TAU * f / SR; return (Math.sin(ph) * 0.7 + noise() * 0.3) * Math.exp(-lt * 240); }, { gain, pan, rev });
}
function bell(t0, { f = 1047, len = 0.8, gain = 0.2, pan = 0, rev = 0.35 } = {}) {
  let a = 0, b = 0, c = 0;
  put(t0, len, (lt) => { a += TAU * f / SR; b += TAU * f * 2.756 / SR; c += TAU * f * 5.404 / SR;
    return Math.sin(a) * Math.exp(-lt * 5) + 0.35 * Math.sin(b) * Math.exp(-lt * 11) + 0.15 * Math.sin(c) * Math.exp(-lt * 20); },
  { gain, pan, rev });
}
function sparkle(t0, len, { n = 8, gain = 0.07, pan = 0, fmin = 3200, fmax = 7200 } = {}) {
  for (let i = 0; i < n; i++) bell(t0 + rand() * len, { f: fmin + rand() * (fmax - fmin), len: 0.3, gain: gain * (0.6 + rand() * 0.4), pan: Math.max(-1, Math.min(1, pan + (rand() - 0.5) * 0.9)), rev: 0.4 });
}
function glitch(t0, len, { gain = 0.16, pan = 0 } = {}) {
  let ph = 0, f = 400;
  put(t0, len, (lt, k) => { if (k % 600 === 0) f = 180 + rand() * 2200; ph += TAU * f / SR;
    const on = Math.floor(k / 300) % 3 !== 2 ? 1 : 0;
    return (Math.round(Math.sign(Math.sin(ph)) * 3) / 3 * 0.6 + noise() * 0.2) * on; }, { gain, pan, rev: 0.05 });
}
function scanner(t0, len, { gain = 0.12, pan = -0.3 } = {}) {
  let a = 0, b = 0; const bp = new BQ();
  put(t0, len, (lt, k) => { const x = lt / len, f = 900 + 1500 * x; a += TAU * f / SR; b += TAU * f * 1.5 / SR;
    if (k % 16 === 0) bp.set('bp', f * 2, 4);
    const trem = 0.7 + 0.3 * Math.sin(TAU * 28 * lt), e = Math.min(1, x * 8, (1 - x) * 8);
    return (Math.sin(a) * 0.45 + Math.sin(b) * 0.18 + bp.p(noise()) * 1.4) * trem * e; }, { gain, pan, rev: 0.15 });
}
const paper = (t0, pan, g = 0.13) => whoosh(t0, 0.17, { f0: 2200, f1: 5200, peak: 0.3, q: 0.8, gain: g, pan, rev: 0.1 });

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

// ---------------- Hall + Ausgabe ----------------
function reverb(inp, combs, aps) {
  const out = new Float64Array(N), cs = combs.map(d => ({ b: new Float64Array(d), i: 0, lp: 0 }));
  for (let n = 0; n < N; n++) { const x = inp[n]; let s = 0;
    for (const c of cs) { const y = c.b[c.i]; c.lp = y * 0.75 + c.lp * 0.25; c.b[c.i] = x + c.lp * 0.82; c.i = (c.i + 1) % c.b.length; s += y; }
    out[n] = s / cs.length; }
  for (const d of aps) { const b = new Float64Array(d); let i = 0;
    for (let n = 0; n < N; n++) { const bo = b[i], y = -out[n] + bo; b[i] = out[n] + bo * 0.5; i = (i + 1) % d; out[n] = y; } }
  return out;
}
{ const h1 = new BQ().set('hp', 350, 0.7), h2 = new BQ().set('hp', 350, 0.7); // kein Dröhnen im Hall
  for (let n = 0; n < N; n++) { VL[n] = h1.p(VL[n]); VR[n] = h2.p(VR[n]); } }
const WL = reverb(VL, [1694, 1760, 1622, 1547, 1390, 1475, 1293, 1214], [605, 480, 371, 245]);
const WR = reverb(VR, [1719, 1785, 1647, 1572, 1415, 1500, 1318, 1239], [605, 480, 371, 245]);
const hpL = new BQ().set('hp', 28, 0.7), hpR = new BQ().set('hp', 28, 0.7);
let peak = 0; const OL = new Float64Array(N), OR = new Float64Array(N);
for (let n = 0; n < N; n++) {
  const t = n / SR, f = Math.min(1, (DUR - t) / 0.3);
  OL[n] = hpL.p(L[n] + WL[n] * 1.3) * f; OR[n] = hpR.p(R[n] + WR[n] * 1.3) * f;
  peak = Math.max(peak, Math.abs(OL[n]), Math.abs(OR[n]));
}
const g = 0.95 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) { buf.writeInt16LE(Math.round(OL[n] * g * 32767), 44 + n * 4); buf.writeInt16LE(Math.round(OR[n] * g * 32767), 46 + n * 4); }
fs.writeFileSync(process.argv[2] || 'ton.wav', buf);
console.log('ok, Spitze vorher', peak.toFixed(2));
