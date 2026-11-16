// Planory – iPhone-Widgets (WidgetKit / SwiftUI)
// Einbau: siehe WIDGETS-EINRICHTEN.md im Projekt-Ordner.
//
// Die App (index.html, _widgetDaten / _widgetAktualisieren) legt einen JSON-Datensatz in die App Group
// "group.com.planory.bauassistent" (Schluessel "planoryWidget"). Diese Widgets lesen ihn nur.
// Tippen oeffnet die App ueber planory://aktion/<key> bzw. planory://seite/<seite>.

import WidgetKit
import SwiftUI

private let planoryGruppe = "group.com.planory.bauassistent"
private let planoryKey = "planoryWidget"
private let planoryOrange = Color(red: 1.0, green: 0.624, blue: 0.11)

// MARK: - Daten (so wie die App sie schreibt)

struct WidgetSchnell: Codable, Hashable {
    let key: String
    let titel: String
}

struct WidgetEintrag: Codable, Hashable {
    let art: String        // aufgabe, termin, zahlung, skonto, wartung, helfer
    let artText: String
    let titel: String
    let datum: String      // yyyy-MM-dd
    let zeit: String?
}

struct WidgetDaten: Codable {
    let sprache: String?
    let projekt: String?
    let leer: Bool?
    let schnell: [WidgetSchnell]?
    let eintraege: [WidgetEintrag]?

    var englisch: Bool { sprache == "en" }
}

private func ladeDaten() -> WidgetDaten? {
    guard let text = UserDefaults(suiteName: planoryGruppe)?.string(forKey: planoryKey),
          let roh = text.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetDaten.self, from: roh)
}

// Beispiel fuer die Widget-Galerie (bevor die App einmal Daten geschrieben hat)
private let beispielDaten = WidgetDaten(
    sprache: (Locale.preferredLanguages.first ?? "de").hasPrefix("en") ? "en" : "de",
    projekt: "Planory",
    leer: false,
    schnell: [
        WidgetSchnell(key: "scan", titel: "Rechnung scannen"),
        WidgetSchnell(key: "expense", titel: "Ausgabe erfassen"),
        WidgetSchnell(key: "diary", titel: "Bautagebuch-Eintrag"),
        WidgetSchnell(key: "photo", titel: "Foto hinzufügen")
    ],
    eintraege: [
        WidgetEintrag(art: "aufgabe", artText: "Aufgabe", titel: "Fliesen aussuchen", datum: Tag.text(0), zeit: "17:00"),
        WidgetEintrag(art: "termin", artText: "Zeitplan", titel: "Dachgleiche", datum: Tag.text(2), zeit: nil),
        WidgetEintrag(art: "zahlung", artText: "Zahlung", titel: "Baumeister 3. Rate", datum: Tag.text(5), zeit: nil)
    ]
)

// MARK: - Datum

enum Tag {
    static let format: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func text(_ plusTage: Int) -> String {
        let d = Calendar.current.date(byAdding: .day, value: plusTage, to: Date()) ?? Date()
        return format.string(from: d)
    }

    // Tage von heute bis zum Datum (negativ = vorbei)
    static func abstand(_ datum: String, jetzt: Date) -> Int? {
        guard let d = format.date(from: datum) else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: jetzt), to: cal.startOfDay(for: d)).day
    }

    static func wann(_ tage: Int, datum: String, englisch: Bool) -> String {
        switch tage {
        case ..<0: return englisch ? "overdue" : "überfällig"
        case 0: return englisch ? "today" : "heute"
        case 1: return englisch ? "tomorrow" : "morgen"
        case 2...6:
            if let d = format.date(from: datum) {
                let f = DateFormatter()
                f.locale = Locale(identifier: englisch ? "en_GB" : "de_AT")
                f.dateFormat = "EEEE"
                return f.string(from: d)
            }
            return englisch ? "in \(tage) days" : "in \(tage) Tagen"
        default:
            if let d = format.date(from: datum) {
                let f = DateFormatter()
                f.locale = Locale(identifier: englisch ? "en_GB" : "de_AT")
                f.dateFormat = "d. MMM"
                return f.string(from: d)
            }
            return datum
        }
    }
}

// MARK: - Zeitleiste

struct PlanoryEntry: TimelineEntry {
    let date: Date
    let daten: WidgetDaten?
}

struct PlanoryProvider: TimelineProvider {
    func placeholder(in context: Context) -> PlanoryEntry {
        PlanoryEntry(date: Date(), daten: beispielDaten)
    }

    func getSnapshot(in context: Context, completion: @escaping (PlanoryEntry) -> Void) {
        let echte = ladeDaten()
        let zeigen = (context.isPreview && (echte == nil || echte?.leer == true)) ? beispielDaten : echte
        completion(PlanoryEntry(date: Date(), daten: zeigen))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PlanoryEntry>) -> Void) {
        let jetzt = Date()
        let daten = ladeDaten()
        var eintraege = [PlanoryEntry(date: jetzt, daten: daten)]
        // um Mitternacht neu berechnen („heute“/„morgen“ stimmen dann wieder)
        let cal = Calendar.current
        if let mitternacht = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: jetzt)) {
            eintraege.append(PlanoryEntry(date: mitternacht, daten: daten))
        }
        let naechste = cal.date(byAdding: .hour, value: 1, to: jetzt) ?? jetzt.addingTimeInterval(3600)
        completion(Timeline(entries: eintraege, policy: .after(naechste)))
    }
}

// MARK: - Bausteine

private func symbolFuerAktion(_ key: String) -> String {
    switch key {
    case "scan": return "doc.viewfinder"
    case "expense": return "eurosign.circle"
    case "task": return "checkmark.circle"
    case "diary": return "book.closed"
    case "photo": return "camera"
    case "angebot": return "doc.text"
    case "milestone": return "flag"
    case "zahlung": return "calendar"
    case "wartung": return "wrench.and.screwdriver"
    case "maengel": return "exclamationmark.triangle"
    case "kontakt": return "person.crop.circle"
    case "notiz": return "note.text"
    case "budget": return "chart.pie"
    default: return "square.grid.2x2"
    }
}

private func symbolFuerArt(_ art: String) -> String {
    switch art {
    case "aufgabe": return "checkmark.circle"
    case "termin": return "flag"
    case "zahlung": return "eurosign.circle"
    case "skonto": return "percent"
    case "wartung": return "wrench.and.screwdriver"
    case "helfer": return "person.2"
    default: return "calendar"
    }
}

private func aktionsLink(_ key: String) -> URL {
    URL(string: "planory://aktion/\(key)") ?? URL(string: "planory://seite/dashboard")!
}

extension View {
    @ViewBuilder
    func planoryHintergrund() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        } else {
            self.padding().background(Color(UIColor.systemBackground))
        }
    }
}

private struct Leer: View {
    let englisch: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "house")
                .font(.title3)
                .foregroundColor(planoryOrange)
            Text(englisch ? "Open Planory once so your data appears here." : "Öffne Planory einmal, damit hier deine Daten erscheinen.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

// MARK: - Widget 1: Schnellzugriff

struct SchnellAnsicht: View {
    @Environment(\.widgetFamily) var familie
    let entry: PlanoryEntry

    var body: some View {
        let daten = entry.daten
        let englisch = daten?.englisch ?? false
        let aktionen = Array((daten?.schnell ?? []).prefix(4))
        Group {
            if daten == nil || daten?.leer == true || aktionen.isEmpty {
                Leer(englisch: englisch)
            } else if familie == .systemSmall, let erste = aktionen.first {
                VStack(alignment: .leading, spacing: 8) {
                    Image(systemName: symbolFuerAktion(erste.key))
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundColor(planoryOrange)
                    Spacer(minLength: 0)
                    Text(erste.titel)
                        .font(.headline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                    Text("Planory")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .widgetURL(aktionsLink(erste.key))
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text(englisch ? "Quick access" : "Schnellzugriff")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                        ForEach(aktionen, id: \.self) { a in
                            Link(destination: aktionsLink(a.key)) {
                                HStack(spacing: 6) {
                                    Image(systemName: symbolFuerAktion(a.key))
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(planoryOrange)
                                        .frame(width: 20)
                                    Text(a.titel)
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .lineLimit(2)
                                        .minimumScaleFactor(0.8)
                                        .foregroundColor(.primary)
                                    Spacer(minLength: 0)
                                }
                                .padding(.horizontal, 8)
                                .frame(maxWidth: .infinity, minHeight: 40, alignment: .leading)
                                .background(RoundedRectangle(cornerRadius: 10).fill(Color.secondary.opacity(0.12)))
                            }
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .planoryHintergrund()
    }
}

struct PlanorySchnellWidget: Widget {
    let kind = "PlanorySchnell"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PlanoryProvider()) { entry in
            SchnellAnsicht(entry: entry)
        }
        .configurationDisplayName("Planory – Schnellzugriff")
        .description("Rechnung scannen, Bautagebuch & Co. mit einem Tipp.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Widget 2: Naechste Termine & Aufgaben

struct TermineAnsicht: View {
    @Environment(\.widgetFamily) var familie
    let entry: PlanoryEntry

    var body: some View {
        let daten = entry.daten
        let englisch = daten?.englisch ?? false
        let maximal = familie == .systemLarge ? 9 : (familie == .systemMedium ? 4 : 3)
        let liste: [(WidgetEintrag, Int)] = (daten?.eintraege ?? []).compactMap { e in
            guard let t = Tag.abstand(e.datum, jetzt: entry.date) else { return nil }
            if t < 0 && e.art != "aufgabe" && e.art != "zahlung" { return nil }   // vorbei (nur Offenes bleibt als „überfällig“)
            if t > 30 { return nil }
            return (e, t)
        }
        let zeigen = Array(liste.prefix(maximal))
        Group {
            if daten == nil || daten?.leer == true {
                Leer(englisch: englisch)
            } else {
                VStack(alignment: .leading, spacing: familie == .systemSmall ? 5 : 7) {
                    HStack {
                        Text(englisch ? "Coming up" : "Als Nächstes")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                        Spacer(minLength: 0)
                        Image(systemName: "calendar")
                            .font(.caption)
                            .foregroundColor(planoryOrange)
                    }
                    if zeigen.isEmpty {
                        Text(englisch ? "Nothing due – enjoy the day." : "Nichts fällig – schönen Tag!")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    ForEach(Array(zeigen.enumerated()), id: \.offset) { item in
                        let e = item.element.0
                        let t = item.element.1
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: symbolFuerArt(e.art))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(t < 0 ? Color.red : planoryOrange)
                                .frame(width: 16)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(e.titel)
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .lineLimit(1)
                                if familie != .systemSmall {
                                    Text(e.artText)
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                        .lineLimit(1)
                                }
                            }
                            Spacer(minLength: 4)
                            Text(Tag.wann(t, datum: e.datum, englisch: englisch) + ((e.zeit ?? "").isEmpty || t != 0 ? "" : " \(e.zeit ?? "")"))
                                .font(.caption2)
                                .fontWeight(t <= 0 ? .bold : .regular)
                                .foregroundColor(t < 0 ? Color.red : (t <= 1 ? planoryOrange : Color.secondary))
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .widgetURL(URL(string: "planory://seite/aufgaben"))
        .planoryHintergrund()
    }
}

struct PlanoryTermineWidget: Widget {
    let kind = "PlanoryTermine"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PlanoryProvider()) { entry in
            TermineAnsicht(entry: entry)
        }
        .configurationDisplayName("Planory – Termine & Aufgaben")
        .description("Was heute und in den nächsten Tagen ansteht.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Bundle (Einstiegspunkt der Widget-Erweiterung)

@main
struct PlanoryWidgets: WidgetBundle {
    var body: some Widget {
        PlanorySchnellWidget()
        PlanoryTermineWidget()
    }
}
