// Setzt die App-Bilder (site/img/<name>-<de|en>.webp) in einen modernen iPhone-Rahmen – wie im App Store:
// Titan-Rahmen, Dynamic Island, iOS-Statusleiste (9:41), Home-Balken, Seitentasten, transparenter Hintergrund.
// Aufruf: node site-quelle/geraete.mjs   → site/img/geraet/<name>-<de|en>.webp
// (Nach `node site-quelle/screens.mjs` erneut ausführen.)
const { chromium } = (await import('/opt/node22/lib/node_modules/playwright/index.js')).default;
import { readFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const IN = ROOT + '/site/img', OUT = ROOT + '/site/img/geraet';
mkdirSync(OUT, { recursive: true });
const NAMEN = ['start', 'budget', 'kosten', 'scan', 'angebote', 'zahlungsplan', 'zeitplan', 'aufgaben', 'tagebuch', 'plaene', 'dokumente', 'maengel', 'helfer', 'wartung'];

// Maße in CSS-Pixeln (iPhone 15 Pro: 70,6 × 146,6 mm)
const W = 430, H = 893, RAND = 5, BEZEL = 13;
const html = bild => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:transparent}
.wrap{position:relative;width:${W + 8}px;height:${H}px;padding:0 4px}
.taste{position:absolute;width:4px;border-radius:2px;background:linear-gradient(90deg,#2a2b2f,#5d6066 60%,#2a2b2f)}
.l{left:0}.r{right:0}
.geraet{position:absolute;left:4px;top:0;width:${W}px;height:${H}px;border-radius:74px;
  background:linear-gradient(140deg,#6b6e74 0%,#2e3034 16%,#16171a 48%,#2e3034 82%,#62656b 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),inset 0 0 2px 2px rgba(0,0,0,.6)}
.bezel{position:absolute;inset:${RAND}px;border-radius:${74 - RAND}px;background:#050506}
.screen{position:absolute;inset:${RAND + BEZEL}px;border-radius:${74 - RAND - BEZEL}px;overflow:hidden;background:#fff}
.status{position:absolute;left:0;right:0;top:0;height:54px;background:#fff;z-index:2;font:600 17px/1 'Inter',-apple-system,sans-serif;color:#000;letter-spacing:-.01em}
.zeit{position:absolute;left:46px;top:19px}
.icons{position:absolute;right:26px;top:19px;display:flex;gap:6px;align-items:center}
.island{position:absolute;left:50%;top:11px;width:124px;height:36px;margin-left:-62px;border-radius:20px;background:#000;z-index:3}
.app{position:absolute;left:0;right:0;top:54px;bottom:0;background:url(${bild}) top center/100% auto no-repeat}
.home{position:absolute;left:50%;bottom:8px;width:136px;height:5px;margin-left:-68px;border-radius:3px;background:rgba(0,0,0,.82);z-index:3}
.glanz{position:absolute;inset:${RAND + BEZEL}px;border-radius:${74 - RAND - BEZEL}px;background:linear-gradient(115deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 38%);pointer-events:none;z-index:4}
</style></head><body><div class="wrap">
<div class="taste l" style="top:178px;height:34px"></div>
<div class="taste l" style="top:244px;height:64px"></div>
<div class="taste l" style="top:322px;height:64px"></div>
<div class="taste r" style="top:268px;height:100px"></div>
<div class="geraet"><div class="bezel"></div><div class="screen">
  <div class="status"><span class="zeit">9:41</span>
    <span class="icons">
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.2-1.3C14 1.6 11.4.5 8.5.5S3 1.6 1 3.5l1.2 1.3C3.9 3.2 6.1 2.3 8.5 2.3zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C12.1 4.8 10.4 4.1 8.5 4.1s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.6c-.6 0-1.2.2-1.6.6L8.5 11.8l1.6-1.7c-.4-.4-1-.6-1.6-.6z"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.6" fill="none" stroke="#000" stroke-opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.3"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill-opacity=".45"/></svg>
    </span></div>
  <div class="island"></div>
  <div class="app"></div>
  <div class="home"></div>
</div><div class="glanz"></div></div>
</div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W + 8, height: H }, deviceScaleFactor: 1.6 });
for (const name of NAMEN) for (const lang of ['de', 'en']) {
  const quelle = `${IN}/${name}-${lang}.webp`;
  if (!existsSync(quelle)) throw new Error('fehlt: ' + quelle);
  const daten = 'data:image/webp;base64,' + readFileSync(quelle).toString('base64');
  await p.setContent(html(daten));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(100);
  const png = `/tmp/pl-geraet-${name}-${lang}.png`;
  await p.locator('.wrap').screenshot({ path: png, omitBackground: true });
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', '84', '-compression_level', '6', '-pix_fmt', 'yuva420p', `${OUT}/${name}-${lang}.webp`]);
  unlinkSync(png);
  console.log('✓', name, lang);
}
await b.close();
