"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { WORD_SRC, SENTENCES, NUM_SENTENCES, PUNCT_SENTENCES, LESSONS } = require("../data.js");
const L = require("../logic.js");

/* ---------- Inhaltliche Prüfung der Daten ---------- */

test("WORD_SRC hat keine Dubletten", () => {
  assert.equal(new Set(WORD_SRC).size, WORD_SRC.length);
});

test("WORD_SRC enthält kein Eszett (ß)", () => {
  for (const w of WORD_SRC) {
    assert.ok(!w.includes("ß"), `Eszett in: ${w}`);
  }
});

test("Kein Wort in WORD_SRC beginnt mit Ä/Ö/Ü", () => {
  for (const w of WORD_SRC) {
    assert.ok(!/^[ÄÖÜ]/.test(w), `Beginnt mit Ä/Ö/Ü: ${w}`);
  }
});

test("Jedes Wort in WORD_SRC ist auf der Schweizer Tastatur tippbar", () => {
  for (const w of WORD_SRC) {
    for (const c of w) {
      assert.ok(L.KEYMAP[c] !== undefined, `Nicht tippbar: '${c}' in "${w}"`);
    }
  }
});

test("Jeder Satz enthält kein Eszett (ß)", () => {
  for (const list of [SENTENCES, NUM_SENTENCES, PUNCT_SENTENCES]) {
    for (const s of list) {
      assert.ok(!s.includes("ß"), `Eszett in Satz: "${s}"`);
    }
  }
});

test("Jeder Satz ist auf der Schweizer Tastatur tippbar", () => {
  for (const list of [SENTENCES, NUM_SENTENCES, PUNCT_SENTENCES]) {
    for (const s of list) {
      for (const c of s) {
        assert.ok(L.KEYMAP[c] !== undefined, `Nicht tippbares Zeichen '${c}' in: "${s}"`);
      }
    }
  }
});

test("Satzlisten haben Mindestgrössen", () => {
  assert.ok(SENTENCES.length >= 30, `SENTENCES hat ${SENTENCES.length} Sätze (Minimum 30)`);
  assert.ok(NUM_SENTENCES.length >= 10, `NUM_SENTENCES hat ${NUM_SENTENCES.length} Sätze (Minimum 10)`);
  assert.ok(PUNCT_SENTENCES.length >= 10, `PUNCT_SENTENCES hat ${PUNCT_SENTENCES.length} Sätze (Minimum 10)`);
});

/*
   Jede Buchstaben-Lektion braucht eine sinnvolle Anzahl echter Wörter aus WORD_SRC,
   die mit den erlaubten Buchstaben tippbar sind.
   Schwellen (nachvollziehbar, aufsteigend mit mehr Buchstaben):
     L1 (asdfjklö) — nur Grundreihe, 8 Buchstaben →  10
     L2 (+ei)      — 10 Buchstaben                    →  20
     L3 (+ru)      — 12 Buchstaben                    →  30
     L4 (+gh)      — 14 Buchstaben                    →  40
     L5–13         — viele Buchstaben                 → 100
   Die Pseudowort-Füllung in logic.js springt ein, wenn < 12 Wörter da sind.
*/
for (const [idx, lesson] of LESSONS.entries()) {
  if (lesson.kind !== "letters") continue;
  const pool = WORD_SRC.filter(w => w.split("").every(c => L.KEYMAP[c]));
  const allowed = L.allowedFor(idx);
  const fitting = WORD_SRC.filter(w => {
    const lo = w.toLowerCase();
    return lo.split("").every(c => allowed.has(c));
  });
  let minExpected;
  if (idx === 0) minExpected = 10;   // Grundreihe: a s d f j k l ö
  else if (idx === 1) minExpected = 20;  // + e i
  else if (idx === 2) minExpected = 30;  // + r u
  else if (idx === 3) minExpected = 40;  // + g h
  else minExpected = 100;                // ab L5 genug Buchstaben

  // Prüfe nur, wenn die Lektion Buchstaben-Tasten hat und nicht Lektion 17 (Ganze Sätze).
  if (lesson.kind === "letters") {
    test(`Lektion ${lesson.n} (${lesson.title}): mindestens ${minExpected} passende Wörter`, () => {
      assert.ok(fitting.length >= minExpected,
        `Lektion ${lesson.n}: ${fitting.length} Wörter, erwartet ≥ ${minExpected}`);
    });
  }
}