# Zehnfinger

Tipptrainer für das Zehnfinger-System mit **Schweizer Tastatur**, gemacht für Lernende an Berufsschulen.

**Online:** https://aburossi.github.io/zehnfinger/

## Funktionen

- 17 Lektionen: Grundreihe, dann je zwei neue Tasten, Grossbuchstaben, Zahlen, Satzzeichen, ganze Sätze
- Bildschirmtastatur und Hände in Fingerfarben, die nächste Taste leuchtet
- Sterne für Genauigkeit (90 / 95 / 98 %), Tagesziel, Serien, Abzeichen, Tempo-Kurve
- Freies Training: Sätze, Problemtasten, eigener Text
- Installierbar als App (Chrome/Edge: «App installieren»), läuft danach auch offline
- Fortschritt bleibt im Browser; «Fortschritt sichern» / «Sicherung laden» als JSON-Datei

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seitengerüst |
| `style.css` | Aussehen, helles und dunkles Farbschema |
| `data.js` | Wörter, Sätze, Lektionen, hier Inhalte ergänzen |
| `logic.js` | DOM-freie Tastatur-, Text- und Fortschrittslogik, auch in Node ladbar |
| `app.js` | Oberfläche, Training, Browser-Speicher, Sicherung und Lernportal-Anbindung |
| `tests/` | Tests mit dem eingebauten Node-Testläufer |
| `sw.js` | Offline-Modus (Service Worker) |
| `manifest.webmanifest`, `icons/` | Installation als App |

## Tests

Mit Node.js (ohne Installation von Abhängigkeiten) aus der Projektwurzel:

```sh
node --test tests/
```

Geprüft werden Schweizer Fingerzuordnung, erlaubte Zeichen und Texterzeugung aller Lektionen,
Textnormalisierung, Sterne, Tages-Serien, Tempo-Auswertung, Abzeichen, Einstellungen und
Freischaltung im Einbettungsmodus. Script-Laden und zentrale Trainings-/Lernportal-Abläufe
werden zusätzlich mit einer simulierten Browser-Umgebung geprüft (kein echter Browser-Test).

## Update veröffentlichen

1. Dateien ändern, lokal testen.
2. `APP_VERSION` in `app.js` hochzählen.
3. Kommt eine **neue Datei** dazu: in `sw.js` bei `ASSETS` eintragen und `CACHE` hochzählen.
4. Committen und pushen. GitHub Pages ist nach ca. einer Minute aktuell.

Der Fortschritt bleibt bei Updates erhalten, solange der Speicherschlüssel `zehnfinger.v1` gleich bleibt und neue Felder in `defaults()` ergänzt statt umbenannt werden.

## Im Lernportal eingebettet (ab Version 1.1)

Die App läuft auch als iframe im Lernportal (`/training/ueben`, Repo `CoSch`, `apps/lms-firebase`), mit `?embed=1`. Dann gilt:

- **Nichts wird im Browser gespeichert.** Die App meldet jede Übung und ihren Stand per `postMessage` an die Elternseite (gleicher Ursprung, geprüft auf Ursprung **und** Fenster) und holt den Stand beim Start von dort. So gehört der Fortschritt der angemeldeten Person, nicht dem Gerät.
- **Die App kennt keine Namen.** Wer übt, weiss nur die Elternseite. Dieses Repo bleibt damit PII-frei.
- **Keine Abkürzungen:** «Alle Lektionen freischalten», Sicherung, Zurücksetzen und Installieren sind ausgeblendet. Die nächste Lektion öffnet sich ab 90 % Genauigkeit.
- Meldet sich die Elternseite nicht oder kann sie den Stand nicht lesen, startet die App **nicht** leer, sonst würde der erste Speichervorgang den echten Fortschritt überschreiben.

Nachrichten (`source: "zehnfinger"`, Version `v: 1`):

| Richtung | `type` | Inhalt |
|---|---|---|
| App → Seite | `ready` | die App ist da und wartet auf ihren Stand |
| Seite → App | `init` | `state`: Stand der Person oder `null` (neu) |
| Seite → App | `init-error` | Stand nicht lesbar, die App bleibt gesperrt |
| App → Seite | `run` | `{t, ms, acc, apm, chars, errors, lesson, mode?, starsBefore, starsAfter, bestApmBefore}` einer fertigen Übung (`mode`: `lesson`, `free`, `problem` oder Name der Herausforderung) |
| App → Seite | `state` | der ganze Stand, 400 ms nach jeder Änderung |

Ohne `?embed=1` (GitHub Pages, lokale Datei) ändert sich nichts. Das Lernportal kopiert die Dateien mit `npm run zehnfinger:sync` aus diesem Ordner nach `public/zehnfinger/` (ohne `sw.js`).
**Integrationshinweis:** Diese Kopie verwendet eine feste Dateiliste. Dort muss auch `logic.js`
ergänzt werden; die Änderung im Lernportal erfolgt in einem separaten Auftrag.
