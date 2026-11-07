"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { browser } = require("./helpers/browser.js");
const root = path.resolve(__dirname, "..");
const { defaults } = require("../logic.js");

function completeRun(app) {
  app.evaluate('startTraining({ mode:"lesson", idx:0, title:"Test", text:"asdfj" })');
  app.type("x");
  for (const c of "asdfj") app.type(c);
}

test("Normale Scripts starten ohne CommonJS und speichern ein Training lokal", () => {
  const app = browser();
  assert.equal(app.evaluate("view"), "home");
  assert.ok(app.storageCalls > 0);
  completeRun(app);
  const data = app.snapshot("data");
  assert.equal(data.history.length, 1);
  const h = data.history[0];
  assert.deepEqual({ acc:h.acc, apm:h.apm, ms:h.ms, chars:h.chars, errors:h.errors, lesson:h.lesson },
    { acc:83.3, apm:60, ms:5000, chars:5, errors:1, lesson:1 });
  assert.equal(data.lessons[1].stars, 0);
  assert.deepEqual(data.keyStats.a, { n:1, e:1 });
  assert.equal(app.evaluate("view"), "result");
  assert.deepEqual(JSON.parse(app.storage.get("zehnfinger.v1")), data);
  assert.equal(app.messages.length, 0);
});

test("embed wartet auf gültigen Host, sperrt Abkürzung und meldet Übung samt Stand", () => {
  const app = browser({ embed:true });
  assert.equal(app.storageCalls, 0);
  assert.deepEqual(app.messages.map(m => m.message.type), ["ready"]);
  assert.equal(app.elements.has("#lessons"), false);
  const state = defaults();
  state.settings.unlockAll = true;
  app.init(state, { origin:"https://other.test" });
  app.init(state, { source:{} });
  assert.equal(app.elements.has("#lessons"), false);
  app.init(state);
  assert.equal(app.evaluate("view"), "home");
  assert.equal(app.evaluate("isUnlocked(data, 1, EMBED)"), false);
  completeRun(app);
  assert.equal(app.storageCalls, 0);
  const report = app.messages.find(m => m.message.type === "run");
  assert.equal(report.origin, "https://example.test");
  const r = report.message.run;
  assert.deepEqual({ acc:r.acc, apm:r.apm, ms:r.ms, chars:r.chars, errors:r.errors, lesson:r.lesson,
    starsBefore:r.starsBefore, starsAfter:r.starsAfter, bestApmBefore:r.bestApmBefore },
    { acc:83.3, apm:60, ms:5000, chars:5, errors:1, lesson:1, starsBefore:0, starsAfter:0, bestApmBefore:0 });
  app.flush(400);
  assert.equal(app.messages.filter(m => m.message.type === "state").length, 1);
  const saved = app.messages.find(m => m.message.type === "state").message.state;
  assert.equal(saved.history.length, 1);
  // Ein zweites init darf den inzwischen geänderten Stand nicht ersetzen.
  app.init(defaults());
  assert.equal(app.evaluate("data.history.length"), 1);
});

test("embed ohne Host startet auch nach Zeitablauf nicht leer", () => {
  const app = browser({ embed:true });
  app.flush(15000);
  assert.equal(app.elements.has("#lessons"), false);
  assert.match(app.elements.get("#hostProblem").textContent, /Fortschritt wird noch geladen/);
  assert.equal(app.storageCalls, 0);
  assert.deepEqual(app.messages.map(m => m.message.type), ["ready"]);
});

test("Problemtasten-Training behält den aktuellen Stand bei Wiederholung", () => {
  const app = browser();
  app.evaluate('data.keyStats.a = { n:8, e:2 };');
  app.elements.get("#freeProblem").onclick();
  assert.equal(app.evaluate("run.cfg.mode"), "problem");
  assert.equal(app.evaluate('run.cfg.text.startsWith("aaa faf afa faaf")'), true);
  assert.equal(app.evaluate('typeof run.cfg.regen()'), "string");
});

test("HTML lädt data → logic → app; Offline-Assets enthalten logic.js", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m => m[1]);
  assert.deepEqual(scripts, ["data.js", "logic.js", "app.js"]);
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(sw, /"\.\/logic\.js"/);
  assert.match(sw, /const CACHE = "zehnfinger-v3"/);
});
