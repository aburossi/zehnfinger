"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { browser } = require("./helpers/browser.js");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html"), css = read("style.css");
function luminance(hex) {
  return hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255)
    .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
    .reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
test("Text- und Fingerfarben haben in beiden Farbschemata mindestens 4.5:1", () => {
  for (const block of css.matchAll(/:root\s*\{([^}]+)}/g)) {
    const vars = Object.fromEntries([...block[1].matchAll(/--([\w-]+):#([a-f\d]{6})/g)].map(m => [m[1], m[2]]));
    for (const name of ["ink", "muted", "accent", "ok", "err", "fixed", "done", "f-pinky", "f-ring", "f-middle", "f-index", "f-thumb"]) {
      for (const bg of ["surface", "surface-2", "bg"]) assert.ok(contrast(vars[name], vars[bg]) >= 4.5, `${name}/${bg}`);
      if (name.startsWith("f-") || name === "accent" || name === "err") assert.ok(contrast(vars[name], vars["accent-ink"]) >= 4.5, `${name}/Tastenschrift`);
    }
    assert.ok(contrast(vars.muted, vars["accent-soft"]) >= 4.5, "Hero-Hintergrund");
    const blend = (a, b, weight) => a.match(/\w\w/g).map((x, i) => Math.round(parseInt(x, 16) * weight + parseInt(b.slice(i * 2, i * 2 + 2), 16) * (1 - weight)).toString(16).padStart(2, "0")).join("");
    assert.ok(contrast(vars.err, blend(vars.err, vars.surface, .12)) >= 4.5, "Fehlerhintergrund");
    assert.ok(contrast(vars.ok, blend(vars.ok, vars["surface-2"], .18)) >= 4.5, "Plan erledigt");
  }
});
test("Statische Buttons sind benannt, Eingaben beschriftet und Dekoration verborgen", () => {
  for (const [, attrs, content] of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const label = /aria-label="([^"]+)"/.exec(attrs)?.[1] || content.replace(/<[^>]*>/g, "").trim();
    assert.match(label, /[\p{L}\p{N}]/u);
  }
  for (const id of ["customText", "setGoal", "setHands", "setSound", "setUnlock", "setLargeText"]) assert.ok(html.includes(`for="${id}"`));
  for (const id of ["kb", "hands"]) assert.match(html, new RegExp(`id="${id}"[^>]*aria-hidden="true"`));
  assert.match(html, /id="status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion/);
});
test("Fokus folgt Ansichten; Tab und Browser-Shortcuts bleiben frei; Buttons erhalten Zeichen", () => {
  const app = browser();
  app.evaluate('startTraining({mode:"custom", title:"Test", text:"asdfj"})');
  assert.equal(app.evaluate('document.activeElement === $("#trainTitle")'), true);
  for (const event of ['{key:"Tab"}', '{key:"l",ctrlKey:true}', '{key:"x",altKey:true}', '{key:" ",target:$("#trainBack")}']) {
    app.evaluate(`onTrainKey({...${event}, preventDefault(){throw Error("verschluckt")}})`);
  }
  assert.equal(app.evaluate("run.pos + run.errors"), 0);
  app.type("Escape");
  assert.equal(app.evaluate('document.activeElement === $("#heroTitle")'), true);
  app.evaluate('startTraining({mode:"custom", title:"Test", text:"asdfj"})');
  for (const c of "asdfj") app.type(c);
  assert.equal(app.evaluate('document.activeElement === $("#rTitle")'), true);
  assert.match(app.elements.get("#status").textContent, /Genauigkeit/);
  // Enter auf Übersicht muss dessen native Aktion erhalten.
  app.type("Enter", {target:app.elements.get("#rHome"), preventDefault(){throw Error("Enter verschluckt")}});
  assert.equal(app.evaluate("view"), "result");
  app.elements.get("#rHome").click();
  assert.equal(app.evaluate("view"), "home");
});
test("Schriftgrösse bleibt gespeichert; Sterne, Abzeichen und Kurve bieten Text", () => {
  const app = browser();
  app.elements.get("#setLargeText").onchange({target:{checked:true}});
  assert.equal(JSON.parse(app.storage.get("zehnfinger.v1")).settings.largeText, true);
  app.evaluate('data.history = [{apm:100,acc:95},{apm:120,acc:98}]; renderHome()');
  assert.match(app.elements.get("#chart").innerHTML, /Übung 2: 120 Anschläge pro Minute, 98 % Genauigkeit/);
  assert.match(app.elements.get("#badges").innerHTML, /Noch nicht erreicht/);
  assert.match(app.evaluate("starHtml(2)"), /role="img" aria-label="2 von 3 Sternen"/);
  for (const child of app.elements.get("#lessons").children) assert.match(child.innerHTML, /Lektion \d/);
});
test("Offline-Assets decken HTML, Manifest und sämtliche lokalen Laufzeitdateien ab", async () => {
  const handlers = {}, cache = new Map();
  const context = vm.createContext({
    self:{addEventListener:(name, fn) => handlers[name] = fn, location:{origin:"https://example.test"}, skipWaiting(){}, clients:{claim(){}}},
    caches:{open:async () => ({addAll:async assets => { for (const asset of assets) cache.set(asset, read(asset === "./" ? "index.html" : asset)); }}), match:async req => cache.get(typeof req === "string" ? req : new URL(req.url).pathname.replace("/", "./")), keys:async () => []},
    fetch:async () => {throw Error("offline")}, URL, setTimeout:() => 0
  });
  vm.runInContext(read("sw.js"), context);
  const assets = JSON.parse(vm.runInContext("JSON.stringify(ASSETS)", context));
  const expected = ["./", ...fs.readdirSync(root).filter(f => /\.(js|css|html|webmanifest)$/.test(f) && f !== "sw.js").map(f => "./" + f), ...fs.readdirSync(path.join(root,"icons")).map(f => "./icons/" + f)];
  for (const [, file] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) if (!file.startsWith("https:")) expected.push("./" + file);
  for (const icon of JSON.parse(read("manifest.webmanifest")).icons) expected.push("./" + icon.src);
  for (const asset of expected) assert.ok(assets.includes(asset), asset);
  for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), asset);
  let installed;
  handlers.install({waitUntil:p => installed = p}); await installed;
  for (const file of ["index.html", "style.css", "data.js", "logic.js", "app.js"]) {
    let response;
    handlers.fetch({request:{url:"https://example.test/" + file, method:"GET", mode:file === "index.html" ? "navigate" : "same-origin"}, respondWith:p => response = p});
    assert.equal(await response, read(file));
  }
});
