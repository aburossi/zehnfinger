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
  challenges:{}, plan:{ id:null, startDate:null, completedDays:[] },
  settings:{ goal:10, hands:true, sound:false, unlockAll:false } });
const merge = d => {
  const def = defaults();
  if (!d || typeof d !== "object") return def;
  return {
    ...def,
    ...d,
    challenges: { ...def.challenges, ...(d.challenges || {}) },
    plan: { ...def.plan, ...(d.plan || {}) },
    settings: { ...def.settings, ...(d.settings || {}) }
  };
};
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

/* ---------- Herausforderungen & Analyse ---------- */
const FINGER_NAMES = [
  "kleiner Finger links",   // 0
  "Ringfinger links",       // 1
  "Mittelfinger links",     // 2
  "Zeigefinger links",      // 3
  "Daumen",                 // 4
  "Daumen",                 // 5
  "Zeigefinger rechts",     // 6
  "Mittelfinger rechts",    // 7
  "Ringfinger rechts",      // 8
  "kleiner Finger rechts"   // 9
];

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
function dailyText(date = new Date(), random = null) {
  const key = typeof date === "string" ? date : dayKey(date);
  const rng = typeof random === "function" ? random : seededRandom(hashString("daily:" + key));
  const pool = SENTENCES.concat(PUNCT_SENTENCES);
  return pickSentences(pool, 180, undefined, rng).join(" ");
}
function speedChallengeText(random = Math.random) {
  return pickSentences(SENTENCES.concat(PUNCT_SENTENCES), 800, undefined, random).join(" ");
}
function huntChallengeText(data, random = Math.random) {
  const probs = data ? problemChars(data) : [];
  if (probs.length > 0) return problemText(data, random);
  const fallback = ["e", "i", "s", "d", "r", "t", "n"];
  const all = new Set(Object.keys(KEYMAP));
  const words = LOWER_WORDS.filter(w => fallback.some(c => w.includes(c)));
  return drillFor(fallback).slice(0, 6).concat(sampleWords(words.length ? words : LOWER_WORDS, [], 140, all, random)).join(" ");
}

function fingerErrorAnalysis(wrongMap = {}) {
  const fingerCounts = Array(10).fill(0);
  const fingerKeys = Array.from({ length: 10 }, () => ({}));
  let totalErrors = 0;

  for (const [char, count] of Object.entries(wrongMap)) {
    if (!count) continue;
    totalErrors += count;
    const f = fingerOf(char);
    if (f !== null && f >= 0 && f <= 9) {
      fingerCounts[f] += count;
      fingerKeys[f][char] = (fingerKeys[f][char] || 0) + count;
    }
  }

  const byFinger = [];
  for (let i = 0; i < 10; i++) {
    if (fingerCounts[i] > 0) {
      const keys = Object.entries(fingerKeys[i])
        .map(([key, cnt]) => ({ key, count: cnt }))
        .sort((a, b) => b.count - a.count);
      byFinger.push({
        finger: i,
        name: FINGER_NAMES[i],
        count: fingerCounts[i],
        keys
      });
    }
  }
  byFinger.sort((a, b) => b.count - a.count);

  const worstKeys = Object.entries(wrongMap)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ key, count, finger: fingerOf(key) }))
    .sort((a, b) => b.count - a.count);

  return {
    totalErrors,
    byFinger,
    worstFinger: byFinger[0] || null,
    worstKeys
  };
}

function compareWithHistory(history = [], currentRun = {}) {
  const validRuns = history.filter(h => h && typeof h.apm === "number" && typeof h.acc === "number" && h.ms >= 5000 && h.chars >= 10);
  if (validRuns.length === 0) {
    return {
      hasComparison: false,
      sampleSize: 0,
      avgApm: null,
      avgAcc: null,
      diffApm: 0,
      diffAcc: 0,
      summary: "Erste Übung – ab der nächsten siehst du hier den Vergleich mit deinem Schnitt."
    };
  }
  const sample = validRuns.slice(-10);
  const avgApm = Math.round(sample.reduce((sum, h) => sum + h.apm, 0) / sample.length);
  const avgAcc = Math.round((sample.reduce((sum, h) => sum + h.acc, 0) / sample.length) * 10) / 10;

  const currentApm = typeof currentRun.apm === "number" ? currentRun.apm : 0;
  const currentAcc = typeof currentRun.acc === "number" ? currentRun.acc : 0;

  const diffApm = currentApm - avgApm;
  const diffAcc = Math.round((currentAcc - avgAcc) * 10) / 10;

  const apmText = diffApm > 0 ? `+${diffApm} über deinem Schnitt (${avgApm} APM)` :
                  diffApm < 0 ? `${diffApm} unter deinem Schnitt (${avgApm} APM)` :
                  `auf deinem Schnitt (${avgApm} APM)`;
  const accText = diffAcc > 0 ? `+${diffAcc} % über deinem Schnitt (${avgAcc} %)` :
                  diffAcc < 0 ? `${diffAcc} % unter deinem Schnitt (${avgAcc} %)` :
                  `auf deinem Schnitt (${avgAcc} %)`;

  return {
    hasComparison: true,
    sampleSize: sample.length,
    avgApm,
    avgAcc,
    diffApm,
    diffAcc,
    apmText,
    accText,
    summary: `Tempo: ${apmText}. Genauigkeit: ${accText}.`
  };
}

function nextStepRecommendation({ mode, lessonIdx, stars, acc, apm, errors, analysis, data }) {
  if (mode === "zeitrennen") {
    if (acc < 90) return "Tipp fürs Zeitrennen: Achte zuerst auf Treffsicherheit. Jeder Fehler kostet mehr Zeit als ruhiges Tippen.";
    return "Starkes Zeitrennen! Versuch beim nächsten Durchgang noch mehr fehlerfreie Anschläge herauszuholen.";
  }
  if (mode === "fehlerjagd") {
    if (errors === 0) return "Perfekt fehlerfrei geschafft! Versuch beim nächsten Mal, dasselbe fehlerfreie Ergebnis mit etwas höherem Tempo zu wiederholen.";
    const worstK = analysis && analysis.worstKeys && analysis.worstKeys[0] ? analysis.worstKeys[0].key : null;
    return worstK
      ? `Achte beim nächsten Versuch besonders auf die Taste «${worstK}». Ruhig bleiben und nicht hetzen!`
      : "Fast geschafft! Nimm das Tempo etwas zurück, um die Fehlerjagd komplett fehlerfrei zu beenden.";
  }
  if (mode === "tagesaufgabe") {
    return "Tagesaufgabe für heute erledigt! Mach jetzt mit deinem Trainingsplan oder einer Lektion weiter.";
  }
  if (mode === "lesson") {
    if (acc < 90) {
      if (analysis && analysis.worstFinger) {
        const keyNames = analysis.worstFinger.keys.map(k => `«${k.key}»`).join(", ");
        return `Tippe etwas langsamer. Achte besonders auf den ${analysis.worstFinger.name} (Taste ${keyNames}).`;
      }
      return "Genau vor schnell: Schau nicht auf die Tastatur und tippe langsam und gleichmässig, um 90 % zu erreichen.";
    }
    if (stars < 3) {
      return "Lektion bestanden! Wiederhole sie noch einmal, um 3 Sterne (ab 98 % Genauigkeit) zu holen.";
    }
    if (typeof lessonIdx === "number" && lessonIdx < LESSONS.length - 1) {
      return `Perfekt mit 3 Sternen! Weiter geht's mit Lektion ${lessonIdx + 2}: ${LESSONS[lessonIdx + 1].title}.`;
    }
    return "Alle Lektionen gemeistert! Trainiere dein Tempo im Zeitrennen oder in den freien Sätzen.";
  }
  return "Gut geübt! Halte die Genauigkeit hoch und bleib dran, um deine Serie auszubauen.";
}

function updateChallengeRecord(challenges = {}, mode, runResult) {
  const next = { ...challenges };
  const cur = next[mode] || { runs: 0, bestApm: 0, bestAcc: 0, bestChars: 0, cleanRuns: 0 };
  let isNewBest = false;

  const apm = typeof runResult.apm === "number" ? runResult.apm : 0;
  const acc = typeof runResult.acc === "number" ? runResult.acc : 0;
  const chars = typeof runResult.chars === "number" ? runResult.chars : 0;
  const errors = typeof runResult.errors === "number" ? runResult.errors : 0;

  const updated = {
    ...cur,
    runs: (cur.runs || 0) + 1,
    lastPlayed: runResult.t || Date.now()
  };

  if (mode === "zeitrennen") {
    if (chars > (cur.bestChars || 0)) {
      isNewBest = (cur.bestChars || 0) > 0;
      updated.bestChars = chars;
      updated.bestApm = Math.max(cur.bestApm || 0, apm);
    } else {
      updated.bestChars = cur.bestChars || chars;
      updated.bestApm = Math.max(cur.bestApm || 0, apm);
    }
    updated.bestAcc = Math.max(cur.bestAcc || 0, acc);
  } else if (mode === "fehlerjagd") {
    const isClean = errors === 0;
    if (isClean) {
      updated.cleanRuns = (cur.cleanRuns || 0) + 1;
      if (apm > (cur.bestApm || 0)) {
        isNewBest = true;
        updated.bestApm = apm;
      }
    }
    updated.bestAcc = Math.max(cur.bestAcc || 0, acc);
    if (!updated.bestApm) updated.bestApm = cur.bestApm || 0;
  } else if (mode === "tagesaufgabe") {
    if (apm > (cur.bestApm || 0)) {
      isNewBest = (cur.bestApm || 0) > 0;
      updated.bestApm = apm;
    }
    updated.bestAcc = Math.max(cur.bestAcc || 0, acc);
    updated.lastDate = runResult.date || dayKey(new Date(runResult.t || Date.now()));
  } else {
    if (apm > (cur.bestApm || 0)) {
      isNewBest = true;
      updated.bestApm = apm;
    }
    updated.bestAcc = Math.max(cur.bestAcc || 0, acc);
  }

  next[mode] = updated;
  return { challenges: next, isNewBest, previousBest: cur };
}

/* ---------- Trainingspläne ---------- */
const PLANS = {
  grundlagen: {
    id: "grundlagen",
    title: "4 Wochen Grundlagen",
    desc: "Schritt für Schritt durch alle Tastenreihen, ideal für den Einstieg (täglich ca. 10 Min.).",
    durationWeeks: 4,
    days: [
      { day:1, type:"lesson", targetId:0, title:"Lektion 1: Grundreihe", minutes:10, desc:"F, J und die Grundreihe festigen." },
      { day:2, type:"lesson", targetId:1, title:"Lektion 2: E und I", minutes:10, desc:"Die oberen Vokale mit Mittel- und Zeigefinger." },
      { day:3, type:"lesson", targetId:2, title:"Lektion 3: R und U", minutes:10, desc:"Zeigefinger nach oben strecken." },
      { day:4, type:"lesson", targetId:3, title:"Lektion 4: T und Z", minutes:10, desc:"Zeigefinger weit nach oben (Schweizer Z!)." },
      { day:5, type:"lesson", targetId:4, title:"Lektion 5: H und G", minutes:10, desc:"Zeigefinger zur Mitte der Grundreihe." },
      { day:6, type:"challenge", targetId:"fehlerjagd", title:"Fehlerjagd", minutes:10, desc:"Erste Fehlerjagd: Konzentriert und fehlerfrei tippen." },
      { day:7, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Wochenabschluss mit der heutigen Tagesaufgabe." },

      { day:8, type:"lesson", targetId:5, title:"Lektion 6: O und W", minutes:10, desc:"Ringfinger nach oben." },
      { day:9, type:"lesson", targetId:6, title:"Lektion 7: P und Q", minutes:10, desc:"Kleiner Finger nach oben." },
      { day:10, type:"lesson", targetId:7, title:"Lektion 8: C und Komma", minutes:10, desc:"Erster Schritt in die untere Reihe." },
      { day:11, type:"lesson", targetId:8, title:"Lektion 9: V und M", minutes:10, desc:"Zeigefinger nach unten." },
      { day:12, type:"lesson", targetId:9, title:"Lektion 10: B und N", minutes:10, desc:"Zeigefinger unten zur Mitte." },
      { day:13, type:"challenge", targetId:"fehlerjagd", title:"Fehlerjagd", minutes:10, desc:"Eigene Problemzonen gezielt angehen." },
      { day:14, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Halbzeit! Tagesaufgabe meistern." },

      { day:15, type:"lesson", targetId:10, title:"Lektion 11: Ä und Ü", minutes:10, desc:"Umlaute mit dem kleinen Finger rechts." },
      { day:16, type:"lesson", targetId:11, title:"Lektion 12: X und Punkt", minutes:10, desc:"Ringfinger nach unten." },
      { day:17, type:"lesson", targetId:12, title:"Lektion 13: Y und Bindestrich", minutes:10, desc:"Alle Kleinbuchstaben komplett!" },
      { day:18, type:"free", targetId:"sentences", title:"Ganze Sätze", minutes:10, desc:"Freies Schreiben ganzer Sätze." },
      { day:19, type:"challenge", targetId:"zeitrennen", title:"Zeitrennen", minutes:10, desc:"Erstes 60-Sekunden-Zeitrennen." },
      { day:20, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Tagesform testen." },
      { day:21, type:"lesson", targetId:13, title:"Lektion 14: Grossbuchstaben", minutes:10, desc:"Shift-Tasten mit den kleinen Fingern." },

      { day:22, type:"lesson", targetId:14, title:"Lektion 15: Zahlen", minutes:10, desc:"Zahlenreihe 1 bis 0." },
      { day:23, type:"lesson", targetId:15, title:"Lektion 16: Satzzeichen", minutes:10, desc:"Fragezeichen, Ausrufezeichen und Doppelpunkt." },
      { day:24, type:"lesson", targetId:16, title:"Lektion 17: Schweizer Tastatur", minutes:10, desc:"Sonderzeichen und Akzente." },
      { day:25, type:"challenge", targetId:"fehlerjagd", title:"Fehlerjagd", minutes:10, desc:"Gezieltes Fehler-Ausmerzen." },
      { day:26, type:"challenge", targetId:"zeitrennen", title:"Zeitrennen", minutes:10, desc:"Tempo-Test über 60 Sekunden." },
      { day:27, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Vorletzter Tag: Tagesaufgabe mit Bestzeit." },
      { day:28, type:"challenge", targetId:"zeitrennen", title:"Abschluss-Zeitrennen", minutes:10, desc:"Der grosse Abschlusstest: Deine neue persönliche Bestmarke!" }
    ]
  },
  tempo: {
    id: "tempo",
    title: "Tempo steigern",
    desc: "Für Fortgeschrittene: Fokus auf Rhythmus, Schnelligkeit und flüssiges Schreiben (14 Tage).",
    durationWeeks: 2,
    days: [
      { day:1, type:"challenge", targetId:"zeitrennen", title:"Zeitrennen: Standortbestimmung", minutes:10, desc:"60 Sekunden: Was ist dein Ausgangstempo?" },
      { day:2, type:"free", targetId:"sentences", title:"Ganze Sätze", minutes:10, desc:"Flüssiges Schreiben ohne anzuhalten." },
      { day:3, type:"lesson", targetId:13, title:"Lektion 14: Shift-Tempo", minutes:10, desc:"Grossbuchstaben flüssig und ohne Unterbruch tippen." },
      { day:4, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Schnell und sauber durch den Text des Tages." },
      { day:5, type:"challenge", targetId:"zeitrennen", title:"Zeitrennen 2", minutes:10, desc:"Versuche, deine Bestmarke von Tag 1 zu schlagen." },
      { day:6, type:"challenge", targetId:"fehlerjagd", title:"Fehlerjagd", minutes:10, desc:"Genauigkeit schärfen – wer sauber tippt, wird schneller." },
      { day:7, type:"free", targetId:"sentences", title:"Ganze Sätze", minutes:10, desc:"Längere Passagen im konstanten Rhythmus tippen." },
      { day:8, type:"challenge", targetId:"zeitrennen", title:"Zeitrennen Halbzeit", minutes:10, desc:"Halbzeit: Neue Anschlagszahl anpeilen." },
      { day:9, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Konzentriertes Tagestraining." },
      { day:10, type:"lesson", targetId:16, title:"Lektion 17: Vollgas", minutes:10, desc:"Komplexer Text mit allen Zeichen." },
      { day:11, type:"challenge", targetId:"fehlerjagd", title:"Fehlerjagd", minutes:10, desc:"Ruhige Hände bei hohem Tempo." },
      { day:12, type:"free", targetId:"sentences", title:"Ganze Sätze", minutes:10, desc:"Tempo-Flow finden." },
      { day:13, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Perfekte Generalprobe." },
      { day:14, type:"challenge", targetId:"zeitrennen", title:"Finale: Höchsttempo", minutes:15, desc:"Die letzte Herausforderung: Vollgas im Zeitrennen!" }
    ]
  },
  auffrischen: {
    id: "auffrischen",
    title: "Auffrischen",
    desc: "Kompakte Wiederholung in 7 Tagen: Alle Reihen durchgehen und wieder sicher werden.",
    durationWeeks: 1,
    days: [
      { day:1, type:"lesson", targetId:0, title:"Lektion 1: Grundreihe", minutes:10, desc:"Fingerpositionen und Grundhaltung reaktivieren." },
      { day:2, type:"lesson", targetId:4, title:"Lektion 5: Obere Reihe", minutes:10, desc:"E, I, R, U und Tasten oben links/rechts." },
      { day:3, type:"lesson", targetId:9, title:"Lektion 10: Untere Reihe", minutes:10, desc:"Sicherheit für C, V, B, N, M und Komma." },
      { day:4, type:"challenge", targetId:"fehlerjagd", title:"Fehlerjagd", minutes:10, desc:"Verbliebene Unsicherheiten fehlerfrei ausbügeln." },
      { day:5, type:"lesson", targetId:13, title:"Lektion 14: Grossbuchstaben", minutes:10, desc:"Shift-Wechsel rechts und links auffrischen." },
      { day:6, type:"challenge", targetId:"tagesaufgabe", title:"Tagesaufgabe", minutes:10, desc:"Heutigen Text im echten Schreibfluss tippen." },
      { day:7, type:"challenge", targetId:"zeitrennen", title:"Zeitrennen: Ziel erreicht", minutes:10, desc:"Auffrischungstest: 60 Sekunden Zeitrennen!" }
    ]
  }
};

function getPlanProgress(planState, today = new Date()) {
  if (!planState || !planState.id || !PLANS[planState.id]) {
    return { active: false };
  }
  const plan = PLANS[planState.id];
  const completed = Array.isArray(planState.completedDays) ? planState.completedDays : [];
  const todayKeyStr = typeof today === "string" ? today : dayKey(today);
  const isTodayDone = completed.some(d => d.date === todayKeyStr);
  const totalDays = plan.days.length;
  const completedCount = completed.length;
  const isFinished = completedCount >= totalDays;
  const currentDayIndex = Math.min(completedCount, totalDays - 1);
  const currentTask = plan.days[currentDayIndex];
  const percent = Math.min(100, Math.round((completedCount / totalDays) * 100));

  return {
    active: true,
    planId: planState.id,
    title: plan.title,
    desc: plan.desc,
    totalDays,
    completedCount,
    percent,
    currentDayNumber: currentDayIndex + 1,
    currentTask,
    isTodayDone,
    isFinished
  };
}

function completePlanDay(data, today = new Date()) {
  if (!data || !data.plan || !data.plan.id || !PLANS[data.plan.id]) return false;
  const plan = PLANS[data.plan.id];
  const completed = Array.isArray(data.plan.completedDays) ? data.plan.completedDays : (data.plan.completedDays = []);
  const todayKeyStr = typeof today === "string" ? today : dayKey(today);
  if (completed.some(d => d.date === todayKeyStr)) return false;
  if (completed.length >= plan.days.length) return false;
  completed.push({ day: completed.length + 1, date: todayKeyStr });
  return true;
}

function setPlan(data, planId, startDate = new Date()) {
  if (!data) return;
  if (!planId || !PLANS[planId]) {
    data.plan = { id: null, startDate: null, completedDays: [] };
    return;
  }
  const todayKeyStr = typeof startDate === "string" ? startDate : dayKey(startDate);
  data.plan = {
    id: planId,
    startDate: todayKeyStr,
    completedDays: []
  };
}

return { pick, shuffle, ROWS, KEYMAP, KEYINFO, HOME, fingerOf, FINGER_NAMES, LOWER_WORDS, NOUNS,
  allowedFor, fits, drillFor, makePseudo, sampleWords, pickSentences, lessonText, sentencesText, normalizeCustom,
  defaults, merge, dayKey, streak, starsOf, totalStars, isUnlocked, starsFor, bestApm, totalMs,
  recommended, BADGES, countsForBadge, checkBadges, problemChars, problemText, statFor, recordTime, apmFor, liveApmFor, runMetrics,
  dailyText, speedChallengeText, huntChallengeText,
  fingerErrorAnalysis, compareWithHistory, nextStepRecommendation, updateChallengeRecord,
  PLANS, getPlanProgress, completePlanDay, setPlan };
})();
if (typeof module !== "undefined") module.exports = ZehnfingerLogic;
