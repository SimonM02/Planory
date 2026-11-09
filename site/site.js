// Planory-Website (Unterseiten: Funktionen, Preise, Über, Hilfe, Rechtliches).
// Die Startseite steckt in index.html und nutzt dort dieselben Regeln (lpApplyLang usw.).
(function () {
  'use strict';
  // ── Sprache: gleicher Speicher wie die App ('planoryLang'); Suchmaschinen immer Deutsch ──
  var BOT = /Googlebot|Google-InspectionTool|AdsBot-Google|Storebot-Google|bingbot|BingPreview|DuckDuckBot|YandexBot|Baiduspider|Applebot|Slurp|facebookexternalhit|crawler|spider/i.test(navigator.userAgent || '');
  function gespeichert() { try { return localStorage.getItem('planoryLang'); } catch (e) { return null; } }
  var lang = gespeichert() || ((BOT || (navigator.language || 'de').toLowerCase().indexOf('de') === 0) ? 'de' : 'en');

  function anwenden() {
    var en = lang === 'en';
    document.querySelectorAll('[data-en]').forEach(function (el) {
      if (el._de === undefined) el._de = el.innerHTML;
      el.innerHTML = en ? el.getAttribute('data-en') : el._de;
    });
    document.querySelectorAll('[data-en-src]').forEach(function (el) {
      if (el._deSrc === undefined) el._deSrc = el.getAttribute('src');
      el.setAttribute('src', en ? el.getAttribute('data-en-src') : el._deSrc);
    });
    document.querySelectorAll('[data-en-alt]').forEach(function (el) {
      if (el._deAlt === undefined) el._deAlt = el.getAttribute('alt');
      el.setAttribute('alt', en ? el.getAttribute('data-en-alt') : el._deAlt);
    });
    document.querySelectorAll('[data-en-title]').forEach(function (el) {
      if (el._deTitle === undefined) el._deTitle = el.getAttribute('data-de-title') || document.title;
      document.title = en ? el.getAttribute('data-en-title') : el._deTitle;
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === lang); });
    document.documentElement.lang = en ? 'en' : 'de';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (b) { lang = b.getAttribute('data-lang') === 'en' ? 'en' : 'de'; try { localStorage.setItem('planoryLang', lang); } catch (x) {} anwenden(); return; }
    var m = e.target.closest('[data-menu]');
    if (m) { var k = m.closest('.s-kopf'); var auf = !k.classList.contains('offen'); k.classList.toggle('offen', auf); m.setAttribute('aria-expanded', auf ? 'true' : 'false'); return; }
    // Menü schließt nach Klick auf einen Eintrag (Anker auf derselben Seite)
    var a = e.target.closest('.s-menu a');
    if (a) { var kk = a.closest('.s-kopf'); kk.classList.remove('offen'); var mk = kk.querySelector('[data-menu]'); if (mk) mk.setAttribute('aria-expanded', 'false'); }
  });

  // ── „Für iPhone laden“: Link kommt (wie in der App) vom Server, erscheint nur wenn vorhanden ──
  function appStore() {
    var links = document.querySelectorAll('.lp-appstore');
    if (!links.length || !window.fetch) return;
    fetch('https://bauplan-weld.vercel.app/api/app-version').then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !/^https:\/\/apps\.apple\.com\//.test(String(j.url || ''))) return;
      links.forEach(function (a) { a.href = j.url; a.style.display = ''; });
    }).catch(function () {});
  }

  // ── Funktionen-Seite: Planverzeichnis markiert den sichtbaren Abschnitt ──
  function verzeichnis() {
    var links = document.querySelectorAll('.s-verz a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('aktiv'); });
        var a = map[en.target.id]; if (a) a.classList.add('aktiv');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  anwenden();
  appStore();
  verzeichnis();
})();
