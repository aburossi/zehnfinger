"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { LESSONS } = require("../data.js");
const L = require("../logic.js");

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}
const history = (extra = {}) => ({ acc:98, apm:150, chars:150, ms:60000, errors:0, ...extra });

test("Schweizer Tastatur: Finger, Shift und Tottasten", () => {
  for (const [c, f] of [["a",0],["Y",0],["z",6],["Z",6],["ü",9],["ö",9],["ä",9],['"',1],["ç",3],[";",7],[":",8],["?",9],[" ",4]]) {
    assert.equal(L.fingerOf(c), f, c);
  }
  for (const c of ["Ä", "ß", "^", "`", "¨", "🙂"]) assert.equal(L.fingerOf(c), null, c);
  assert.equal(L.KEYMAP.Z.shift, true);
  assert.equal(L.KEYMAP.z.shift, false);
  assert.equal(L.KEYMAP.Z.id, L.KEYMAP.z.id);
});

test("allowedFor wächst monoton, ohne spätere Zeichen vorwegzunehmen", () => {
  assert.deepEqual([...L.allowedFor(0)].sort(), [..." asdfjklö"].sort());
  for (let i = 1; i < LESSONS.length; i++) {
    const before = L.allowedFor(i - 1), after = L.allowedFor(i);
    for (const c of before) assert.ok(after.has(c), `Lektion ${i + 1}: ${c}`);
    assert.ok(after.size > before.size);
  }
  for (const [c, idx] of [["e",1],["ä",10],["Y",13],["9",14],["?",15],["£",16]]) {
    assert.ok(!L.allowedFor(idx - 1).has(c));
    assert.ok(L.allowedFor(idx).has(c));
  }
});

for (const [idx, lesson] of LESSONS.entries()) {
  test(`Lektion ${lesson.n}: 80 reproduzierbare Texte enthalten nur erlaubte Zeichen`, () => {
    for (let seed = 1; seed <= 80; seed++) {
      const text = L.lessonText(idx, random(seed));
      assert.ok(text.length > 0);
      assert.ok(L.fits(text, L.allowedFor(idx)), `Seed ${seed}: ${text}`);
      assert.ok([...text].every(c => L.KEYMAP[c]));
      assert.equal(text, L.lessonText(idx, random(seed)));
    }
  });
}

test("Zufall ist in allen Text-Hilfen ersetzbar; Eingaben bleiben unverändert", () => {
  const pool = ["a", "s", "d", "f"];
  assert.deepEqual(L.shuffle(pool, random(5)), L.shuffle(pool, random(5)));
  assert.deepEqual(pool, ["a", "s", "d", "f"]);
  assert.equal(L.pick(pool, () => 0), "a");
  assert.deepEqual(L.makePseudo(["a"], ["s"], 2, () => 0), ["saa", "saa"]);
  assert.deepEqual(L.sampleWords([], [], 50, new Set(), random(1)), []);
  assert.deepEqual(L.pickSentences(["abc", "a a"], 20, new Set("a "), random(1)), ["a a"]);
});

test("normalizeCustom: U+00DF, Anführungszeichen und Schweizer Gross-Umlaute", () => {
  assert.deepEqual(L.normalizeCustom("  Äpfel Öl Übung Straße „ja“ «nein» ‘so’ ‹gut› – — …\nöäü  "), {
    text:'Aepfel Oel Uebung Strasse "ja" "nein" \'so\' \'gut\' - - ... öäü', removed:[]
  });
});

test("normalizeCustom: unbekannte Zeichen einmal melden, Leerraum und Länge begrenzen", () => {
  assert.deepEqual(L.normalizeCustom("a🙂🙂 é @ € 🙂\t b"), { text:"a é b", removed:["🙂", "@", "€"] });
  assert.deepEqual(L.normalizeCustom("🙂@"), { text:"", removed:["🙂", "@"] });
  assert.equal(L.normalizeCustom("a".repeat(1300)).text.length, 1200);
});

test("starsFor: Grenzen 90, 95 und 98 Prozent", () => {
  for (const [acc, stars] of [[0,0],[89.9,0],[90,1],[94.9,1],[95,2],[97.9,2],[98,3],[100,3]]) {
    assert.equal(L.starsFor(acc), stars, String(acc));
  }
});

test("streak: Monatsgrenze und Schaltjahr; Datum wird nicht verändert", () => {
  const data = L.defaults(), today = new Date(2024, 2, 1, 12);
  Object.assign(data.days, { "2024-03-01":30000, "2024-02-29":30000, "2024-02-28":40000, "2024-02-27":29999 });
  assert.equal(L.dayKey(today), "2024-03-01");
  assert.equal(L.streak(data, today), 3);
  assert.equal(L.dayKey(today), "2024-03-01");
  data.days["2024-03-01"] = 29999;
  assert.equal(L.streak(data, today), 2);
  assert.equal(L.streak(data, new Date(2024, 2, 2, 12)), 0);
});

test("streak: Jahreswechsel und leerer Stand", () => {
  const data = L.defaults();
  assert.equal(L.streak(data, new Date(2025, 0, 1, 12)), 0);
  data.days = { "2024-12-31":30000, "2024-12-30":30000 };
  assert.equal(L.streak(data, new Date(2025, 0, 1, 12)), 2);
  assert.equal(L.totalMs(data), 60000);
});

test("bestApm ignoriert zu kurze, zu kleine und ungenaue Übungen", () => {
  const data = L.defaults();
  assert.equal(L.bestApm(data), 0);
  data.history = [history({ apm:900, ms:14999 }), history({ apm:800, chars:79 }), history({ apm:700, acc:89.9 })];
  assert.equal(L.bestApm(data), 0);
  data.history.push(history({ apm:100, ms:15000, chars:80, acc:90 }), history({ apm:99 }));
  assert.equal(L.bestApm(data), 100);
});

test("Abzeichen werden alle genau einmal vergeben, Zeitstempel bleiben erhalten", () => {
  const data = L.defaults(), now = new Date(2025, 0, 7, 12).getTime();
  for (const lesson of LESSONS) data.lessons[lesson.n] = { stars:3 };
  for (let i = 1; i <= 7; i++) data.days[`2025-01-0${i}`] = 600000;
  data.history = Array.from({ length:3 }, () => history({ apm:250 }));
  const got = L.checkBadges(data, now);
  assert.deepEqual(got.map(b => b.id), L.BADGES.map(b => b.id));
  assert.equal(new Set(got.map(b => b.id)).size, L.BADGES.length);
  assert.ok(Object.values(data.badges).every(t => t === now));
  assert.deepEqual(L.checkBadges(data, now + 86400000), []);
  assert.ok(Object.values(data.badges).every(t => t === now));
});

test("Abzeichen: leerer Stand, Mindestlänge und unterbrochene Genauigkeitsserie", () => {
  const data = L.defaults(), now = new Date(2025, 0, 7, 12).getTime();
  assert.deepEqual(L.checkBadges(data, now), []);
  data.history = Array.from({ length:3 }, () => history({ chars:79, ms:14999 }));
  assert.deepEqual(L.checkBadges(data, now).map(b => b.id), ["first"]);
  data.history = [history(), history({ errors:10, acc:90 }), history()];
  const got = L.checkBadges(data, now).map(b => b.id);
  assert.ok(!got.includes("acc95x3"));
  assert.ok(!got.includes("clean3"));
  assert.ok(got.includes("acc98"));
  assert.ok(got.includes("fastclean"));
});

test("merge ergänzt fehlende Einstellungen, erhält Werte und verändert die Eingabe nicht", () => {
  const input = { lessons:{ 1:{ stars:2 } }, settings:{ goal:5, hands:false } };
  const before = JSON.stringify(input), merged = L.merge(input);
  assert.deepEqual(merged.settings, { goal:5, hands:false, sound:false, unlockAll:false });
  assert.deepEqual(merged.history, []);
  assert.deepEqual(merged.lessons, input.lessons);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(L.merge({}).settings, L.defaults().settings);
  assert.deepEqual(L.merge({ settings:null }).settings, L.defaults().settings);
  const a = L.defaults(), b = L.defaults();
  a.settings.goal = 20; a.history.push(history());
  assert.equal(b.settings.goal, 10);
  assert.deepEqual(b.history, []);
});

test("Freischaltung und Empfehlung beachten embed trotz unlockAll", () => {
  const data = L.defaults();
  assert.equal(L.recommended(data), 0);
  assert.equal(L.isUnlocked(data, 0, true), true);
  assert.equal(L.isUnlocked(data, 1, true), false);
  data.settings.unlockAll = true;
  assert.equal(L.isUnlocked(data, 16), true);
  assert.equal(L.isUnlocked(data, 16, true), false);
  data.lessons[1] = { stars:1 };
  assert.equal(L.isUnlocked(data, 1, true), true);
  assert.equal(L.recommended(data, true), 1);
  for (const lesson of LESSONS) data.lessons[lesson.n] = { stars:3 };
  data.lessons[5].stars = 1;
  assert.equal(L.recommended(data, true), 4);
  assert.equal(L.totalStars(data), 49);
});

test("Genauigkeit und APM: Rundung, Mindestzeit sowie Fehler zählen wie bisher", () => {
  assert.deepEqual(L.runMetrics(100, 0, 60000), { apm:100, acc:100, stars:3 });
  assert.deepEqual(L.runMetrics(100, 5, 30000), { apm:200, acc:95.2, stars:2 });
  assert.deepEqual(L.runMetrics(100, 12, 60000), { apm:100, acc:89.3, stars:0 });
  assert.deepEqual(L.runMetrics(5, 0, 0), { apm:300, acc:100, stars:3 });
  assert.equal(L.apmFor(10, 3000), 200);
  assert.equal(L.liveApmFor(10, 2999), null);
  assert.equal(L.liveApmFor(10, 3000), 200);
  assert.equal(L.liveApmFor(0, 3000), 0);
});

test("Übungszeit wird gerundet dem richtigen Tag zugerechnet, auch beim Abbruch", () => {
  const data = L.defaults(), date = new Date(2025, 0, 31, 12);
  L.recordTime(data, 0, date);
  assert.deepEqual(data.days, {});
  L.recordTime(data, 1000.6, date);
  L.recordTime(data, 500, date);
  assert.deepEqual(data.days, { "2025-01-31":1501 });
  assert.equal(L.sentencesText(random(42)), L.sentencesText(random(42)));
  assert.ok(L.fits(L.sentencesText(random(42)), L.allowedFor(16)));
});

test("Problemtasten und Zeichenstatistik erhalten Filter, Reihenfolge und Kleinschreibung", () => {
  const data = L.defaults();
  L.statFor(data, "A").n++;
  assert.equal(L.statFor(data, "a").n, 1);
  data.keyStats = { a:{ n:8,e:2 }, s:{ n:7,e:1 }, d:{ n:7,e:0 }, f:{ n:100,e:1 }, " ":{ n:0,e:10 }, "@":{ n:0,e:10 } };
  assert.deepEqual(L.problemChars(data), [["a",0.2],["s",0.125]]);
  const text = L.problemText(data, random(1));
  assert.ok(text.startsWith("aaa faf afa faaf"));
  assert.ok([...text].every(c => L.KEYMAP[c]));
});
