// Reel neu rendern: im Ordner marketing/ 'python3 -m http.server 8765' starten, dann z. B.
// node reel/render.cjs full frames 4   (Bilder) -> ffmpeg tmix 4 + select (siehe PROJEKT-HANDBUCH)
// node reel/render.cjs stills 1.5,5,14.9 stills   (Einzelbilder zum Prüfen)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [, , mode, a, b, c] = process.argv;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await page.goto('http://127.0.0.1:8765/reel/reel.html');
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  if (mode === 'stills') {
    const out = b; fs.mkdirSync(out, { recursive: true });
    for (const t of a.split(',').map(Number)) {
      await page.evaluate(t => render(t), t);
      await page.screenshot({ path: `${out}/s_${t.toFixed(2)}.png` });
    }
  } else {
    const out = a, SUB = +(b || 1), FPS = 30, N = 450, SHUT = 0.5;
    const [K0, K1] = (c || '0-450').split('-').map(Number);
    fs.mkdirSync(out, { recursive: true });
    const t0 = Date.now();
    for (let k = K0; k < K1; k++) {
      let idx = k * SUB;
      for (let j = 0; j < SUB; j++) {
        const off = SUB > 1 ? ((j + 0.5) / SUB - 0.5) * SHUT / FPS : 0;
        const t = Math.max(0, Math.min(15, k / FPS + off));
        await page.evaluate(t => render(t), t);
        await page.screenshot({ path: `${out}/f_${String(idx++).padStart(5, '0')}.png` });
      }
      if (k % 50 === 0) console.log(K0, 'frame', k, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  }
  await browser.close();
})();
