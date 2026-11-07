"use strict";

// Normales Browser-Script und CommonJS-Modul, ohne DOM oder Browser-Speicher.
const ZehnfingerLogic = (() => {
const { WORD_SRC, SENTENCES, NUM_SENTENCES, PUNCT_SENTENCES, LESSONS } =
  typeof module !== "undefined" && module.exports ? require("./data.js") : ZehnfingerData;
const pick = (a, random = Math.random) => a[Math.floor(random() * a.length)];
const shuffle = (a, random = Math.random) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Tastatur Deutsch (Schweiz) ---------- */
// Finger: 0 kleiner L, 1 Ring L, 2 Mittel L, 3 Zeige L, 4 Daumen L, 5 Daumen R, 6 Zeige R, 7 Mittel R, 8 Ring R, 9 kleiner R
const ROWS = [
  [["§","°",0],["1","+",0],["2","\"",1],["3","*",2],["4","ç",3],["5","%",3],["6","&",6],["7","/",6],["8","(",7],["9",")",8],["0","=",9],["'","?",9],["^","`",9],{id:"bksp",label:"⌫",w:2}],
  [{id:"tab",label:"Tab",w:1.5},["q","Q",0],["w","W",1],["e","E",2],["r","R",3],["t","T",3],["z","Z",6],["u","U",6],["i","I",7],["o","O",8],["p","P",9],["ü","è",9],["¨","!",9],{id:"enter",label:"↵",w:1.5}],
  [{id:"caps",label:"⇪",w:1.75},["a","A",0],["s","S",1],["d","D",2],["f","F",3],["g","G",3],["h","H",6],["j","J",6],["k","K",7],["l","L",8],["ö","é",9],["ä","à",9],["$","£",9],{id:"enter2",label:"",w:1.25}],
  [{id:"shiftL",label:"⇧",w:1.25,f:0},["<",">",0],["y","Y",0],["x","X",1],["c","C",2],["v","V",3],["b","B",3],["n","N",6],["m","M",6],[",",";",7],[".",":",8],["-","_",9],{id:"shiftR",label:"⇧",w:2.75,f:9}],
  [{id:"blankL",label:"",w:3.75,blank:true},{id:"space",label:"",w:7.5,f:4},{id:"blankR",label:"",w:3.75,blank:true}]
];
const DEAD = new Set(["¨","^","`"]);
const KEYMAP = {};   // Zeichen -> {id, shift}
const KEYINFO = {};  // id -> {f}
ROWS.forEach((row, r) => row.forEach((k, i) => {
  if (Array.isArray(k)) {
    const [n, s, f] = k, id = `k${r}_${i}`;
    KEYINFO[id] = { f };
    if (!DEAD.has(n)) KEYMAP[n] = { id, shift: false };
    if (!DEAD.has(s)) KEYMAP[s] = { id, shift: true };
  } else KEYINFO[k.id] = { f: k.f ?? null };
}));
KEYMAP[" "] = { id: "space", shift: false };
const HOME = { 0:"a", 1:"s", 2:"d", 3:"f", 6:"j", 7:"k", 8:"l", 9:"ö" };
const fingerOf = c => KEYMAP[c] ? KEYINFO[KEYMAP[c].id].f : null;

/* ---------- Texte erzeugen (Inhalte in data.js) ---------- */
const LOWER_WORDS = [...new Set(WORD_SRC.map(w => w.toLowerCase()))];
const NOUNS = [...new Set(WORD_SRC.filter(w => /^[A-Z]/.test(w)))];
function allowedFor(idx) {
  const s = new Set([" "]);
  for (let j = 0; j <= Math.min(idx, 12); j++) for (const c of LESSONS[j].keys) s.add(c);
  if (idx >= 13) for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") s.add(c);
  if (idx >= 14) for (const c of "0123456789") s.add(c);
  if (idx >= 15) for (const c of "?!:;'") s.add(c);
  if (idx >= 16) Object.keys(KEYMAP).forEach(c => s.add(c));
  return s;
}
const fits = (w, allowed) => [...w].every(c => allowed.has(c));
function drillFor(chars) {
  const g = [];
  for (const c of chars) {
    const f = fingerOf(c); if (f === null) continue;
    const a = HOME[f] && HOME[f] !== c ? HOME[f] : (f <= 4 ? "f" : "j");
    g.push(c + c + c, a + c + a, c + a + c, a + c + c + a);
  }
  return g;
}
function makePseudo(letters, fresh, n, random = Math.random) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const len = 3 + Math.floor(random() * 3);
    const w = Array.from({ length: len }, () => pick(letters, random));
    w[Math.floor(random() * len)] = pick(fresh, random);
    out.push(w.join(""));
  }
  return out;
}
function sampleWords(pool, fresh, len, allowed, random = Math.random) {
  const out = []; let total = 0, guard = 0, last = "";
  while (total < len && guard++ < 600) {
    const src = fresh.length && random() < 0.6 ? fresh : pool;
    if (!src.length) break;
    let w = pick(src, random);
    if (w === last && src.length > 1) continue;
    last = w;
    if (allowed.has(",") && random() < 0.12) w += ",";
    else if (allowed.has(".") && random() < 0.1) w += ".";
    out.push(w); total += w.length + 1;
  }
  return out;
}
function pickSentences(list, len, allowed, random = Math.random) {
  const ok = shuffle(allowed ? list.filter(s => fits(s, allowed)) : list, random);
  const out = []; let total = 0;
  for (const s of ok) { if (total >= len) break; out.push(s); total += s.length + 1; }
  return out;
}
function lessonText(idx, random = Math.random) {
  const L = LESSONS[idx], allowed = allowedFor(idx);
  if (L.kind === "letters") {
    const target = 150;
    let groups;
    if (idx === 0) {
      groups = [];
      for (const [x, y] of [["f","j"],["d","k"],["s","l"],["a","ö"]]) groups.push(x+x+x, y+y+y, x+y+x, y+x+y);
      groups.push("asdf", "jklö");
    } else groups = drillFor([...L.keys]);
    const drill = []; let len = 0;
    for (const g of groups) { if (len > target * 0.45) break; drill.push(g); len += g.length + 1; }
    const pool = LOWER_WORDS.filter(w => fits(w, allowed));
    const fresh = pool.filter(w => [...L.keys].some(c => w.includes(c)));
    const letters = [...allowed].filter(c => /\p{L}/u.test(c));
    const newLetters = [...L.keys].filter(c => /\p{L}/u.test(c));
    const extra = pool.length < 12 ? makePseudo(letters, newLetters.length ? newLetters : letters, 12, random) : [];
    const words = sampleWords(pool.concat(extra), fresh.length >= 3 ? fresh : [], target - len, allowed, random);
    return drill.concat(words).join(" ");
  }
  if (L.kind === "shift") {
    const drill = shuffle("asdfjklerutn".split(""), random).slice(0, 6).map(c => c.toUpperCase() + c + c);
    const nouns = sampleWords(NOUNS.filter(w => fits(w, allowed)), [], 90, new Set(), random);
    const sent = pickSentences(SENTENCES.filter(s => s.length < 60), 50, allowed, random);
    return drill.concat(nouns, sent).join(" ");
  }
  if (L.kind === "numbers") {
    const drill = shuffle(["a1a","s2s","d3d","f4f","f5f","j6j","j7j","k8k","l9l","ö0ö"], random).slice(0, 6);
    const nums = Array.from({ length: 6 }, () => String(1 + Math.floor(random() * (random() < .5 ? 99 : 2999))));
    return drill.concat(nums, pickSentences(NUM_SENTENCES, 90, allowed, random)).join(" ");
  }
  if (L.kind === "punct") {
    const drill = shuffle(["ja?","nein!","so:","und;","wie?","los!","halt:","gut;"], random).slice(0, 6);
    return drill.concat(pickSentences(PUNCT_SENTENCES, 130, allowed, random)).join(" ");
  }
  return sentencesText(random);
}
const sentencesText = (random = Math.random) => pickSentences(SENTENCES.concat(PUNCT_SENTENCES, NUM_SENTENCES), 260, undefined, random).join(" ");
function normalizeCustom(t) {
  t = t.replace(/ß/g, "ss").replace(/[„“”«»]/g, '"').replace(/[‘’‚‹›]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...")
       .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/\s+/g, " ").trim();
  const removed = new Set(); let out = "";
  for (const c of t) { if (KEYMAP[c]) out += c; else removed.add(c); }
  return { text: out.replace(/ {2,}/g, " ").trim().slice(0, 1200), removed: [...removed] };
}

/* ---------- Speicher und Auswertung ---------- */
const defaults = () => ({ lessons:{}, history:[], days:{}, keyStats:{}, badges:{}, customText:"", lastBackup:0,
  settings:{ goal:10, hands:true, sound:false, unlockAll:false } });
const merge = d => { const def = defaults(); return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}) } }; };
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function streak(data, today = new Date()) {
  const d = new Date(today); let n = 0;
  if (!(data.days[dayKey(d)] >= 30000)) d.setDate(d.getDate() - 1);
  while (data.days[dayKey(d)] >= 30000) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const starsOf = (data, n) => (data.lessons[n] && data.lessons[n].stars) || 0;
const totalStars = data => Object.values(data.lessons).reduce((a, r) => a + (r.stars || 0), 0);
// Im Lernportal gibt es keine Abkürzung: die nächste Lektion öffnet sich erst mit 90 % Genauigkeit.
const isUnlocked = (data, idx, embed = false) => idx === 0 || (data.settings.unlockAll && !embed) || starsOf(data, LESSONS[idx - 1].n) >= 1;
const starsFor = acc => acc >= 98 ? 3 : acc >= 95 ? 2 : acc >= 90 ? 1 : 0;
// Nur Übungen mit mindestens 15 Sekunden und 80 Zeichen zählen fürs Tempo, sonst verfälschen Mini-Texte die Rekorde.
const bestApm = data => data.history.filter(h => h.acc >= 90 && h.ms >= 15000 && h.chars >= 80).reduce((m, h) => Math.max(m, h.apm), 0);
const totalMs = data => Object.values(data.days).reduce((a, b) => a + b, 0);
function recommended(data, embed = false) {
  const open = LESSONS.findIndex((L, i) => isUnlocked(data, i, embed) && starsOf(data, L.n) === 0);
  if (open >= 0) return open;
  let best = LESSONS.length - 1, low = 4;
  LESSONS.forEach((L, i) => { const s = starsOf(data, L.n); if (s < low) { low = s; best = i; } });
  return best;
}
const BADGES = [
  { id:"first",   icon:"🚀", name:"Los geht's",         desc:"Erste Übung geschafft",            check:c => c.runs >= 1 },
  { id:"home3",   icon:"🏠", name:"Grundreihe-Profi",   desc:"Lektion 1 mit drei Sternen",       check:(c, data) => starsOf(data, 1) >= 3 },
  { id:"clean",   icon:"✨", name:"Fehlerfrei",         desc:"Eine Übung ganz ohne Fehler",      check:c => c.clean },
  { id:"streak3", icon:"🔥", name:"Dranbleiben",        desc:"3 Tage hintereinander",            check:c => c.streak >= 3 },
  { id:"hour",    icon:"⏱️", name:"Eine Stunde",        desc:"60 Minuten geübt",                 check:c => c.ms >= 3600000 },
  { id:"abc",     icon:"🔤", name:"Alle Buchstaben",    desc:"Lektion 13 geschafft",             check:(c, data) => starsOf(data, 13) >= 1 },
  { id:"apm100",  icon:"⚡", name:"Blitz",              desc:"100 Anschläge pro Minute",         check:c => c.best >= 100 },
  { id:"streak7", icon:"🏆", name:"Wochenserie",        desc:"7 Tage hintereinander",            check:c => c.streak >= 7 },
  { id:"stars30", icon:"⭐", name:"Sternensammler",     desc:"30 Sterne gesammelt",              check:c => c.stars >= 30 },
  { id:"apm150",  icon:"🏎️", name:"Turbo",              desc:"150 Anschläge pro Minute",         check:c => c.best >= 150 },
  { id:"apm200",  icon:"🛸", name:"Überschall",         desc:"200 Anschläge pro Minute",         check:c => c.best >= 200 },
  { id:"apm250",  icon:"🚀", name:"Raketenstart",       desc:"250 Anschläge pro Minute",         check:c => c.best >= 250 },
  // Genauigkeit: nur Übungen ab 80 Zeichen zählen, sonst sind Mini-Texte zu leicht.
  { id:"acc95x3", icon:"🎯", name:"Sauber",             desc:"3 Übungen hintereinander mit 95 % Genauigkeit", check:c => c.run3 >= 95 },
  { id:"acc98",   icon:"💎", name:"Präzise",            desc:"Eine Übung mit 98 % Genauigkeit (ab 150 Zeichen)", check:c => c.long98 },
  { id:"clean3",  icon:"🧼", name:"Makellos",           desc:"3 Übungen hintereinander ganz ohne Fehler", check:c => c.clean3 },
  { id:"fastclean", icon:"🏅", name:"Schnell und genau", desc:"150 Anschläge pro Minute bei 98 % Genauigkeit", check:c => c.fastClean },
  { id:"master",  icon:"🎓", name:"Zehnfinger-Profi",   desc:"Alle 17 Lektionen geschafft",      check:(c, data) => LESSONS.every(L => starsOf(data, L.n) >= 1) }
];
const countsForBadge = h => h.chars >= 80 && h.ms >= 15000;
function checkBadges(data, now = Date.now()) {
  // Die drei letzten zählenden Übungen: reihen sich Fehler ein, ist die Serie unterbrochen.
  const last3 = data.history.filter(countsForBadge).slice(-3);
  const ctx = { runs:data.history.length, best:bestApm(data), streak:streak(data, new Date(now)), stars:totalStars(data), ms:totalMs(data),
    clean: data.history.some(h => h.errors === 0 && h.chars >= 80),
    run3: last3.length === 3 ? Math.min(...last3.map(h => h.acc)) : 0,
    clean3: last3.length === 3 && last3.every(h => h.errors === 0),
    long98: data.history.some(h => countsForBadge(h) && h.chars >= 150 && h.acc >= 98),
    fastClean: data.history.some(h => countsForBadge(h) && h.apm >= 150 && h.acc >= 98) };
  const got = [];
  for (const b of BADGES) if (!data.badges[b.id] && b.check(ctx, data)) { data.badges[b.id] = now; got.push(b); }
  return got;
}
function problemChars(data) {
  return Object.entries(data.keyStats)
    .filter(([c, s]) => c !== " " && KEYMAP[c] && s.n + s.e >= 8)
    .map(([c, s]) => [c, s.e / (s.n + s.e)])
    .filter(([, r]) => r >= 0.05)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
}
function problemText(data, random = Math.random) {
  const chars = problemChars(data).map(([c]) => c);
  const all = new Set(Object.keys(KEYMAP));
  const words = LOWER_WORDS.filter(w => chars.some(c => w.includes(c)));
  return drillFor(chars).slice(0, 8).concat(sampleWords(words.length ? words : LOWER_WORDS, [], 150, all, random)).join(" ");
}
function statFor(data, c) {
  const k = c.toLowerCase();
  return data.keyStats[k] || (data.keyStats[k] = { n:0, e:0 });
}
function recordTime(data, active, today = new Date()) {
  const key = dayKey(today);
  if (active > 0) data.days[key] = (data.days[key] || 0) + Math.round(active);
}
const apmFor = (chars, ms) => Math.round(chars / (ms / 60000));
function liveApmFor(pos, active) {
  const secs = active / 1000;
  return secs >= 3 ? Math.round(pos / (secs / 60)) : null;
}
function runMetrics(chars, errors, active) {
  const apm = apmFor(chars, Math.max(active, 1000));
  const acc = Math.round(1000 * chars / (chars + errors)) / 10;
  return { apm, acc, stars:starsFor(acc) };
}
return { pick, shuffle, ROWS, KEYMAP, KEYINFO, HOME, fingerOf, LOWER_WORDS, NOUNS,
  allowedFor, fits, drillFor, makePseudo, sampleWords, pickSentences, lessonText, sentencesText, normalizeCustom,
  defaults, merge, dayKey, streak, starsOf, totalStars, isUnlocked, starsFor, bestApm, totalMs,
  recommended, BADGES, countsForBadge, checkBadges, problemChars, problemText, statFor, recordTime, apmFor, liveApmFor, runMetrics };
})();
if (typeof module !== "undefined") module.exports = ZehnfingerLogic;
