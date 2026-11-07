"use strict";
const APP_VERSION = "1.2.0";

/* ---------- Einbettung im Lernportal ----------
   Läuft die App als iframe mit ?embed=1, speichert sie nichts im Browser, sondern meldet jede Übung und den
   Stand an die Elternseite (gleicher Ursprung) und holt den Stand beim Start von dort. So gehört der Fortschritt
   der angemeldeten Person und nicht dem Gerät. Die App kennt keine Namen: wer es ist, weiss nur die Elternseite.
   Ohne ?embed=1 (GitHub Pages, lokale Datei) ändert sich nichts. */
const EMBED = window.parent !== window && new URLSearchParams(location.search).get("embed") === "1";
const HOST_MSG = "zehnfinger";
const toHost = msg => { try { window.parent.postMessage({ source:HOST_MSG, v:1, ...msg }, location.origin); } catch (e) {} };
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const { ROWS, KEYMAP, KEYINFO, fingerOf, lessonText, sentencesText, normalizeCustom,
  defaults, merge, dayKey, streak, starsOf, totalStars, isUnlocked, bestApm, totalMs,
  recommended, BADGES, checkBadges, problemChars, problemText, statFor, recordTime, liveApmFor, runMetrics } = ZehnfingerLogic;

/* ---------- Tastatur Deutsch (Schweiz) ---------- */
// Finger: 0 kleiner L, 1 Ring L, 2 Mittel L, 3 Zeige L, 4 Daumen L, 5 Daumen R, 6 Zeige R, 7 Mittel R, 8 Ring R, 9 kleiner R
const FINGER_CLASS = ["pinky","ring","middle","index","thumb","thumb","index","middle","ring","pinky"];
const FINGER_DAT = ["kleinen Finger links","Ringfinger links","Mittelfinger links","Zeigefinger links","Daumen","Daumen","Zeigefinger rechts","Mittelfinger rechts","Ringfinger rechts","kleinen Finger rechts"];
const KEYEL = {};    // id -> Element

/* ---------- Speicher ---------- */
const STORE_KEY = "zehnfinger.v1";
let storageOk = true;
function load() {
  try {
    localStorage.setItem("zehnfinger.test", "1"); localStorage.removeItem("zehnfinger.test");
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch (e) { storageOk = false; }
  return defaults();
}
let data = EMBED ? defaults() : load();
let statePostTimer = 0;
function save() {
  if (EMBED) { clearTimeout(statePostTimer); statePostTimer = setTimeout(() => toHost({ type:"state", state:data }), 400); return; }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { storageOk = false; }
}

/* ---------- Sicherung ---------- */
function exportBackup() {
  data.lastBackup = Date.now(); save();
  const payload = { app:"zehnfinger", format:1, version:APP_VERSION, exportiert:new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `zehnfinger-sicherung-${dayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  setBackupMsg("Sicherung gespeichert. Die Datei liegt im Download-Ordner.");
  renderBackup();
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const d = parsed && parsed.app === "zehnfinger" ? parsed.data : parsed;
      if (!d || typeof d.lessons !== "object" || !Array.isArray(d.history)) throw new Error("format");
      const stars = totalStars(d);
      if (!confirm(`Sicherung mit ${d.history.length} Übungen und ${stars} Sternen laden?\nDer aktuelle Fortschritt auf diesem Gerät wird dabei ersetzt.`)) return;
      data = merge(d); save();
      show("home");
      setBackupMsg("Sicherung geladen ✓");
    } catch (e) {
      setBackupMsg("Diese Datei ist keine Zehnfinger-Sicherung.");
    }
  };
  reader.readAsText(file);
}
function setBackupMsg(t) { const m = $("#backupMsg"); m.textContent = t; m.hidden = !t; }
function renderBackup() {
  const last = data.lastBackup, runs = data.history.length;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  $("#backupInfo").textContent = !last ? "Noch keine Sicherung. Speichere ab und zu eine Sicherung, zum Beispiel auf OneDrive oder einem USB-Stick." :
    days === 0 ? "Letzte Sicherung: heute." : days === 1 ? "Letzte Sicherung: gestern." : `Letzte Sicherung: vor ${days} Tagen.`;
  $("#backupCard").classList.toggle("remind", runs >= 5 && (!last || days >= 14));
}

/* ---------- Ansichten ---------- */
let view = "home";
function show(v) {
  view = v;
  for (const id of ["home","train","result"]) $("#view-" + id).hidden = id !== v;
  window.scrollTo(0, 0);
  if (v === "home") renderHome();
  renderHeader();
}
function renderHeader() {
  const s = streak(data);
  $("#streak").textContent = s === 1 ? "1 Tag" : `${s} Tage`;
  const goal = data.settings.goal, mins = (data.days[dayKey()] || 0) / 60000;
  $("#goalText").textContent = `${Math.floor(mins)} / ${goal} Min.`;
  $("#goalRing").style.strokeDashoffset = 94.25 * (1 - Math.min(1, mins / goal));
}
function starHtml(n) { return `<span class="stars" aria-label="${n} von 3 Sternen">${[0,1,2].map(i => `<span class="${i < n ? "on" : "off"}">★</span>`).join("")}</span>`; }
function capsFor(L) {
  if (L.kind === "shift") return ["⇧ Shift"];
  if (L.kind === "numbers") return ["1 – 0"];
  if (L.kind === "punct") return [..."?!:;"];
  if (L.kind === "sentences") return ["Abc."];
  return [...L.keys].map(c => c.toUpperCase());
}

function renderHome() {
  $("#storageWarn").hidden = storageOk;
  const rec = recommended(data, EMBED), L = LESSONS[rec], s = starsOf(data, L.n);
  const todayMin = (data.days[dayKey()] || 0) / 60000;
  $("#heroTitle").textContent = data.history.length === 0 ? "Hallo! Bereit für die erste Lektion?" :
    todayMin >= data.settings.goal ? "Tagesziel erreicht. Stark!" : "Schön, dass du wieder da bist.";
  $("#heroSub").textContent = `Weiter mit Lektion ${L.n}: ${L.title}` + (s ? ` (${s} von 3 Sternen)` : "");
  $("#heroBtn").onclick = () => startLesson(rec);

  const grid = $("#lessons"); grid.innerHTML = "";
  LESSONS.forEach((L, i) => {
    const b = document.createElement("button");
    const locked = !isUnlocked(data, i, EMBED);
    b.className = "lesson" + (locked ? " locked" : "") + (i === rec ? " next" : "");
    b.innerHTML = `<span class="top"><span>Lektion ${L.n}</span>${locked ? "🔒" : starHtml(starsOf(data, L.n))}</span>
      <span class="lt">${esc(L.title)}</span><span class="caps">${capsFor(L).map(c => `<span>${esc(c)}</span>`).join("")}</span>`;
    b.onclick = () => { if (!locked) startLesson(i); };
    if (locked) b.title = "Schaffe zuerst die Lektion davor (mindestens 1 Stern).";
    grid.appendChild(b);
  });

  const probs = problemChars(data);
  $("#freeProblem").disabled = probs.length === 0;
  $("#problemDesc").innerHTML = probs.length ? `Deine schwierigsten Tasten: ${probs.map(([c]) => `<kbd>${esc(c)}</kbd>`).join(" ")}` :
    "Erscheint, sobald du ein paar Übungen gemacht hast.";
  $("#customText").value = data.customText || "";

  const best = bestApm(data), last10 = data.history.slice(-10);
  $("#tBest").textContent = best ? best : "–";
  $("#tAcc").textContent = last10.length ? Math.round(last10.reduce((a, h) => a + h.acc, 0) / last10.length) + " %" : "–";
  $("#tTime").textContent = Math.round(totalMs(data) / 60000) + " Min.";
  $("#tStars").textContent = `${totalStars(data)} / ${LESSONS.length * 3}`;
  renderChart();
  renderBackup();

  $("#badges").innerHTML = BADGES.map(b => `<div class="card badge ${data.badges[b.id] ? "" : "off"}">
    <span class="bi">${b.icon}</span><span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></span></div>`).join("");

  $("#setGoal").value = String(data.settings.goal);
  $("#setHands").checked = data.settings.hands;
  $("#setSound").checked = data.settings.sound;
  $("#setUnlock").checked = data.settings.unlockAll;
}

function renderChart() {
  const el = $("#chart"), h = data.history.slice(-30);
  if (h.length < 2) { el.innerHTML = `<p class="empty">Nach zwei Übungen siehst du hier, wie dein Tempo wächst.</p>`; return; }
  const W = 640, H = 190, pl = 40, pr = 44, pt = 14, pb = 26;
  const max = Math.max(100, Math.ceil(Math.max(...h.map(d => d.apm)) / 50) * 50);
  const x = i => pl + i * (W - pl - pr) / (h.length - 1);
  const y = v => pt + (H - pt - pb) * (1 - v / max);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tempo der letzten ${h.length} Übungen">`;
  for (const v of [0, max / 2, max]) s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  s += `<polyline class="line" points="${h.map((d, i) => `${x(i)},${y(d.apm)}`).join(" ")}"/>`;
  h.forEach((d, i) => { s += `<circle class="dot" cx="${x(i)}" cy="${y(d.apm)}" r="3.5"><title>${d.apm} Anschläge/Min. · ${d.acc} % genau</title></circle>`; });
  const last = h[h.length - 1];
  s += `<text class="lbl" x="${x(h.length - 1) + 8}" y="${y(last.apm) + 4}">${last.apm}</text>`;
  s += `<text class="axis" x="${pl}" y="${H - 6}">früher</text><text class="axis" x="${W - pr}" y="${H - 6}" text-anchor="end">zuletzt</text></svg>`;
  el.innerHTML = s;
}

/* ---------- Tastatur & Hände zeichnen ---------- */
function buildKeyboard() {
  const kb = $("#kb"); kb.innerHTML = "";
  ROWS.forEach((row, r) => {
    const rowEl = document.createElement("div"); rowEl.className = "kb-row";
    row.forEach((k, i) => {
      const el = document.createElement("div"); el.className = "key";
      let id, w = 1, f = null;
      const span = (cls, txt) => { const s = document.createElement("span"); s.className = cls; s.textContent = txt; el.appendChild(s); };
      if (Array.isArray(k)) {
        const [n, s] = k; id = `k${r}_${i}`; f = k[2];
        const letter = /\p{Ll}/u.test(n);
        if (!(letter && s === n.toUpperCase())) span("top", s);
        span("main", letter ? n.toUpperCase() : n);
        if (n === "f" || n === "j") el.classList.add("home");
      } else {
        id = k.id; w = k.w; f = k.f ?? null; span("main small", k.label);
        if (k.blank) el.classList.add("blank");
      }
      el.style.flexGrow = w;
      if (f !== null) { el.style.setProperty("--fc", `var(--f-${FINGER_CLASS[f]})`); el.classList.add("tinted"); }
      KEYEL[id] = el; rowEl.appendChild(el);
    });
    kb.appendChild(rowEl);
  });
}
function buildHands() {
  const F = [["pinky",14,58,52,0],["ring",48,34,76,1],["middle",82,22,88,2],["index",116,34,76,3]];
  let s = "";
  for (const side of [0, 1]) {
    s += `<g${side ? ' transform="translate(460 0) scale(-1 1)"' : ""}>`;
    s += `<rect class="palm" x="10" y="100" width="140" height="62" rx="28"/>`;
    for (const [cls, x, y, h, fi] of F) s += `<rect class="fg f-${cls}" data-finger="${side ? 9 - fi : fi}" x="${x}" y="${y}" width="28" height="${h}" rx="14"/>`;
    s += `<rect class="fg f-thumb" data-finger="${side ? 5 : 4}" x="152" y="92" width="26" height="60" rx="13" transform="rotate(32 165 122)"/>`;
    s += `</g>`;
  }
  $("#hands").innerHTML = s;
}

/* ---------- Training ---------- */
let run = null, layoutWarned = false, prevNext = [];
function startLesson(idx) {
  const L = LESSONS[idx];
  startTraining({ mode:"lesson", idx, title:`Lektion ${L.n}: ${L.title}`, text:lessonText(idx) });
}
function startTraining(cfg) {
  const chars = [...cfg.text];
  run = { cfg, chars, pos:0, errors:0, marks:new Uint8Array(chars.length), started:false, last:0, active:0, wrong:{}, done:false, lineTop:0 };
  $("#trainTitle").textContent = cfg.title;
  $("#startHint").hidden = false;
  $("#hands").hidden = !data.settings.hands;
  const box = $("#text"); box.innerHTML = ""; box.scrollTop = 0;
  let word = document.createElement("span"); word.className = "w";
  chars.forEach(c => {
    const s = document.createElement("span");
    s.className = "c" + (c === " " ? " sp" : "");
    s.textContent = c === " " ? " " : c;
    word.appendChild(s);
    if (c === " ") { box.appendChild(word); word = document.createElement("span"); word.className = "w"; }
  });
  if (word.childNodes.length) box.appendChild(word);
  run.spans = box.querySelectorAll(".c");
  show("train");
  run.spans[0].classList.add("cur");
  updateHint(); updateLive();
}

function updateHint() {
  prevNext.forEach(el => el.classList.remove("next")); prevNext = [];
  document.querySelectorAll("#hands .fg.on").forEach(el => el.classList.remove("on"));
  const c = run.chars[run.pos], info = KEYMAP[c];
  if (!info) { $("#hint").textContent = ""; return; }
  const f = KEYINFO[info.id].f;
  const mark = id => { KEYEL[id].classList.add("next"); prevNext.push(KEYEL[id]); };
  const fingers = f === 4 ? [4, 5] : [f];
  mark(info.id);
  const fname = fi => `<span class="fname f-${FINGER_CLASS[fi]}">${FINGER_DAT[fi]}</span>`;
  const keyLabel = c === " " ? "<kbd>Leertaste</kbd>" : `<kbd>${esc(c)}</kbd>`;
  let html = f === 4 ? `${keyLabel} mit dem ${fname(5)}` : `${keyLabel} mit dem ${fname(f)}`;
  if (info.shift) {
    const sf = f <= 4 ? 9 : 0, sid = f <= 4 ? "shiftR" : "shiftL";
    mark(sid); fingers.push(sf);
    html = `<kbd>⇧ ${f <= 4 ? "rechts" : "links"}</kbd> mit dem ${fname(sf)} halten, dann ${html}`;
  }
  for (const fi of fingers) document.querySelectorAll(`#hands .fg[data-finger="${fi}"]`).forEach(el => el.classList.add("on"));
  $("#hint").innerHTML = html;
}
function updateLive() {
  $("#liveApm").textContent = liveApmFor(run.pos, run.active) ?? "–";
  $("#liveErr").textContent = run.errors;
  $("#liveProg").style.width = (100 * run.pos / run.chars.length) + "%";
}
function followLine() {
  const box = $("#text"), sp = run.spans[run.pos]; if (!sp) return;
  const top = sp.offsetTop;
  if (top !== run.lineTop) {
    run.lineTop = top;
    box.scrollTo({ top: Math.max(0, top - sp.offsetHeight - 14), behavior: "smooth" });
  }
}
let actx = null;
function beep() {
  if (!data.settings.sound) return;
  try {
    actx = actx || new AudioContext();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "triangle"; o.frequency.value = 196;
    g.gain.setValueAtTime(0.12, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.12);
    o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.13);
  } catch (e) {}
}
function onTrainKey(e) {
  if (e.key === "Escape") { e.preventDefault(); abortRun(); return; }
  if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
  if (e.key.length !== 1) return;
  e.preventDefault();
  if (!layoutWarned && ((e.code === "KeyY" && e.key.toLowerCase() === "y") || (e.code === "KeyZ" && e.key.toLowerCase() === "z"))) {
    layoutWarned = true; $("#layoutBanner").hidden = false;
  }
  const now = performance.now();
  if (!run.started) { run.started = true; run.last = now; $("#startHint").hidden = true; }
  else { run.active += Math.min(now - run.last, 5000); run.last = now; }

  const exp = run.chars[run.pos], span = run.spans[run.pos];
  if (e.key === exp) {
    statFor(data, exp).n++;
    span.classList.remove("cur", "bad");
    span.classList.add(run.marks[run.pos] ? "fixed" : "ok");
    run.pos++;
    if (run.pos >= run.chars.length) { updateLive(); finishRun(); return; }
    run.spans[run.pos].classList.add("cur");
    followLine();
    updateHint();
  } else {
    run.errors++;
    if (!run.marks[run.pos]) { run.marks[run.pos] = 1; statFor(data, exp).e++; }
    run.wrong[exp] = (run.wrong[exp] || 0) + 1;
    span.classList.add("bad");
    const box = $("#text"); box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
    const hit = KEYMAP[e.key];
    if (hit && KEYEL[hit.id]) { const el = KEYEL[hit.id]; el.classList.add("wrong"); setTimeout(() => el.classList.remove("wrong"), 220); }
    beep();
  }
  updateLive();
}

function abortRun() {
  recordTime(data, run.active); save(); run = null; show("home");
}
function finishRun() {
  run.done = true;
  const cfg = run.cfg, chars = run.chars.length;
  const { apm, acc, stars } = runMetrics(chars, run.errors, run.active);
  recordTime(data, run.active);
  data.history.push({ t:Date.now(), mode:cfg.mode, lesson:cfg.mode === "lesson" ? LESSONS[cfg.idx].n : null, apm, acc, ms:Math.round(run.active), chars, errors:run.errors });
  if (data.history.length > 300) data.history.splice(0, data.history.length - 300);
  let prevStars = 0, bestApmBefore = 0;
  if (cfg.mode === "lesson") {
    const n = LESSONS[cfg.idx].n;
    const rec = data.lessons[n] || { stars:0, bestApm:0, bestAcc:0, runs:0 };
    prevStars = rec.stars; bestApmBefore = rec.bestApm;
    rec.runs++; rec.stars = Math.max(rec.stars, stars); rec.bestApm = Math.max(rec.bestApm, apm); rec.bestAcc = Math.max(rec.bestAcc, acc);
    data.lessons[n] = rec;
  }
  const newBadges = checkBadges(data);
  save();
  if (EMBED) {
    const last = data.history[data.history.length - 1], lessonRun = cfg.mode === "lesson";
    toHost({ type:"run", run:{ t:last.t, ms:last.ms, acc:last.acc, apm:last.apm, chars:last.chars, errors:last.errors, lesson:last.lesson,
      ...(lessonRun ? { starsBefore:prevStars, starsAfter:data.lessons[last.lesson].stars, bestApmBefore } : {}) } });
  }
  // Browser bitten, den Speicher nicht automatisch aufzuräumen.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  renderResult({ cfg, apm, acc, stars, errors:run.errors, ms:run.active, prevStars, newBadges, wrong:run.wrong });
}

function renderResult(r) {
  const star = `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`;
  const isLesson = r.cfg.mode === "lesson";
  $("#rStars").innerHTML = [0,1,2].map(i => `<span class="${i < r.stars ? "on" : ""}">${star}</span>`).join("");
  $("#rStars").hidden = !isLesson;
  const titles = ["Fast!", "Geschafft!", "Stark!", "Perfekt!"];
  $("#rTitle").textContent = titles[r.stars];
  let msg;
  if (r.stars === 0) msg = "Für einen Stern brauchst du 90 % Genauigkeit. Tipp langsamer, schau nicht auf die Tasten und versuch es nochmal.";
  else if (isLesson && r.prevStars === 0 && r.cfg.idx < LESSONS.length - 1) msg = `Die nächste Lektion ist jetzt frei: ${LESSONS[r.cfg.idx + 1].title}.`;
  else if (r.stars === 3) msg = "Drei Sterne. Jetzt darfst du ruhig ein bisschen schneller werden.";
  else msg = `Mit ${r.stars === 1 ? "95" : "98"} % Genauigkeit gibt es ${r.stars === 1 ? "zwei" : "drei"} Sterne. Genau vor schnell!`;
  if (!isLesson) msg = r.acc >= 95 ? "Sauber getippt!" : "Gut geübt. Achte beim nächsten Mal noch mehr auf die Genauigkeit.";
  $("#rMsg").textContent = msg;
  $("#rApm").textContent = r.apm;
  $("#rAcc").textContent = r.acc + " %";
  $("#rErr").textContent = r.errors;
  const secs = Math.round(r.ms / 1000);
  $("#rTime").textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  let extra = "";
  const worst = Object.entries(r.wrong).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (worst.length) {
    const [c] = worst[0], f = fingerOf(c);
    extra += `<p>Heute schwierig: ${worst.map(([ch]) => `<kbd>${ch === " " ? "Leertaste" : esc(ch)}</kbd>`).join(" ")}`;
    if (f !== null && c !== " ") extra += `. Das <kbd>${esc(c)}</kbd> tippst du mit dem <b>${FINGER_DAT[f]}</b>.`;
    extra += `</p>`;
  }
  if (r.newBadges.length) extra += `<p>Neues Abzeichen:</p>` + r.newBadges.map(b => `<span class="newbadge">${b.icon} ${esc(b.name)}</span>`).join("");
  $("#rExtra").innerHTML = extra;

  const hasNext = isLesson && r.cfg.idx < LESSONS.length - 1 && isUnlocked(data, r.cfg.idx + 1, EMBED);
  const nextBtn = $("#rNext"), againBtn = $("#rAgain");
  nextBtn.hidden = !hasNext;
  againBtn.className = hasNext ? "btn" : "btn primary";
  againBtn.onclick = () => {
    if (isLesson) startLesson(r.cfg.idx);
    else startTraining({ ...r.cfg, text: r.cfg.regen ? r.cfg.regen() : r.cfg.text });
  };
  nextBtn.onclick = () => startLesson(r.cfg.idx + 1);
  renderHeader();
  show("result");
}

/* ---------- Ereignisse ---------- */
window.addEventListener("keydown", e => {
  if (view === "train" && run && !run.done) return onTrainKey(e);
  if (view === "result" && e.key === "Enter") {
    e.preventDefault();
    (!$("#rNext").hidden ? $("#rNext") : $("#rAgain")).click();
  }
});
$("#brand").onclick = () => { if (view === "train" && run && !run.done) abortRun(); else show("home"); };
$("#trainBack").onclick = () => abortRun();
$("#rHome").onclick = () => show("home");
$("#layoutClose").onclick = () => { $("#layoutBanner").hidden = true; };

$("#freeSentences").onclick = () => startTraining({ mode:"sentences", title:"Ganze Sätze", text:sentencesText(), regen:sentencesText });
const currentProblemText = () => problemText(data);
$("#freeProblem").onclick = () => { if (problemChars(data).length) startTraining({ mode:"problem", title:"Problemtasten", text:currentProblemText(), regen:currentProblemText }); };
$("#customText").addEventListener("input", e => { data.customText = e.target.value; save(); });
$("#freeCustom").onclick = () => {
  const { text, removed } = normalizeCustom($("#customText").value);
  const note = $("#customNote");
  if (text.length < 5) { note.hidden = false; note.textContent = "Bitte zuerst einen Text einfügen."; return; }
  note.hidden = !removed.length;
  note.textContent = removed.length ? `Weggelassen, weil nicht direkt tippbar: ${removed.join(" ")}` : "";
  startTraining({ mode:"custom", title:"Eigener Text", text });
};

$("#backupExport").onclick = exportBackup;
$("#backupImport").onclick = () => $("#backupFile").click();
$("#backupFile").onchange = e => { const f = e.target.files[0]; if (f) importBackup(f); e.target.value = ""; };

$("#setGoal").onchange = e => { data.settings.goal = +e.target.value; save(); renderHeader(); };
$("#setHands").onchange = e => { data.settings.hands = e.target.checked; save(); };
$("#setSound").onchange = e => { data.settings.sound = e.target.checked; save(); };
$("#setUnlock").onchange = e => { data.settings.unlockAll = e.target.checked; save(); renderHome(); };
$("#setReset").onclick = () => {
  if (confirm("Wirklich den ganzen Fortschritt löschen? Sterne, Abzeichen und Statistik gehen verloren.\nTipp: Vorher «Fortschritt sichern».")) {
    data = defaults(); save(); show("home");
  }
};

/* ---------- App installieren & offline ---------- */
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("#installBtn").hidden = false; });
window.addEventListener("appinstalled", () => { installEvt = null; $("#installBtn").hidden = true; });
$("#installBtn").onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => {});
  installEvt = null; $("#installBtn").hidden = true;
};

$("#appVersion").textContent = APP_VERSION;
if (EMBED) {
  $("#offlineState").textContent = "im Lernportal";
} else if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => { $("#offlineState").textContent = "auch offline nutzbar ✓"; })
    .catch(() => { $("#offlineState").textContent = "offline-Modus nicht verfügbar"; });
} else {
  $("#offlineState").textContent = "lokale Datei";
}

/* ---------- Start ---------- */
function boot() { buildKeyboard(); buildHands(); show("home"); }
function hostProblem(text) {
  let box = document.getElementById("hostProblem");
  if (!box) {
    box = document.createElement("p"); box.id = "hostProblem";
    box.style.cssText = "margin:24px;padding:16px;border:1px solid #b33027;font:16px/1.4 system-ui,sans-serif";
    document.body.prepend(box);
  }
  box.textContent = text;
}
if (EMBED) {
  // Eingebettet: kein Speichern auf dem Gerät, keine Abkürzungen, keine Sicherung, kein Installieren.
  for (const sel of ["#backupCard", "#installBtn", "#setUnlock", "#setReset"]) {
    const el = $(sel), row = el && (el.closest(".set-row") || el);
    if (row) row.style.display = "none";
  }
  let started = false;
  const start = state => {
    if (started) return; started = true;
    if (state && typeof state === "object" && state.lessons && Array.isArray(state.history)) data = merge(state);
    boot();
  };
  window.addEventListener("message", e => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    const m = e.data;
    if (m && m.source === "zehnfinger-host" && m.type === "init") start(m.state);
    if (m && m.source === "zehnfinger-host" && m.type === "init-error") {
      hostProblem("Dein Fortschritt konnte nicht geladen werden. Lade die Seite neu. Solange das nicht klappt, bleibt die Übung gesperrt, damit nichts überschrieben wird.");
    }
  });
  toHost({ type:"ready" });
  // Meldet sich die Elternseite nicht, startet die App NICHT leer: ein leerer Start würde beim
  // ersten Speichern den echten Fortschritt überschreiben.
  setTimeout(() => { if (!started) hostProblem("Der Fortschritt wird noch geladen. Dauert es lange, lade die Seite neu."); }, 15000);
} else {
  boot();
}
