# Android-App (Google Play) – was noch zu tun ist

**Stand 18.11.2026:** Das Android-Projekt ist fertig vorbereitet (Ordner `android/`). Eine Test-Version wurde
erfolgreich gebaut. Store-Texte, Formular-Antworten, Symbol, Feature-Grafik und Screenshots liegen bereit
(`PLAY-STORE-TEXT.md`, `android/STORE/`).

**Wichtig:** Die Android-App darf **erst veröffentlicht werden, wenn das Google-Abo eingerichtet ist**
(Schritt 3). Bis dahin wäre in der Android-App alles gratis. So ist sie absichtlich gebaut: lieber gratis als
kaputt.

---

## Was schon fertig ist (von Claude)

- Android-Projekt mit derselben App wie am iPhone (`www/index.html`). Name „Planory“,
  Kennung `com.planory.bauassistent`, Version 1.4.
- Eigenes Symbol (Kran und Haus auf dunklem Grund) und Startbild.
- **Zurück-Taste von Android:** schließt zuerst die Foto-Ansicht, dann eine Rückfrage, dann ein offenes
  Fenster (bei Eingaben fragt sie vorher nach) und das Menü. Danach geht es zur Startseite. Auf der Startseite
  legt die Taste die App in den Hintergrund.
- Berechtigungen nur das Nötigste: Mitteilungen und Fotos. Für Fotos nutzt Android 13+ die Foto-Auswahl des
  Systems. Darum braucht es **keine** Sonder-Freigabe bei Google.
- Schnellzugriffe über `planory://…` funktionieren wie bei iOS.
- Push-Mitteilungen (vom Server) sind auf Android noch **aus**, bis Firebase eingerichtet ist (Schritt 2).
  Erinnerungen, die die App selbst plant, funktionieren schon.
- Kein Stripe-Knopf in der App (Google erlaubt in der App nur Google-Abos).

---

## Deine Schritte

### 1. Google-Play-Konto (einmalig)
1. https://play.google.com/console → Konto anlegen (ca. 25 $ einmalig).
2. **Kontotyp „Organisation“** wählen, wenn die D-U-N-S-Nummer da ist. Dann musst du **nicht** 14 Tage mit
   12 Tester:innen testen. Details: OFFENE-PUNKTE.md Punkt 9.
3. Identität bestätigen (dauert ein paar Tage).
4. „App erstellen“: Name **Planory – Bauassistent**, Sprache Deutsch, **App** (nicht Spiel), **kostenlos**
   (das Abo kommt als In-App-Kauf).

### 2. Push-Mitteilungen (Firebase) – kann auch später sein
1. https://console.firebase.google.com → Projekt „Planory“ anlegen (Google Analytics: **aus**).
2. Android-App hinzufügen, Paketname `com.planory.bauassistent`.
3. Die Datei **`google-services.json`** herunterladen und in den Ordner `android/app/` legen.
4. Mir Bescheid geben. Ich schalte dann Push für Android ein (`ANDROID_PUSH_AKTIV`) und erweitere den Server,
   damit er auch an Android-Handys senden kann.

### 3. Abo über Google Play + RevenueCat (Pflicht vor Veröffentlichung)
1. Play Console → deine App → **Monetarisieren → Abos**: zwei Abos anlegen, gleiche Preise wie bei Apple:
   - `planory_pro_monthly` (monatlich)
   - `planory_pro_yearly` (jährlich)

   Jeweils mit 1 Monat gratis als Einführungsangebot, wenn gewünscht.
   (Hinweis: Abos lassen sich erst anlegen, wenn einmal eine App-Version hochgeladen wurde. Darum zuerst
   Schritt 4 als „Interner Test“ machen.)
2. RevenueCat → Projekt Planory → **Apps → + Neu → Google Play**. Paketname `com.planory.bauassistent`.
   RevenueCat erklärt dort, wie es Zugriff auf Google Play bekommt (Dienstkonto-Schlüssel).
3. Die zwei Google-Abos in RevenueCat unter **Products** importieren, der Berechtigung **„Planory Pro“**
   zuordnen und ins bestehende **Offering** aufnehmen.
4. Mir den **öffentlichen Google-Schlüssel** schicken (fängt mit `goog_` an). Ich trage ihn ein
   (`RC_API_KEY_ANDROID`). Ab dann gilt das Abo auch in der Android-App.

### 4. App bauen und hochladen (am Computer mit Android Studio)
1. Android Studio installieren (https://developer.android.com/studio, gratis, auch für Mac).
2. Im Planory-Ordner im Terminal:
   ```
   git pull
   npm install
   npx cap sync android
   npx cap open android
   ```
3. Android Studio öffnet das Projekt. Beim ersten Mal lädt es ein paar Minuten lang Dinge nach.
4. **Build → Generate Signed App Bundle or APK → Android App Bundle**.
   - Beim ersten Mal **„Create new…“**: Einen Upload-Schlüssel anlegen (Datei z. B. `planory-upload.jks`,
     Passwort gut aufheben, z. B. im Passwort-Manager).
   - **Diese Datei NIE ins Repo und nie an jemanden schicken.** Geht sie verloren, kann Google sie
     zurücksetzen, das dauert aber.
   - Variante **release** → **Create**. Heraus kommt eine Datei `app-release.aab`.
5. Play Console → **Testen → Interner Test** → neuen Release erstellen → `app-release.aab` hochladen.
   - Die **Play App-Signatur** von Google annehmen (Empfehlung).
   - Dich selbst als Tester:in eintragen, Link öffnen, App am Android-Handy installieren und ausprobieren.

### 5. Store-Eintrag ausfüllen
Alles zum Kopieren steht in **`PLAY-STORE-TEXT.md`**:
- Name, Kurz- und Langbeschreibung (Deutsch und Englisch)
- Formular **Datensicherheit**, Inhaltseinstufung, Zielgruppe
- Grafiken aus `android/STORE/`: `play-icon-512.png`, `feature-grafik-1024x500.png`, `screenshot-*.png`

Gerne kannst du später echte Screenshots von deinem Android-Handy nehmen.

### 6. Veröffentlichen
Erst wenn **Schritt 3 erledigt** ist und der interne Test gut läuft: **Produktion → Release erstellen**.
Google prüft die App dann meist in 1–7 Tagen.

**Vor der Veröffentlichung ergänzt Claude die Datenschutzerklärung** um „Google (App-Bereitstellung und
In-App-Käufe, Android)“ und, falls Push aktiv ist, „Google Firebase (Push-Mitteilungen)“.

---

## Bei jeder neuen Version
1. In `android/app/build.gradle` die Zahl bei **`versionCode`** um 1 erhöhen und `versionName` anpassen
   (z. B. 1.5).
2. `npx cap sync android` → Android Studio → Signed App Bundle → in der Play Console hochladen.
3. Wie bei iOS gilt: Änderungen an der App kommen erst mit einer neuen Version aufs Handy.

---

**Technik in Kürze** (für Claude):
- Zurück-Taste: `_androidZurueck()` und `_istAndroid()` in `index.html`.
- Push-Sperre: `ANDROID_PUSH_AKTIV` vor `_registerNativePush()`. Der Server (`api/native-token-register.js`
  bzw. der Push-Versand) kennt bisher nur APNs. Für Android kommt FCM dazu.
- RevenueCat-Weiche: `RC_API_KEY_ANDROID`. Leer bedeutet, alles ist frei (`applyNativePaymentPolicy`).
- Icons, Startbild und Store-Grafiken werden mit `sharp` aus `logo.svg` erzeugt.
- Probe-Build: `./gradlew assembleDebug` (SDK 36, Java 21) läuft durch.
