# Verzeichnis der Verarbeitungstätigkeiten (Art. 30 DSGVO) – Planory

**Verantwortlicher:** Simon Moser, Sportplatzstraße 18, 5222 Munderfing, Österreich · moser.simon5211@gmail.com
**Stand:** 28.10.2026 · intern (wird nicht veröffentlicht) · bei Änderungen an Diensten/Funktionen nachführen

| Nr. | Tätigkeit | Zweck & Rechtsgrundlage | Betroffene / Daten | Empfänger (Auftragsverarbeiter) | Drittland | Löschung |
|---|---|---|---|---|---|---|
| 1 | Konto & Anmeldung | Login, Synchronisation – Vertrag (Art. 6 Abs. 1 lit. b) | Nutzer: E-Mail, Passwort-Hash, Anmeldezeiten | Supabase (EU) | – | bei Kontolöschung |
| 2 | Projektdaten speichern & abgleichen | App-Funktion – Vertrag | Nutzer; Dritte in Projektdaten (Handwerker-Kontakte, Namen auf Rechnungen) | Supabase (EU, Datenbank + Dateien) | – | bei Kontolöschung |
| 3 | KI-Auswertung (Rechnungs-/Angebots-Scan, Bauberater, KI-Zeitplan) | nur auf Auslösung durch den Nutzer – Vertrag; Hinweis vor erster Nutzung | Rechnungsbild/PDF, Projekt-Zusammenfassung | Vercel (Schnittstelle), Anthropic PBC | USA – SCC im DPA (ggf. DPF) | Anthropic: kurze Aufbewahrung, kein Training; bei uns nur das Ergebnis im Projekt |
| 4 | Web-Abo & Zahlung | Abrechnung – Vertrag, gesetzl. Aufbewahrung (BAO) | E-Mail, Zahlungsdaten (bei Stripe), Abo-Status | Stripe | USA/IE – DPF/SCC | Abo-Daten bis Kontolöschung, Rechnungen 7 Jahre |
| 5 | iPhone-Abo | Abo-Verwaltung – Vertrag | Nutzer-ID, Abo-Status (Zahlung nur bei Apple) | Apple, RevenueCat Inc. | USA – DPF/SCC | bis Kontolöschung |
| 6 | Erinnerungen / Push | gewünschte Mitteilungen – Vertrag | Geräte-Token, Termin-Titel | Vercel, Apple (APNs) bzw. Browser-Push-Dienst, Supabase | USA – SCC | bei Abmeldung/Kontolöschung |
| 7 | Todoist-Anbindung (optional, Web) | gewünschte Funktion – Vertrag | Todoist-Zugang (verschlüsselt), Projekt-Zuordnung | Supabase (EU), Vercel, Doist (eigener Verantwortlicher) | USA (Vercel) – SCC | bei Trennen/Kontolöschung |
| 8 | Website ausliefern | Bereitstellung – berechtigtes Interesse (Art. 6 Abs. 1 lit. f) | IP-Adresse in Server-Logs | GitHub Pages bzw. Vercel | USA – DPF/SCC | laut Anbieter (kurz) |

**Technische und organisatorische Maßnahmen (Kurz):**
- Übertragung nur verschlüsselt (HTTPS).
- Datenbank mit Zeilen-Rechten (RLS): Jeder Nutzer sieht nur seine Daten.
- Server-Schlüssel nur in Vercel-Umgebungsvariablen.
- Kein Tracking, keine Werbung.
- Konto-Löschung in der App.
- Interne Notizen ohne Kundendaten.

**Abgelegte Verträge (Auftragsverarbeitung) – Häkchen setzen, wenn heruntergeladen und gespeichert:**
- [ ] Supabase DPA
- [ ] Vercel DPA
- [ ] Anthropic DPA (in den kommerziellen Bedingungen; Console → Settings)
- [ ] Stripe DPA
- [ ] RevenueCat DPA
- [ ] GitHub (Pages) DPA
