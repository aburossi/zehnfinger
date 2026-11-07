"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

test("dailyText: Gleicher Text am gleichen Datum, unterschiedlich an anderen Tagen", () => {
  const d1 = new Date(2026, 10, 7); // 2026-11-07
  const d2 = new Date(2026, 10, 8); // 2026-11-08

  const text1a = L.dailyText(d1);
  const text1b = L.dailyText("2026-11-07");
  const text2 = L.dailyText(d2);

  assert.equal(text1a, text1b, "Datums-Objekt und String müssen denselben Text liefern");
  assert.ok(text1a.length > 50, "Tagesaufgabe muss substantielle Textlänge haben");
  assert.notEqual(text1a, text2, "Unterschiedliche Tage müssen unterschiedlichen Text liefern");
  assert.ok([...text1a].every(c => L.KEYMAP[c]), "Alle Zeichen müssen auf Schweizer Tastatur tippbar sein");
  assert.ok([...text2].every(c => L.KEYMAP[c]), "Alle Zeichen müssen auf Schweizer Tastatur tippbar sein");

  // Vorgebbarer Zufall
  const customText = L.dailyText(d1, () => 0);
  assert.ok(typeof customText === "string" && customText.length > 0);
});

test("speedChallengeText und huntChallengeText erzeugen gültigen Text", () => {
  const speedText = L.speedChallengeText(() => 0.5);
  assert.ok(speedText.length >= 300, "Zeitrennen-Text muss lang genug für 60 s sein");
  assert.ok([...speedText].every(c => L.KEYMAP[c]));

  // Fehlerjagd ohne bestehende Fehler (Fallback)
  const emptyData = L.defaults();
  const hunt1 = L.huntChallengeText(emptyData, () => 0.2);
  assert.ok(hunt1.length > 20);
  assert.ok([...hunt1].every(c => L.KEYMAP[c]));

  // Fehlerjagd mit bestehenden Problemtasten
  emptyData.keyStats = { a: { n: 10, e: 4 }, k: { n: 10, e: 3 } };
  const hunt2 = L.huntChallengeText(emptyData, () => 0.2);
  assert.ok(hunt2.includes("aaa"));
  assert.ok([...hunt2].every(c => L.KEYMAP[c]));
});

test("fingerErrorAnalysis ordnet Tasten und Fehler den richtigen Fingern zu", () => {
  const empty = L.fingerErrorAnalysis({});
  assert.equal(empty.totalErrors, 0);
  assert.equal(empty.byFinger.length, 0);
  assert.equal(empty.worstFinger, null);
  assert.equal(empty.worstKeys.length, 0);

  // 'a' = Finger 0 (kleiner Finger L), 's' = Finger 1 (Ringfinger L), ' ' = Finger 4 (Daumen)
  const wrongMap = { a: 3, s: 1, " ": 2 };
  const res = L.fingerErrorAnalysis(wrongMap);

  assert.equal(res.totalErrors, 6);
  assert.equal(res.worstFinger.finger, 0);
  assert.equal(res.worstFinger.name, "kleiner Finger links");
  assert.equal(res.worstFinger.count, 3);
  assert.deepEqual(res.worstFinger.keys, [{ key: "a", count: 3 }]);

  assert.equal(res.worstKeys[0].key, "a");
  assert.equal(res.worstKeys[0].count, 3);
  assert.equal(res.worstKeys[0].finger, 0);

  // Daumen hat 2 Fehler
  const thumb = res.byFinger.find(f => f.finger === 4);
  assert.ok(thumb);
  assert.equal(thumb.count, 2);
});

test("compareWithHistory vergleicht APM und Genauigkeit mit dem Schnitt der letzten Übungen", () => {
  // Leere Historie
  const compEmpty = L.compareWithHistory([], { apm: 120, acc: 95 });
  assert.equal(compEmpty.hasComparison, false);

  // Historie mit 3 Übungen
  const history = [
    { ms: 20000, chars: 100, apm: 100, acc: 90 },
    { ms: 20000, chars: 100, apm: 110, acc: 92 },
    { ms: 20000, chars: 100, apm: 120, acc: 94 }
  ];
  // Schnitt: APM = 110, Acc = 92.0
  const compAbove = L.compareWithHistory(history, { apm: 125, acc: 95.5 });
  assert.equal(compAbove.hasComparison, true);
  assert.equal(compAbove.avgApm, 110);
  assert.equal(compAbove.avgAcc, 92);
  assert.equal(compAbove.diffApm, 15);
  assert.equal(compAbove.diffAcc, 3.5);
  assert.match(compAbove.apmText, /\+15 über deinem Schnitt/);
  assert.match(compAbove.accText, /\+3.5 % über deinem Schnitt/);

  const compBelow = L.compareWithHistory(history, { apm: 95, acc: 88 });
  assert.equal(compBelow.diffApm, -15);
  assert.equal(compBelow.diffAcc, -4);
  assert.match(compBelow.apmText, /-15 unter deinem Schnitt/);
});

test("nextStepRecommendation gibt konkrete, zielgerichtete Empfehlungen", () => {
  // Lesson unter 90%
  const recLow = L.nextStepRecommendation({
    mode: "lesson",
    lessonIdx: 0,
    stars: 0,
    acc: 85,
    analysis: {
      worstFinger: { name: "Ringfinger links", keys: [{ key: "s" }] }
    }
  });
  assert.match(recLow, /Ringfinger links/);
  assert.match(recLow, /«s»/);

  // Fehlerjagd mit Fehlern
  const recHuntErr = L.nextStepRecommendation({
    mode: "fehlerjagd",
    errors: 2,
    analysis: { worstKeys: [{ key: "k" }] }
  });
  assert.match(recHuntErr, /«k»/);

  // Fehlerjagd sauber
  const recHuntClean = L.nextStepRecommendation({ mode: "fehlerjagd", errors: 0 });
  assert.match(recHuntClean, /fehlerfrei geschafft/);
});

test("updateChallengeRecord speichert und aktualisiert persönliche Bestmarken", () => {
  let records = {};

  // Erstes Zeitrennen
  const res1 = L.updateChallengeRecord(records, "zeitrennen", { chars: 150, apm: 150, acc: 95 });
  records = res1.challenges;
  assert.equal(records.zeitrennen.bestChars, 150);
  assert.equal(records.zeitrennen.bestApm, 150);
  assert.equal(res1.isNewBest, false, "Erster Eintrag ist Standortbestimmung");

  // Zweites Zeitrennen: Neue Bestmarke
  const res2 = L.updateChallengeRecord(records, "zeitrennen", { chars: 180, apm: 180, acc: 96 });
  records = res2.challenges;
  assert.equal(records.zeitrennen.bestChars, 180);
  assert.equal(records.zeitrennen.bestApm, 180);
  assert.equal(res2.isNewBest, true);

  // Drittes Zeitrennen: Schlechteres Ergebnis überschreibt Bestmarke nicht
  const res3 = L.updateChallengeRecord(records, "zeitrennen", { chars: 140, apm: 140, acc: 90 });
  records = res3.challenges;
  assert.equal(records.zeitrennen.bestChars, 180);
  assert.equal(res3.isNewBest, false);

  // Fehlerjagd
  const huntFail = L.updateChallengeRecord(records, "fehlerjagd", { chars: 100, apm: 120, acc: 95, errors: 1 });
  assert.equal(huntFail.challenges.fehlerjagd.cleanRuns, 0);

  const huntClean = L.updateChallengeRecord(huntFail.challenges, "fehlerjagd", { chars: 100, apm: 130, acc: 100, errors: 0 });
  assert.equal(huntClean.challenges.fehlerjagd.cleanRuns, 1);
  assert.equal(huntClean.challenges.fehlerjagd.bestApm, 130);
  assert.equal(huntClean.isNewBest, true);
});

test("Trainingspläne: Auswahl, Vorschlag pro Tag und Fortschritt", () => {
  const data = L.defaults();
  assert.equal(L.getPlanProgress(data.plan).active, false);

  // Plan starten
  L.setPlan(data, "grundlagen", "2026-11-01");
  const p1 = L.getPlanProgress(data.plan, "2026-11-01");
  assert.equal(p1.active, true);
  assert.equal(p1.planId, "grundlagen");
  assert.equal(p1.totalDays, 28);
  assert.equal(p1.completedCount, 0);
  assert.equal(p1.percent, 0);
  assert.equal(p1.currentDayNumber, 1);
  assert.equal(p1.currentTask.type, "lesson");
  assert.equal(p1.currentTask.targetId, 0);
  assert.equal(p1.isTodayDone, false);

  // Tag 1 erledigen
  const ok1 = L.completePlanDay(data, "2026-11-01");
  assert.equal(ok1, true);

  // Zweiter Versuch am selben Tag wird ignoriert
  const okAgain = L.completePlanDay(data, "2026-11-01");
  assert.equal(okAgain, false);

  const p2 = L.getPlanProgress(data.plan, "2026-11-01");
  assert.equal(p2.completedCount, 1);
  assert.equal(p2.percent, 4); // 1 / 28 = 3.57% -> 4%
  assert.equal(p2.isTodayDone, true);
  assert.equal(p2.currentDayNumber, 2);

  // Am nächsten Tag ist die nächste Aufgabe fällig
  const pNextDay = L.getPlanProgress(data.plan, "2026-11-02");
  assert.equal(pNextDay.isTodayDone, false);
  assert.equal(pNextDay.currentDayNumber, 2);
  assert.equal(pNextDay.currentTask.targetId, 1); // Lektion 2

  // Plan wechseln
  L.setPlan(data, "auffrischen", "2026-11-05");
  const pAuffrischen = L.getPlanProgress(data.plan, "2026-11-05");
  assert.equal(pAuffrischen.planId, "auffrischen");
  assert.equal(pAuffrischen.totalDays, 7);
  assert.equal(pAuffrischen.completedCount, 0);
});

test("Bestehende Stände ohne neue Felder (challenges, plan) laden sauber via merge", () => {
  const oldData = {
    lessons: { 1: { stars: 3, bestApm: 120 } },
    history: [{ t: 1700000000000, lesson: 1, apm: 120, acc: 99, ms: 30000, chars: 100, errors: 1 }],
    days: { "2026-11-01": 300000 },
    keyStats: { a: { n: 20, e: 1 } },
    badges: { first: 1700000000000 },
    settings: { goal: 15, hands: false, sound: true, unlockAll: false }
  };

  const merged = L.merge(oldData);
  assert.ok(merged.challenges && typeof merged.challenges === "object");
  assert.deepEqual(merged.challenges, {});
  assert.ok(merged.plan && typeof merged.plan === "object");
  assert.deepEqual(merged.plan, { id: null, startDate: null, completedDays: [] });
  assert.equal(merged.lessons[1].stars, 3);
  assert.equal(merged.settings.goal, 15);
  assert.equal(merged.settings.sound, true);
});

const { browser } = require("./helpers/browser.js");

test("embed: run-Nachricht enthält optionales Feld mode für Lektionen, Herausforderungen und Freies Training", () => {
  const app = browser({ embed: true });
  app.init(L.defaults());

  // 1. Lektion
  app.evaluate('startTraining({ mode:"lesson", idx:0, title:"Lektion 1", text:"asdfj" })');
  for (const c of "asdfj") app.type(c);
  let runMsg = app.messages.filter(m => m.message.type === "run").pop();
  assert.equal(runMsg.message.run.mode, "lesson");

  // 2. Zeitrennen
  app.evaluate('startTraining({ mode:"zeitrennen", title:"Zeitrennen", text:"asdfj" })');
  for (const c of "asdfj") app.type(c);
  runMsg = app.messages.filter(m => m.message.type === "run").pop();
  assert.equal(runMsg.message.run.mode, "zeitrennen");

  // 3. Fehlerjagd
  app.evaluate('startTraining({ mode:"fehlerjagd", title:"Fehlerjagd", text:"asdfj" })');
  for (const c of "asdfj") app.type(c);
  runMsg = app.messages.filter(m => m.message.type === "run").pop();
  assert.equal(runMsg.message.run.mode, "fehlerjagd");

  // 4. Tagesaufgabe
  app.evaluate('startTraining({ mode:"tagesaufgabe", title:"Tagesaufgabe", text:"asdfj" })');
  for (const c of "asdfj") app.type(c);
  runMsg = app.messages.filter(m => m.message.type === "run").pop();
  assert.equal(runMsg.message.run.mode, "tagesaufgabe");

  // 5. Ganze Sätze -> mode: "free"
  app.evaluate('startTraining({ mode:"sentences", title:"Ganze Sätze", text:"asdfj" })');
  for (const c of "asdfj") app.type(c);
  runMsg = app.messages.filter(m => m.message.type === "run").pop();
  assert.equal(runMsg.message.run.mode, "free");

  // 6. Problemtasten -> mode: "problem"
  app.evaluate('startTraining({ mode:"problem", title:"Problemtasten", text:"asdfj" })');
  for (const c of "asdfj") app.type(c);
  runMsg = app.messages.filter(m => m.message.type === "run").pop();
  assert.equal(runMsg.message.run.mode, "problem");
});

test("UI: Herausforderungen starten und Bestmarken anzeigen", () => {
  const app = browser();
  assert.equal(app.evaluate("view"), "home");

  // Buttons für Herausforderungen vorhanden und klickbar
  app.elements.get("#btnZeitrennen").onclick();
  assert.equal(app.evaluate("run.cfg.mode"), "zeitrennen");
  assert.equal(app.evaluate("run.cfg.duration"), 60000);
  app.evaluate("abortRun()");

  app.elements.get("#btnFehlerjagd").onclick();
  assert.equal(app.evaluate("run.cfg.mode"), "fehlerjagd");
  app.evaluate("abortRun()");

  app.elements.get("#btnTagesaufgabe").onclick();
  assert.equal(app.evaluate("run.cfg.mode"), "tagesaufgabe");
  app.evaluate("abortRun()");
});

test("UI: Detaillierte Rückmeldung (Finger/Tasten, Schnitt, nächster Schritt) im Resultat", () => {
  const app = browser();
  app.evaluate('startTraining({ mode:"lesson", idx:0, title:"Lektion 1", text:"asdfj" })');
  // Tippfehler auf 'a'
  app.type("x");
  for (const c of "asdfj") app.type(c);

  assert.equal(app.evaluate("view"), "result");
  const extraHtml = app.elements.get("#rExtra").innerHTML;
  assert.match(extraHtml, /Fehleranalyse/);
  assert.match(extraHtml, /kleiner Finger links/);
  assert.match(extraHtml, /Nächster Schritt/);
});
