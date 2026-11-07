"use strict";
// Bewusst kleine DOM-Simulation: prüft Script-Verknüpfung und Ereignisabläufe,
// nicht Layout, echte Browser-APIs oder Service-Worker-Lebenszyklus.
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");

function browser({ embed = false, sources } = {}) {
  const elements = new Map(), listeners = {}, messages = [], storage = new Map(), timers = [];
  let storageCalls = 0, clock = 0;
  function element() {
    const classes = new Set();
    return {
      hidden:false, style:{ setProperty() {} }, children:[], childNodes:[], value:"", textContent:"",
      classList:{ add(...c) { c.forEach(v => classes.add(v)); }, remove(...c) { c.forEach(v => classes.delete(v)); },
        toggle(c, on) { if (on) classes.add(c); else classes.delete(c); } },
      appendChild(child) { this.children.push(child); this.childNodes.push(child); return child; },
      prepend() {}, remove() {}, click() { this.onclick?.(); }, closest() { return null; },
      addEventListener() {}, scrollTo() {}, offsetTop:0, offsetHeight:20, offsetWidth:100,
      querySelectorAll(selector) {
        const all = this.children.flatMap(c => [c, ...c.querySelectorAll("*")]);
        return selector === ".c" ? all.filter(c => /\bc\b/.test(c.className || "")) : all;
      },
      set innerHTML(value) { this.children = []; this.childNodes = []; this._html = value; },
      get innerHTML() { return this._html || ""; }
    };
  }
  const document = {
    querySelector(selector) { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); },
    querySelectorAll() { return []; },
    getElementById(id) { return elements.get("#" + id) || null; },
    createElement:element,
    body:{ appendChild() {}, prepend(el) { elements.set("#" + el.id, el); } }
  };
  const parent = { postMessage(message, origin) { messages.push({ message, origin }); } };
  const window = { addEventListener(name, callback) { listeners[name] = callback; }, scrollTo() {} };
  window.parent = embed ? parent : window;
  const location = { search:embed ? "?embed=1" : "", origin:"https://example.test", protocol:"file:" };
  const context = vm.createContext({ window, document, location, navigator:{}, URLSearchParams,
    performance:{ now:() => (clock += 1000) },
    localStorage:{
      setItem(k, v) { storageCalls++; storage.set(k, v); },
      removeItem(k) { storageCalls++; storage.delete(k); },
      getItem(k) { storageCalls++; return storage.get(k) || null; }
    },
    setTimeout(callback, ms) { timers.push({ callback, ms }); return timers.length; },
    clearTimeout(id) { if (timers[id - 1]) timers[id - 1].cancelled = true; }
  });
  const scripts = sources || ["data.js", "logic.js", "app.js"].map(file => fs.readFileSync(path.join(root, file), "utf8"));
  scripts.forEach(source => vm.runInContext(source, context));
  return {
    evaluate:source => vm.runInContext(source, context),
    snapshot:source => JSON.parse(vm.runInContext(`JSON.stringify(${source})`, context)),
    get storageCalls() { return storageCalls; },
    storage, messages, timers, elements,
    init(state, overrides = {}) {
      listeners.message({ origin:location.origin, source:parent,
        data:{ source:"zehnfinger-host", type:"init", state }, ...overrides });
    },
    type(key) { listeners.keydown({ key, code:"", preventDefault() {} }); },
    flush(ms) { for (const t of timers.splice(0)) if (!t.cancelled && t.ms === ms) t.callback(); }
  };
}
module.exports = { browser };
