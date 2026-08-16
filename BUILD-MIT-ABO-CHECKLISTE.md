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

## F) VOR dem Einreichen – Checkliste (Ablehnung vermeiden!)
- [ ] **Demo-Login für den Prüfer** (SONST sichere Ablehnung!): Version →
      **App-Review-Informationen → Anmeldeinformationen** → „Erforderlich" anhaken,
      **funktionierende** E-Mail + Passwort eines Planory-Kontos eintragen. Vorher
      testen, dass der Login klappt.
- [ ] **Build 13** ausgewählt.
- [ ] **Beide Abos** über „Zur Prüfung hinzufügen" an die Version angehängt.
- [ ] Beide Abos haben einen **Prüf-Screenshot** (Prüfinformationen) + Preis + Lokalisierung.
- [ ] **Altersfreigabe** „Nicht anwendbar" / 4+ (kein „Kinder") – bereits erledigt.
- [ ] **Kategorie** Produktivität/Finanzen – bereits erledigt.
- [ ] **Kids-Hinweis** (unten) in **App-Review-Informationen → Anmerkungen** einfügen.
- [ ] **„Neue Funktionen"**-Text (aus `APP-STORE-TEXT.md`) eingetragen.
- [ ] Export-Compliance (Verschlüsselung) = **Nein**.
- [ ] Dann **Einreichen**.

### Hinweis-Text für den Prüfer (Kids-Einstufung + Weg zum In-App-Kauf)
Bei jeder Einreichung in **App-Review-Informationen → Anmerkungen** einfügen
(und, falls es doch wieder abgelehnt wird, als Antwort im **Resolution Center**):

```
Hello,

Planory is a professional project-management app for people building or
renovating a house — construction budgeting, scheduling, maintenance reminders
and invoice scanning. It is intended for adults (homeowners and building
professionals) and is not directed at or designed for children.

The app was never intended for the Kids Category. The Primary Category is
Productivity (Secondary: Finance) and the age rating is a standard 4+ with
"Made for Kids" set to Not Applicable. Please review the app under the standard
(non-Kids) guidelines.

How to test the subscription (Planory Pro): open the app and sign in with the
demo account provided in the Sign-In Information. Then go to Settings → "My plan"
(⭐) → tap "View Planory Pro" → choose the Monthly or Yearly plan.

Thank you very much.
```

Hintergrund: Die App war ganz am Anfang einmal als Kinder-App markiert. Kategorie
(Produktivität/Finanzen) und Altersfreigabe (4+, „Nicht anwendbar") sind längst
korrekt – der Übergang aus der Kinder-Kategorie greift aber erst mit dem nächsten
eingereichten Build. Der Hinweis-Text hilft dem Prüfer, die App endgültig aus der
Kinder-Prüfung zu nehmen.

---
**Wichtig:** Punkt **B (Altersfreigabe)** ist bereits erledigt – Kategorie und
Altersfreigabe stehen korrekt (kein „Kinder"). Es fehlt nur noch der Build (E)
plus der Kids-Hinweis oben beim Einreichen.

Der **Abo-Code ist bereits eingebaut** (schlafend, bis der Key da ist) – es fehlt
also nur noch die Einrichtung oben, nicht die Programmierung.
