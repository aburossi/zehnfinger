# Zehnfinger

Tipptrainer für das Zehnfinger-System mit **Schweizer Tastatur**, gemacht für Kinder ab etwa 10 Jahren.

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
| `app.js` | Logik: Tastatur, Übungen, Speicher, Sicherung |
| `sw.js` | Offline-Modus (Service Worker) |
| `manifest.webmanifest`, `icons/` | Installation als App |

## Update veröffentlichen

1. Dateien ändern, lokal testen.
2. `APP_VERSION` in `app.js` hochzählen.
3. Kommt eine **neue Datei** dazu: in `sw.js` bei `ASSETS` eintragen und `CACHE` hochzählen.
4. Committen und pushen. GitHub Pages ist nach ca. einer Minute aktuell.

Der Fortschritt bleibt bei Updates erhalten, solange der Speicherschlüssel `zehnfinger.v1` gleich bleibt und neue Felder in `defaults()` ergänzt statt umbenannt werden.
