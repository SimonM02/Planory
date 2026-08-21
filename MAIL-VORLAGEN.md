# Supabase E-Mail-Vorlagen (Planory)

Fertige Vorlagen zum Reinkopieren in **Supabase → Authentication → Emails → Templates**.
Jede Vorlage hat oben das **Planory-Logo** (Bild + Schriftzug als Fallback).

**Wichtig:**
- Die Platzhalter `{{ .ConfirmationURL }}` bzw. `{{ .Token }}` **genau so lassen** –
  die ersetzt Supabase automatisch.
- Bei jeder Vorlage: Betreff **und** Nachricht (HTML) einsetzen → **Save**.
- Das Logo lädt von `https://planory.at/appstore-icon-1024.png` (liegt bereits live).

---

## Logo-Kopf (steckt oben in jeder Vorlage – nur zur Info)
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
```

---

## 1. Confirm signup (Registrierung bestätigen)
**Betreff:**
```
Willkommen bei Planory – bitte bestätige deine E-Mail
```
**Nachricht (HTML):**
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
<h2 style="font-family:sans-serif;color:#241d15">Willkommen bei Planory! 🏗️</h2>
<p style="font-family:sans-serif;color:#5b5245;font-size:15px;line-height:1.6">
  Schön, dass du dabei bist. Bestätige mit einem Klick deine E-Mail-Adresse,
  dann kann's mit deinem Bauprojekt losgehen.
</p>
<p style="margin:28px 0">
  <a href="{{ .ConfirmationURL }}" style="background:#f57a00;color:#fff;font-family:sans-serif;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;display:inline-block">E-Mail bestätigen</a>
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px;line-height:1.6">
  Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:<br>{{ .ConfirmationURL }}
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Du hast dich nicht bei Planory registriert? Dann ignoriere diese E-Mail einfach.</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Dein Planory-Team · planory.at</p>
```

---

## 2. Invite user (Einladung)
**Betreff:**
```
Du wurdest zu Planory eingeladen
```
**Nachricht (HTML):**
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
<h2 style="font-family:sans-serif;color:#241d15">Du wurdest zu Planory eingeladen 🏗️</h2>
<p style="font-family:sans-serif;color:#5b5245;font-size:15px;line-height:1.6">
  Planory ist dein digitaler Bauassistent – Budget, Kosten, Termine und Dokumente
  für dein Bauprojekt an einem Ort. Klick auf den Knopf, um dein Konto einzurichten.
</p>
<p style="margin:28px 0">
  <a href="{{ .ConfirmationURL }}" style="background:#f57a00;color:#fff;font-family:sans-serif;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;display:inline-block">Einladung annehmen</a>
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px;line-height:1.6">
  Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:<br>{{ .ConfirmationURL }}
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Dein Planory-Team · planory.at</p>
```

---

## 3. Magic Link (Anmeldelink)
**Betreff:**
```
Dein Anmeldelink für Planory
```
**Nachricht (HTML):**
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
<h2 style="font-family:sans-serif;color:#241d15">Dein Anmeldelink</h2>
<p style="font-family:sans-serif;color:#5b5245;font-size:15px;line-height:1.6">
  Klick auf den Knopf, um dich bei Planory anzumelden. Der Link ist nur kurz gültig.
</p>
<p style="margin:28px 0">
  <a href="{{ .ConfirmationURL }}" style="background:#f57a00;color:#fff;font-family:sans-serif;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;display:inline-block">Jetzt anmelden</a>
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px;line-height:1.6">
  Falls der Knopf nicht funktioniert, kopiere diesen Link in deinen Browser:<br>{{ .ConfirmationURL }}
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Du hast keine Anmeldung angefragt? Dann ignoriere diese E-Mail.</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Dein Planory-Team · planory.at</p>
```

---

## 4. Change Email Address (E-Mail-Adresse ändern)
**Betreff:**
```
Planory – Bestätige deine neue E-Mail-Adresse
```
**Nachricht (HTML):**
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
<h2 style="font-family:sans-serif;color:#241d15">Neue E-Mail-Adresse bestätigen</h2>
<p style="font-family:sans-serif;color:#5b5245;font-size:15px;line-height:1.6">
  Du möchtest die E-Mail-Adresse deines Planory-Kontos ändern. Bestätige die neue
  Adresse mit einem Klick.
</p>
<p style="margin:28px 0">
  <a href="{{ .ConfirmationURL }}" style="background:#f57a00;color:#fff;font-family:sans-serif;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;display:inline-block">Neue Adresse bestätigen</a>
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px;line-height:1.6">
  Funktioniert der Knopf nicht? Dieser Link tut dasselbe:<br>{{ .ConfirmationURL }}
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Du hast das nicht angefragt? Dann ignoriere diese E-Mail – es ändert sich nichts.</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Dein Planory-Team · planory.at</p>
```

---

## 5. Reset Password (Passwort zurücksetzen)
**Betreff:**
```
Planory – Passwort zurücksetzen
```
**Nachricht (HTML):**
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
<h2 style="font-family:sans-serif;color:#241d15">Passwort zurücksetzen</h2>
<p style="font-family:sans-serif;color:#5b5245;font-size:15px;line-height:1.6">
  Du hast angefragt, dein Planory-Passwort zurückzusetzen. Klick auf den Knopf,
  um ein neues Passwort zu vergeben.
</p>
<p style="margin:28px 0">
  <a href="{{ .ConfirmationURL }}" style="background:#f57a00;color:#fff;font-family:sans-serif;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:9px;display:inline-block">Neues Passwort vergeben</a>
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px;line-height:1.6">
  Funktioniert der Knopf nicht? Dieser Link tut dasselbe:<br>{{ .ConfirmationURL }}
</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Du hast das nicht angefragt? Dann ändert sich nichts – ignoriere diese E-Mail.</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Dein Planory-Team · planory.at</p>
```

---

## 6. Reauthentication (Bestätigungscode)
> Diese Vorlage nutzt einen **Code** (`{{ .Token }}`), keinen Link.

**Betreff:**
```
Dein Planory-Bestätigungscode
```
**Nachricht (HTML):**
```html
<div style="text-align:center;padding:6px 0 22px">
  <img src="https://planory.at/appstore-icon-1024.png" alt="Planory" width="64" height="64" style="border-radius:14px;display:inline-block">
  <div style="font-family:sans-serif;font-size:20px;font-weight:800;color:#241d15;margin-top:8px">Plan<span style="color:#f57a00">ory</span></div>
</div>
<h2 style="font-family:sans-serif;color:#241d15">Dein Bestätigungscode</h2>
<p style="font-family:sans-serif;color:#5b5245;font-size:15px;line-height:1.6">
  Gib diesen Code in Planory ein, um deine Aktion zu bestätigen:
</p>
<p style="font-family:sans-serif;font-size:30px;font-weight:800;letter-spacing:6px;color:#241d15;text-align:center;margin:24px 0">{{ .Token }}</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Du hast das nicht angefragt? Dann ignoriere diese E-Mail.</p>
<p style="font-family:sans-serif;color:#8a7f6d;font-size:13px">Dein Planory-Team · planory.at</p>
```

---

## Absendername „Planory"
Der Standard-Absender von Supabase ist „Supabase Auth". Für einen echten Absender
**„Planory"** braucht es **eigenes SMTP** (Authentication → Emails → SMTP Settings),
z.B. mit dem kostenlosen Dienst **Resend**. Ohne SMTP wirken die Vorlagen oben
trotzdem schon deutlich professioneller.
