"use strict";
/* Inhalte von Zehnfinger: Wörter, Sätze, Lektionen.
   Neue Wörter einfach in WORD_SRC ergänzen: Nomen gross, alles andere klein, ohne «ß».
   Wörter, die mit Ä, Ö oder Ü beginnen, vermeiden (auf der Schweizer Tastatur nur über eine Tottaste tippbar). */

const WORD_SRC = `
da das als all alle fall falls lass Saal Aal Salsa Kalk
die sie lies leise Seil Keil Eile Eis fleissig Esel Kiel ideal Idee alles Adel Sessel
und ein eine einen einer ich du er es wir ihr sind ist hat haben hatte war wer wie was wo wann warum weil wenn dass nicht nein ja auch aber oder denn dann noch schon sehr viel mehr immer heute morgen gestern hier dort mit ohne für über unter neben vor nach bei zu zum zur auf aus in im an am von vom bis durch um so nur gut gross klein neu alt jung lang kurz schnell langsam laut hell dunkel warm kalt nass trocken schön lustig müde froh stark rund leicht schwer frei fertig richtig falsch genau jeder etwas nichts viele wenig ganz halb bald oft gern gerne selten zusammen allein wieder
gehen laufen rennen springen spielen lernen lesen schreiben rechnen tippen singen tanzen malen zeichnen kochen essen trinken schlafen fahren fliegen schwimmen klettern bauen suchen finden sagen fragen hören sehen denken lachen helfen kaufen machen holen geben nehmen stehen sitzen liegen rufen warten reden teilen gewinnen verlieren üben feiern kommen bringen zeigen treffen wissen können dürfen müssen wollen
Schule Klasse Lehrer Lehrerin Pause Heft Buch Stift Tafel Tisch Stuhl Rucksack Mathe Deutsch Sport Musik Natur Test Note Zeugnis Ferien Lager Ausflug Turnhalle Pausenplatz Znüni Zmittag Zvieri Brot Käse Milch Apfel Birne Banane Rüebli Glace Schokolade Pizza Pasta Rösti Zopf Wasser Saft Tee Velo Trottinett Bus Tram Zug Bahnhof Postauto Auto Schiff Berg See Fluss Wald Wiese Garten Haus Zimmer Bett Fenster Tür Küche Keller Dach Stadt Dorf Land Strasse Weg Brücke Insel Himmel Sonne Mond Stern Regen Schnee Wind Wolke Gewitter Sommer Winter Herbst Frühling Abend Nacht Tag Woche Monat Jahr Uhr Minute Stunde Hund Katze Maus Pferd Kuh Schaf Ziege Huhn Fisch Vogel Adler Fuchs Hase Igel Bär Wolf Luchs Frosch Biene Ameise Spinne Schlange Löwe Tiger Elefant Giraffe Affe Delfin Hai Wal Drache Ball Tor Goal Match Team Trainer Fussball Unihockey Handball Tennis Ski Snowboard Schlitten Spiel Karte Würfel Puzzle Lego Handy Laptop Computer Tastatur Bildschirm Game Level Punkt Rekord Freund Freundin Familie Mutter Vater Bruder Schwester Grosi Onkel Tante Baby Name Kopf Hand Finger Fuss Bein Arm Auge Ohr Nase Mund Zahn Haar Herz Farbe Lied Film Kino Bild Foto Geschenk Geburtstag Party Kuchen Kerze Feuer Luft Erde Stein Sand Holz Gold Silber Geld Franken Laden Markt Kiosk Frage Antwort Fehler Ziel Sieg Mut Glück Spass Freude Welt Schweiz Kanton Alpen Rhein Aare Tessin Bern Basel Luzern Zürich Wallis Jura Taxi Hexe Boxer Box Axt Quiz Quelle Qualle Yoga Pony Hobby
`.split(/\s+/).filter(Boolean);

const SENTENCES = [
  "Am Mittwochnachmittag spielen wir Fussball auf dem Pausenplatz.",
  "Mein Velo steht im Keller neben dem Trottinett.",
  "Zum Znüni gibt es einen Apfel und ein Stück Brot.",
  "Im Sommer gehen wir in die Badi und essen eine Glace.",
  "Der Zug nach Bern fährt pünktlich um halb acht ab.",
  "Meine Katze schläft am liebsten auf dem warmen Sofa.",
  "Nach der Schule mache ich zuerst die Hausaufgaben.",
  "Im Winter fahren wir mit der Familie in die Berge.",
  "Auf dem Säntis liegt schon Schnee.",
  "Das Grosi backt am Sonntag einen feinen Zopf.",
  "Wir üben jeden Tag zehn Minuten mit allen zehn Fingern.",
  "Der Hund bellt, wenn der Pöstler kommt.",
  "In der Turnhalle spielen wir heute Unihockey.",
  "Mein Bruder baut aus Lego eine riesige Burg.",
  "Die Aare ist im August warm genug zum Schwimmen.",
  "Wer schnell tippen will, muss zuerst genau tippen.",
  "Der Lehrer erklärt, wie ein Vulkan funktioniert.",
  "Am Samstag helfen wir beim Aufräumen im Garten.",
  "Ein Eichhörnchen sammelt Nüsse für den Winter.",
  "Die Rüebli aus dem Garten schmecken besonders süss.",
  "Unser Klassenlager findet dieses Jahr im Tessin statt.",
  "Beim Gamen vergesse ich manchmal die Zeit.",
  "Die Kühe tragen grosse Glocken um den Hals.",
  "Mit dem Postauto fahren wir über den Pass.",
  "Heute Abend gibt es Rösti mit Spiegelei.",
  "Der Wind bläst die Blätter über die Strasse.",
  "Im Museum sehen wir die Knochen eines Dinosauriers.",
  "Wenn es regnet, spielen wir drinnen ein Brettspiel.",
  "Kopf hoch, Blick auf den Bildschirm, Finger auf der Grundreihe."
];

const NUM_SENTENCES = [
  "Wir treffen uns um 14 Uhr beim Bahnhof.",
  "Das neue Velo kostet 480 Franken.",
  "Im Jahr 1291 wurde die Eidgenossenschaft gegründet.",
  "Der Zug hat 8 Wagen und 420 Sitzplätze.",
  "Heute ist es 23 Grad warm.",
  "Auf dem Pausenplatz stehen 3 Tischtennistische.",
  "Unser Team hat 5 zu 2 gewonnen.",
  "Bis zu den Ferien sind es noch 17 Tage.",
  "Die Schweiz hat 26 Kantone."
];

const PUNCT_SENTENCES = [
  "Hast du heute Zeit? Wir könnten Velo fahren!",
  "Achtung: Die Glace schmilzt sehr schnell!",
  "Wer kommt mit in die Badi? Ich komme gerne!",
  "Einkaufsliste: Milch, Brot, Käse und Birnen.",
  "Es regnet; trotzdem gehen wir hinaus.",
  "Wie spät ist es? Schon so spät!",
  "Merke dir: Zuerst genau, dann schnell.",
  "Bist du bereit? Los geht's!",
  "Toll gemacht! Weiter so!",
  "Frage: Wie viele Kantone hat die Schweiz? Antwort: 26."
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
