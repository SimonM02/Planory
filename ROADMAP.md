# Planory – Roadmap & offene Aufgaben

Stand: 11.07.2026 · App Store: Version 1.1 (Build 5) veröffentlicht

## ✅ Erledigt / live

- App im App Store (weltweit, inkl. EU nach DSA-Erklärung „kein Händler")
- Version 1.1: Sperrbildschirm-Erinnerungen, iOS-Zoom-Fix, Karten-Ansichten
  (Budget, Kosten, Angebote, Rechnungen), App-eigene Dialoge, viele Bugfixes
- Web (planory.at): neues Abo-Modell live – 1 Monat gratis, dann Nur-Lese-Modus
  (Ansehen + Abhaken frei), Paywall mit 3,99 €/Monat & 28,99 €/Jahr

## ‼️ OFFENER MANUELLER SCHRITT (vom User zu erledigen)

- **Vercel + planory.at trennen richtig verkabeln:** planory.at läuft auf
  GitHub Pages (kann keine /api-Funktionen ausführen → 405/500 bei
  Stripe/KI/Push). Die API läuft nur auf der Vercel-Adresse (Projekt
  „bauplan-weld"). Claude muss `API_BASE` im Code auf die Vercel-`.vercel.app`-
  Adresse setzen → dafür muss der User die genaue Vercel-URL nennen.
  ERST DANN funktionieren Bezahlen/KI/Push auf planory.at und in der App.

## 🔴 Phase A – sofort (diese Woche)

1. **Stripe-Preise anlegen** (3,99 €/Monat, 28,99 €/Jahr, alten Preis archivieren)
   → dann in Vercel: `STRIPE_PRICE_MONTHLY` + `STRIPE_PRICE_YEARLY` als
   Environment Variables + Redeploy. Bis dahin führen die Abo-Buttons ins Leere!
2. **Eigenen Account freischalten** (Supabase SQL Editor):
   `insert into subscriptions (user_id, plan, status) select id,'pro','active'
   from auth.users where email in ('moser.simon5211@gmail.com','simon.moser@iu-study.org');`
3. **Build 1.2 (6) hochladen** – enthält den KI-Fix für die App (API_BASE);
   ohne ihn funktioniert die KI in der Store-App NICHT.
   Mac: `git pull && npm install && npx cap sync ios` → Version 1.2, Build 6
   → Archive → Upload → einreichen.
4. **Apple-Vertrag für gebührenpflichtige Apps** abschließen (App Store Connect
   → Geschäftliches: Bankverbindung + Steuerformulare). Vorlauf für In-App-Kauf –
   Apple braucht dafür manchmal Tage.
5. **Anzeigefehler melden** (Screenshots an Claude) → Fixes kommen in 1.2/1.3.

## 🟠 Phase B – In-App-Kauf (Build 7, das nächste große Stück)

6. Abo in der iOS-App kaufbar machen (RevenueCat + StoreKit,
   Produkte in App Store Connect: 3,99 €/Monat, 28,99 €/Jahr, 1 Monat Intro gratis)
7. Erst DANN die Abo-Sperre auch in der App aktivieren
   (aktuell ist die native App bewusst komplett frei – Apple 3.1.1!)

## 🔔 Server-Push an ALLE Geräte eines Kontos

Ziel: Bei geteiltem Konto bekommen ALLE eingeloggten Handys die Push –
auch bei geschlossener App.
- ✅ Web/PWA: läuft (VAPID + GitHub-Actions-Cron alle 15 Min, Multi-Device).
- ✅ Native APNs: CODE IST FERTIG (Client-Registrierung, `api/_apns.js`,
  `api/native-token-register.js`, push-cron + push-test senden an web+native,
  `@capacitor/push-notifications` in package.json).
- 🔲 OFFEN = nur Konfiguration (siehe **NATIVE-PUSH-SETUP.md**):
  1. Supabase-Tabelle `native_push_tokens` anlegen (SQL im Doc)
  2. Apple: APNs-Auth-Key (.p8) + Key-ID + Team-ID erstellen
  3. Vercel-Env: APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID / APNS_BUNDLE_ID /
     APNS_PRODUCTION → Redeploy
  4. Build 7: `npm install` + in Xcode Capability „Push Notifications"
  5. Testen über „Server-Push testen"
  ⚠️ Sandbox vs. Produktion beachten (App-Store/TestFlight = Produktion).

## 🟡 Phase C – danach (Reihenfolge nach Bedarf)

8. **iPad-Support** (NÄCHSTER Build nach Build 6):
   - Grundlage ist DRIN: additive Tablet-CSS (601–1024px) – Karten 3-spaltig,
     mehr Rand, groessere Tabellenbreite. iPhone/Desktop unveraendert.
   - Querformat-Seitenleiste ist DRIN: iPad im Querformat zeigt die
     Seitenleiste dauerhaft (kein Hamburger). Hochformat bleibt bewusst
     beim Schubladen-Menue.
   - OFFEN (braucht Test im iPad-Simulator am Mac):
     a) In Xcode „Supported Destinations" → **iPad** aktivieren
     b) Layout im iPad-Simulator (Hoch- + Querformat) durchklicken,
        ggf. Hochformat-Seitenleiste nachziehen
     c) **iPad-Screenshots** in App Store Connect hochladen (Pflicht!)
     d) einreichen – Apple prueft dann zusaetzlich auf dem iPad

9b. **Web-Push-Cron ist EINGERICHTET** (`.github/workflows/push-reminders.yml`):
    ruft alle 15 Min `push-cron.js` auf → Erinnerungen gehen auch bei
    geschlossenem Browser raus. MANUELLER SCHRITT: In GitHub unter
    Settings → Secrets and variables → Actions das Secret **CRON_SECRET**
    anlegen (gleicher Wert wie in Vercel). Testen: Actions-Tab →
    „Push-Erinnerungen versenden" → „Run workflow".
9. **Web-Push-Cron** (GitHub Actions): Erinnerungen auch für Web/PWA bei
   geschlossenem Browser
10. **App-Store-Badge** („Laden im App Store") prominent auf planory.at
11. **ASO**: App-Store-Beschreibung, Untertitel, Keywords optimieren
12. **Englische Version** – Welle 6 ergaenzt ~230 fehlende Texte (Onboarding,
    alle Modals/Formulare, Karten-Labels, Toasts, Bestaetigungsdialoge) +
    Enum-Woerter, die als Buttons/Labels erscheinen (Ueberfaellig, In
    Bearbeitung, Behoben, Angenommen, Gewerk-Tabs). PHRASES: 655 Eintraege.
    OFFEN: interpolierte Texte (mit ${...}) und durch Inline-Tags zerteilte
    Absaetze lassen sich per Exact-Match-Sweep NICHT uebersetzen – die
    brauchen bei Bedarf t()/Umbau. Per Nutzer-Test gemeldete Reste nachziehen.
    Frueherer Stand (Wellen 1-5): Fundament,
    Sprachwahl beim Start, Umschalter + Konto-Sync, Navigation, Seitentitel,
    Buttons, Formular-Labels, Platzhalter, Tooltips, Toasts, KI-Antworten,
    datensicherer Dropdown-Uebersetzer (value bleibt deutsch), Onboarding,
    Auth, Einstellungen, Empty-States. OFFEN/Feinschliff: vereinzelte lange
    Fliesstexte + per Nutzer-Test gemeldete Reste ins PHRASES-Woerterbuch;
    optional vollstaendige Auto-Extraktion (Subagent, nach Session-Limit);
    App-Store-Beschreibung EN. HINWEIS: neue deutsche UI-Strings kuenftig
    gleich ins PHRASES/OPTION_I18N-Woerterbuch aufnehmen.
13. **Team-/Gäste-Funktion**: Einladung per Code, Rollen Besitzer/Partner/Baustelle
    (Konzept fertig besprochen – Etappen: Metadaten pro Projekt → Einladung →
    eingeschränkte Baustellen-Rolle)

## 📌 Merkzettel

- Export-Compliance-Frage entfällt künftig: in Xcode Info-Tab
  `App Uses Non-Exempt Encryption` = NO setzen (einmalig)
- Bei JEDEM App-Update am Mac: `git pull && npm install && npx cap sync ios`,
  Versionsnummer erhöhen (1.2, 1.3, …), Build-Nummer erhöhen
- Neue App-Store-Version in App Store Connect: „+" neben „iOS-App" in der
  Seitenleiste → Release-Notes → Build wählen → einreichen
