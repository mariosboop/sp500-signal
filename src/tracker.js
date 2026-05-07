// src/tracker.js — Signal Tracker
import fs from "fs";

const LOG_FILE = "./signal_log.json";

export const CRITERIA = {
  version: "1.1",
  last_updated: "2026-05-07",
  signals: [
    { id: 1, name: "VUAA PRICE",     weight: 30, description: "VUAA % change from prev close. >=+0.3%=+2, <=-0.3%=-2, flat=0" },
    { id: 2, name: "VIX",            weight: 20, description: "Fear index. >25=-3, falling>2%=+1, rising>3%=-1, neutral=0" },
    { id: 3, name: "MOMENTUM",       weight: 25, description: "VUAA vs open. Above=+2, Below=-2, Flat=0" },
    { id: 4, name: "VIX/VUAA ALIGN", weight: 15, description: "VIX down + VUAA up=+1, VIX up + VUAA down=-1, mixed=0" },
    { id: 5, name: "NEWS/MACRO",     weight: 10, description: "High impact event=-3, clear=+1" },
  ],
  verdicts: [
    { min: 4,   action: "BUY VUAA NOW" },
    { min: 2,   action: "BUY HALF POSITION" },
    { min: -99, action: "SIT OUT" },
  ],
  weaknesses: [
    "No oil price signal — critical during Iran war period",
    "Signal at 09:00 CET — news can break after and change direction",
    "No geopolitical news detection",
    "VIX is US-based but VUAA trades in EU hours — slight mismatch",
  ],
  improvements_pending: [
    "v1.2: Add oil price direction as Signal 6",
    "v1.2: Add 15:00 CET second signal window before US open",
    "v1.2: Raise futures threshold to +0.5% for stronger signal",
  ],
};

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) {
    return { criteria_version: CRITERIA.version, signals: [], accuracy: { total: 0, correct: 0, wrong: 0, hit_rate: "N/A" } };
  }
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {
    return { criteria_version: CRITERIA.version, signals: [], accuracy: { total: 0, correct: 0, wrong: 0, hit_rate: "N/A" } };
  }
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function recalcAccuracy(log) {
  const resolved = log.signals.filter(s => s.correct !== null);
  const correct = resolved.filter(s => s.correct === true);
  const wrong = resolved.filter(s => s.correct === false);
  log.accuracy = {
    total: resolved.length,
    correct: correct.length,
    wrong: wrong.length,
    hit_rate: resolved.length > 0
      ? (correct.length / resolved.length * 100).toFixed(1) + "%"
      : "N/A",
  };
}

export function logSignal(date, verdict, score, signals) {
  const log = loadLog();
  const existing = log.signals.find(s => s.date === date);

  if (existing) {
    // Reset outcome if signal is being re-logged
    existing.verdict = verdict;
    existing.score = score;
    existing.signals = signals;
    existing.outcome = null;
    existing.vuaa_change = null;
    existing.correct = null;
    existing.result = null;
    existing.logged_at = new Date().toISOString();
  } else {
    log.signals.push({
      date,
      verdict,
      score,
      signals,
      outcome: null,
      vuaa_change: null,
      correct: null,
      result: null,
      logged_at: new Date().toISOString(),
    });
  }

  recalcAccuracy(log);
  saveLog(log);
  console.log(`✅ Signal logged: ${date} → ${verdict} (${score}/7)`);
}

export function logOutcome(date, vuaaChange, direction) {
  const log = loadLog();
  const entry = log.signals.find(s => s.date === date);

  if (!entry) {
    console.warn(`⚠️ No signal found for ${date}`);
    return null;
  }

  entry.outcome = direction;
  entry.vuaa_change = vuaaChange;

  if (entry.verdict.includes("BUY") && direction === "up") {
    entry.correct = true;
    entry.result = `✅ CORRECT — bought, VUAA up ${vuaaChange}%`;
  } else if (entry.verdict.includes("BUY") && direction === "down") {
    entry.correct = false;
    entry.result = `❌ WRONG — bought but VUAA fell ${Math.abs(vuaaChange)}%`;
  } else if (entry.verdict.includes("SIT OUT") && direction === "down") {
    entry.correct = true;
    entry.result = `✅ CORRECT — sat out, VUAA fell ${Math.abs(vuaaChange)}%`;
  } else if (entry.verdict.includes("SIT OUT") && direction === "up") {
    entry.correct = false;
    entry.result = `❌ MISSED — sat out but VUAA rose ${vuaaChange}%`;
  }

  recalcAccuracy(log);
  saveLog(log);
  console.log(`✅ Outcome logged: ${date} → ${entry.result}`);
  return entry;
}

export function clearTodayOutcome() {
  const today = new Date().toISOString().split("T")[0];
  const log = loadLog();
  const entry = log.signals.find(s => s.date === today);
  if (entry) {
    entry.outcome = null;
    entry.vuaa_change = null;
    entry.correct = null;
    entry.result = null;
    recalcAccuracy(log);
    saveLog(log);
    console.log(`✅ Cleared outcome for ${today} — will be re-logged at 22:00 CET`);
  } else {
    console.log(`No entry found for ${today}`);
  }
}

export function getTodayEntry() {
  const log = loadLog();
  const today = new Date().toISOString().split("T")[0];
  return log.signals.find(s => s.date === today) || null;
}

export function getAccuracyMessage() {
  const log = loadLog();
  const { accuracy } = log;
  return {
    total: accuracy.total || 0,
    correct: accuracy.correct || 0,
    wrong: accuracy.wrong || 0,
    hit_rate: accuracy.hit_rate || "N/A",
    signals: log.signals,
  };
}

export function generateReport() {
  const log = loadLog();
  const { signals, accuracy } = log;

  console.log("\n" + "═".repeat(55));
  console.log("  VUAA SIGNAL BOT — ACCURACY REPORT");
  console.log(`  Criteria v${CRITERIA.version} | Updated ${CRITERIA.last_updated}`);
  console.log("═".repeat(55));
  console.log(`  Total tracked: ${accuracy.total || 0}`);
  console.log(`  Correct:       ${accuracy.correct || 0}`);
  console.log(`  Wrong:         ${accuracy.wrong || 0}`);
  console.log(`  Hit rate:      ${accuracy.hit_rate || "N/A"}`);
  console.log("═".repeat(55));
  console.log("\n  DAILY LOG (most recent first):\n");

  const recent = [...signals].reverse().slice(0, 20);
  for (const s of recent) {
    const icon = s.correct === true ? "✅" : s.correct === false ? "❌" : "⏳";
    console.log(`  ${icon} ${s.date} | Score ${s.score}/7 | ${s.verdict}`);
    if (s.result) console.log(`           ${s.result}`);
    else console.log(`           ⏳ Outcome pending (after 17:30 CET)`);
  }

  console.log("\n  KNOWN WEAKNESSES:");
  CRITERIA.weaknesses.forEach(w => console.log(`  ⚠️  ${w}`));
  console.log("\n  PENDING IMPROVEMENTS:");
  CRITERIA.improvements_pending.forEach(p => console.log(`  🔧 ${p}`));
  console.log("\n" + "═".repeat(55) + "\n");
}