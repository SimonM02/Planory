# Nächster Build – ALLES auf einmal (Features + Abo)

Entscheidung: Wir warten, bis das Abo funktioniert, und reichen dann **einen**
Build mit allem ein (spart Apple-Prüfrunden). Reihenfolge unten von oben nach unten.

## A) Apple-Voraussetzungen (dauern am längsten → zuerst starten)
- [ ] **Steuerformular (W-8BEN)** ausfüllen (heute). → schaltet den „Paid Apps"-Vertrag frei.
- [ ] Warten, bis **„Vertrag für gebührenpflichtige Apps" = Aktiv** (Bank + Steuer, ~1–2 Tage).
- [ ] **Abo-Produkt anlegen:** App Store Connect → Planory → Abonnements →
      Abo-Gruppe + Auto-erneuerbares Abo (z. B. `planory_plus_monthly`, Preis).
      Wird **mit der App zusammen geprüft**.

## B) Altersfreigabe endlich speichern (der bekannte Blocker!)
- [ ] Altersfreigabe → „Für Kinder gemacht" auf **„Nicht anwendbar"** (oder 13+),
      **speichern** (kein roter Fehler mehr). Bei „An error occurred": Fragebogen von
      **Schritt 1** durchklicken, sonst **Apple-Support** (Resolution Center / Contact Us).
- [ ] Nach dem Speichern **Seite neu laden** und prüfen, dass es steht.

## C) RevenueCat einrichten
- [ ] Konto + Projekt + App (Bundle `com.planory.bau`) anlegen.
- [ ] **App-Specific Shared Secret** (aus App Store Connect) in RevenueCat eintragen.
- [ ] Produkt (gleiche ID wie in A), **Entitlement** `plus`, **Offering** anlegen.
- [ ] **Public SDK Key (Apple)** kopieren (beginnt mit `appl_`).

## D) Key an Claude → Code aktivieren
- [ ] Mir schicken: **SDK-Key** (`appl_…`), **Produkt-ID**, **Entitlement-Name**.
      → Ich trage sie in `index.html` ein (`RC_API_KEY`, `RC_ENTITLEMENT`).

## E) Am Mac bauen & testen
```
cd planory && git checkout main && git pull origin main
npm install @revenuecat/purchases-capacitor
npx cap sync ios
npx cap open ios
```
- [ ] In Xcode **Build-Nummer erhöhen** (z. B. auf 9).
- [ ] **TestFlight + Sandbox-Tester:** Test-Kauf machen (kostenlos!). Kauf +
      „Käufe wiederherstellen" müssen sauber funktionieren.
- [ ] Erst wenn alles passt → **Archive → Distribute → Upload**.

## F) Einreichen
- [ ] In App Store Connect: neue Version → **Build wählen** → **Abo-Produkt zur
      Prüfung hinzufügen** → **„Neue Funktionen"** (Text aus `APP-STORE-TEXT.md`) →
      **Einreichen**.

---
**Wichtig:** Punkt **B (Altersfreigabe)** ist der eigentliche Ablehnungsgrund und
muss auf jeden Fall gelöst sein – unabhängig vom Abo. Am besten parallel zu A/C
schon mit Apple klären, damit der große Build dann sicher durchgeht.

Der **Abo-Code ist bereits eingebaut** (schlafend, bis der Key da ist) – es fehlt
also nur noch die Einrichtung oben, nicht die Programmierung.
