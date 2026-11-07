"use strict";
/* Inhalte von Zehnfinger: Wörter, Sätze, Lektionen.
   Neue Wörter einfach in WORD_SRC ergänzen: Nomen gross, alles andere klein, ohne «ß».
   Wörter, die mit Ä, Ö oder Ü beginnen, vermeiden (auf der Schweizer Tastatur nur über eine Tottaste tippbar). */

const WORD_SRC = `
da das als all alle fall falls lass Saal Aal Salsa Kalk Fass Alaska Kladde
die sie lies leise Seil Keil Eile Eis fleissig Esel Kiel ideal Idee alles Adel Sessel Seife Seidel Kleid Leid Lied Fliese
und ein eine einen einer ich du er es wir ihr sind ist hat haben hatte war wer wie was wo wann warum weil wenn dass nicht nein ja auch aber oder denn dann noch schon sehr viel mehr immer heute morgen gestern hier dort mit ohne für über unter neben vor nach bei zu zum zur auf aus in im an am von vom bis durch um so nur gut gross klein neu alt jung lang kurz schnell langsam laut hell dunkel warm kalt nass trocken schön lustig müde froh stark rund leicht schwer frei fertig richtig falsch genau jeder etwas nichts viele wenig ganz halb bald oft gern gerne selten zusammen allein wieder
gehen laufen rennen springen spielen lernen lesen schreiben rechnen tippen singen tanzen malen zeichnen kochen essen trinken schlafen fahren fliegen schwimmen klettern bauen suchen finden sagen fragen hören sehen denken lachen helfen kaufen machen holen geben nehmen stehen sitzen liegen rufen warten reden teilen gewinnen verlieren üben feiern kommen bringen zeigen treffen wissen können dürfen müssen wollen
Beleg Probe Aufgabe Termin Frist Auftrag Bericht Akte Arbeit Büro Team Chef Plan Schicht Ziel Note Lektion Kurs Modul Praxis Theorie Zeugnis Semester Unterricht Lehre Lehrstelle Lehrbetrieb Beruf Berufsschule Betrieb Gewerbe Branche Firma Kunde Kundin Kollege Kollegin Lehrling Mitarbeiter Mitarbeiterin Personal Chefin Kader Stelle Anstellung Bewerbung Vorstellungsgespräch Einsatz Schichtplan Pikett Rapport Protokoll Inventur Bestellung Rechnung Zahlung Kasse Bon Kredit Rabatt Bonus Lohn Lohnabrechnung Gehalt Spesen Spesenabrechnung Stundenlohn Pensum Auszahlung Steuer Abzug Netto Brutto Konto Kreditkarte Bankomat Quittung Ausgabe Einkauf Betrag Wert Prüfung
Bahnhof Zug Gleis Schiene Bus Bahn Perron Haltestelle Fahrplan Abfahrt Ankunft Verspätung Umleitung Gleiswechsel Fahrt Pendeln Pendler Ticket Billet Abonnement Halbtax Generalabonnement Zone Zonenabonnement Verkehrsbetrieb Fahrgast Wartezeit
Wohnung Zimmer WG Miete Mieter Vermieterin Nebenkosten Hausarbeit Putzen Abwasch Wäsche Kehricht Balkon Küche Dusche Bad WC Keller Treppe Stockwerk Einrichtung Hausordnung Einzug Umzug Waschküche Internet Fernwärme Heizung
Krankenkasse Arzt Arzttermin Zahnarzt Brille Impfung Impftermin Medikament Verband Puls Schlaf Stress Vitamin Kassenzettel Gesundheitsprävention Rücken Training Fitness Bewegung Sport Aerobic Joggen Biken Wandern Bergsteigen Klettern Yoga Schwimmen Sauna
Fussball Handball Volleyball Basketball Unihockey Tennis Badminton Laufen Sprinter Dauerlauf Krafttraining Kniebeugen Dehnen Pilates Tanzen Club Verein Liga Turnier Wettkampf Mannschaft Teamplayer Sieg Niederlage Final Ergebnis Tor Punkt
Kino Festival Konzert Ausgang Kneipe Bar Restaurant Beiz Pub Serie Streaming Game Konsole Tastatur Laptop Computer Bildschirm Musik Song
Karte Schritt Zählung Statistik Tabelle Daten Vergleich Analyse Diagramm Prozess Qualität Abteilung Wertschöpfung Kostenstelle
Schweiz Kanton Alpen Rhein Aare Tessin Bern Basel Zürich Luzern Wallis Jura Genf Sankt Gallen Thun Graubünden Biel Brienz Zermatt
Handy App Notiz Terminkalender Kalender Agenda Liste Brief Mail Lieferung Paket Telefon Empfang
Hobby Freizeit Ehrenamt Sammeln Reisen Kochen Backen Lesen Fotografieren
Mütze Schal Handschuh Regenschirm Uhr Armbanduhr Geldbeutel Portemonnaie Rucksack Tasche Schokolade Kaffee Nudeln Salat
`.split(/\s+/).filter(Boolean);

const SENTENCES = [
  "Am Montag beginnt die Berufsschule um acht Uhr.",
  "Im Betrieb lerne ich neue Kolleginnen und Kollegen kennen.",
  "Die Lehre dauert drei oder vier Jahre.",
  "Am Freitag gibt es die Lohnabrechnung.",
  "Der Zug nach Bern hat fünf Minuten Verspätung.",
  "Am Abend gehe ich noch ins Training.",
  "Die Miete für die Wohnung ist ganz okay.",
  "Am Wochenende treffe ich mich mit dem Team.",
  "Die Prüfung nächste Woche muss ich gut vorbereiten.",
  "Im Schichtplan steht der Einsatz am Donnerstag.",
  "Das Budget für den Monat ist knapp berechnet.",
  "Mit dem Halbtax kostet das Ticket nur die Hälfte.",
  "Die Arbeitskleidung wird vom Betrieb gestellt.",
  "In der Pause trinken wir einen Kaffee zusammen.",
  "Der Lehrmeister zeigt mir den neuen Auftrag.",
  "Nach der Arbeit koche ich mit der Mitbewohnerin.",
  "Am Samstag spielt der Verein das wichtigste Spiel.",
  "Das Geschäft schliesst am Mittwochnachmittag.",
  "Die Krankenkasse schickt jedes Jahr eine neue Prämie.",
  "Im Sommer mache ich mit Freunden eine Wanderung.",
  "Auf dem Perron warten viele Pendler auf den Zug.",
  "Ich spare jeden Monat einen Teil vom Lohn.",
  "Die Kundin ist zufrieden mit der Lieferung.",
  "Nächste Woche beginnt ein neues Modul in der Schule.",
  "Das Tram ist um Viertel nach sieben gekommen.",
  "Ich teile die WG mit zwei anderen Lernenden.",
  "Die Serie schaue ich meist am Feierabend.",
  "Am Morgen checke ich meine Mails vor der Arbeit.",
  "Das Konto prüfe ich monatlich in der App.",
  "Nach der Lehre will ich vielleicht noch die Berufsmatura machen.",
  "Die Hausordnung in der WG haben wir gemeinsam geschrieben.",
  "Am Fitnessplan arbeite ich jeden zweiten Tag.",
  "Im Praktikum habe ich viel für den Beruf gelernt.",
  "Der Zug hat eine Umleitung wegen der Baustelle.",
  "Im Kino gibt es diesen Herbst ein paar gute Filme.",
  "Den Laptop brauche ich für die Schule und die Arbeit.",
  "Die Tasche für den Sport liegt schon bereit.",
  "Am Dienstag haben wir Teambesprechung im Betrieb.",
  "Im Restaurant zahle ich mit der Karte oder bar.",
  "Der neue Kollege beginnt am ersten August.",
    "Jede Aufgabe zählt für die Note im Modul.",
    "Die Liste der Pendenzen führe ich auf dem Handy.",
    "Am Dienstag habe ich einen Kontrolltermin beim Arzt.",
    "Wir treffen uns am Eingang vom Hauptbahnhof.",
    "Am Nachmittag gehe ich einkaufen für die WG.",
    "Ueberstunden gleiche ich im nächsten Monat aus.",
    "Im Winter fahre ich mit Freunden mit dem Zug in die Berge."
];

const NUM_SENTENCES = [
  "Der Lohn beträgt 4200 Franken im Monat.",
  "Die Prämie kostet 320 Franken pro Quartal.",
  "Ab 8 Uhr bin ich im Betrieb.",
  "Der Zug fährt um 17.42 Uhr ab.",
  "Die Fahrt dauert 35 Minuten.",
  "Das Meeting beginnt um 9.30 Uhr.",
  "Das Praktikum dauert 18 Monate.",
  "Der Rabatt beträgt 15 Prozent.",
  "Im Dezember sind 22 Arbeitstage.",
  "Die Wohnung hat 65 Quadratmeter.",
  "Das Konto ist mit 840 Franken im Minus.",
  "Bis zur Prüfung sind es noch 34 Tage.",
  "Die Spesen betragen 210 Franken Auslagen.",
  "Die Verspätung beträgt 12 Minuten.",
  "Die Lehrstelle ist 3 Kilometer entfernt."
];

const PUNCT_SENTENCES = [
  "Hast du die E-Mail schon beantwortet? Ja, sofort!",
  "Bitte den Bericht bis Freitag abgeben: Frist ist Freitag.",
  "Achtung: Die Aufgaben zählen für die Note!",
  "Wie war dein erster Tag? Super, aber anstrengend!",
  "Termine: Montag 8 Uhr, Mittwoch 13.30 Uhr, Freitag frei.",
  "Lohn am Ende des Monats; Rechnungen rechtzeitig zahlen.",
  "Bist du bereit für die Prüfung? Ich hoffe schon!",
  "Gut gemacht! Weiter so bis zum Abschluss!",
  "Achtung, neue Frist: Die Dokumente bis morgen senden.",
  "Frage: Wie viel kostet das Abonnement? Antwort: 185 Franken.",
  "Weisst du, wo du die Lehre machst? In Bern.",
  "Vorsicht: Der Rapport muss genau stimmen!",
  "Kannst du die Schicht übernehmen? Ja, klar!",
  "Hast du den Termin schon eingetragen? Nein, noch nicht.",
  "Die Zahlung ist erfolgt; die Rechnung ist damit beglichen."
];

const LESSONS = [
  { n:1,  title:"Grundstellung",      keys:"asdfjklö",   kind:"letters" },
  { n:2,  title:"E und I",            keys:"ei",         kind:"letters" },
  { n:3,  title:"R und U",            keys:"ru",         kind:"letters" },
  { n:4,  title:"G und H",            keys:"gh",         kind:"letters" },
  { n:5,  title:"T und N",            keys:"tn",         kind:"letters" },
  { n:6,  title:"W und O",            keys:"wo",         kind:"letters" },
  { n:7,  title:"Z und M",            keys:"zm",         kind:"letters" },
  { n:8,  title:"C und Komma",        keys:"c,",         kind:"letters" },
  { n:9,  title:"B und P",            keys:"bp",         kind:"letters" },
  { n:10, title:"V und Punkt",        keys:"v.",         kind:"letters" },
  { n:11, title:"Ä und Ü",            keys:"äü",         kind:"letters" },
  { n:12, title:"Q und X",            keys:"qx",         kind:"letters" },
  { n:13, title:"Y und Bindestrich",  keys:"y-",         kind:"letters" },
  { n:14, title:"Grossbuchstaben",    keys:"⇧",          kind:"shift" },
  { n:15, title:"Zahlen",             keys:"1234567890", kind:"numbers" },
  { n:16, title:"Satzzeichen",        keys:"?!:;",       kind:"punct" },
  { n:17, title:"Ganze Sätze",        keys:"",           kind:"sentences" }
];

const ZehnfingerData = { WORD_SRC, SENTENCES, NUM_SENTENCES, PUNCT_SENTENCES, LESSONS };
if (typeof module !== "undefined") module.exports = ZehnfingerData;