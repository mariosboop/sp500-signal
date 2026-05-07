// index.js — VUAA Signal Bot — Fully Automated
// 09:00 CET → morning signal → Telegram + logged
// 22:00 CET → fetches VUAA actual close → logs outcome → Telegram
// Friday 22:00 → weekly accuracy report → Telegram
import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import { fetchAllData } from "./src/fetchData.js";
import { scoreSignals } from "./src/scoreSignals.js";
import { sendTelegram, getChatId } from "./src/sendTelegram.js";
import { logSignal, logOutcome, getTodayEntry, getAccuracyMessage, generateReport, clearTodayOutcome, CRITERIA } from "./src/tracker.js";
import { fetchActualOutcome } from "./src/fetchOutcome.js";

// ── MORNING MESSAGE ──────────────────────────────────────────────
function buildMorningMessage(scored) {
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const { signals, totalScore, verdict, verdictEmoji, action } = scored;

  let msg = `📊 <b>VUAA DAILY SIGNAL</b>\n${dateStr}\n`;
  msg += `─────────────────────\n\n`;

  for (const s of signals) {
    const sc = s.score > 0 ? `+${s.score}` : `${s.score}`;
    msg += `${s.emoji} <b>${s.name}</b>: ${s.status} (${sc})\n`;
  }

  msg += `\n─────────────────────\n`;
  msg += `<b>SCORE: ${totalScore > 0 ? "+" : ""}${totalScore} / +7</b>\n\n`;
  msg += `${verdictEmoji} <b>${verdict}</b>\n${action}\n`;
  msg += `─────────────────────\n`;
  msg += `📌 Instrument: VUAA on Revolut\n`;
  msg += `🎯 Target: +1.0% → sell\n`;
  msg += `🛑 Stop: -0.5% → sell immediately\n`;
  msg += `─────────────────────\n`;
  msg += `<i>Outcome auto-reported at 22:00 CET. Not financial advice.</i>`;

  return msg;
}

// ── EVENING MESSAGE ──────────────────────────────────────────────
function buildEveningMessage(entry, outcome) {
  const icon = entry.correct ? "✅" : "❌";

  let msg = `📈 <b>VUAA EVENING OUTCOME</b>\n`;
  msg += `─────────────────────\n`;
  msg += `Morning signal: <b>${entry.verdict}</b> (${entry.score}/7)\n`;
  msg += `VUAA actual:    <b>${outcome.direction === "up" ? "+" : ""}${outcome.changePct}%</b>\n`;
  msg += `\n${icon} <b>${entry.result}</b>\n`;
  msg += `─────────────────────\n`;

  return msg;
}

// ── WEEKLY REPORT MESSAGE ────────────────────────────────────────
function buildWeeklyMessage() {
  const stats = getAccuracyMessage();
  const hitRate = parseFloat(stats.hit_rate) || 0;

  let msg = `📊 <b>WEEKLY ACCURACY REPORT</b>\n`;
  msg += `Criteria v${CRITERIA.version}\n`;
  msg += `─────────────────────\n`;
  msg += `Total signals: <b>${stats.total}</b>\n`;
  msg += `Correct: <b>${stats.correct}</b> | Wrong: <b>${stats.wrong}</b>\n`;
  msg += `Hit rate: <b>${stats.hit_rate}</b>\n`;
  msg += `─────────────────────\n`;

  // Last 5 days
  const recent = [...stats.signals].reverse().slice(0, 5);
  for (const s of recent) {
    const icon = s.correct === true ? "✅" : s.correct === false ? "❌" : "⏳";
    msg += `${icon} ${s.date}: ${s.verdict} → ${s.result || "pending"}\n`;
  }

  msg += `─────────────────────\n`;
  if (hitRate >= 65) {
    msg += `🟢 Strong performance — criteria working well\n`;
  } else if (hitRate >= 50) {
    msg += `🟡 Acceptable — monitoring for patterns\n`;
  } else if (stats.total >= 5) {
    msg += `🔴 Below 50% — criteria needs adjustment\n`;
  } else {
    msg += `⏳ Still collecting data — need more signals\n`;
  }

  return msg;
}

// ── MORNING JOB ──────────────────────────────────────────────────
async function runMorningSignal() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n[${new Date().toISOString()}] Morning signal...`);

  try {
    const data = await fetchAllData();
    const scored = scoreSignals(data);

    logSignal(
      today,
      scored.verdict,
      scored.totalScore,
      scored.signals.map(s => ({ name: s.name, status: s.status, score: s.score }))
    );

    await sendTelegram(buildMorningMessage(scored));
    console.log(`✅ Morning signal sent: ${scored.verdict} (${scored.totalScore}/7)`);

  } catch (err) {
    console.error("❌ Morning error:", err.message);
    await sendTelegram(`⚠️ Morning signal error: ${err.message}`).catch(() => {});
  }
}

// ── EVENING JOB ──────────────────────────────────────────────────
async function runEveningOutcome(force = false) {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n[${new Date().toISOString()}] Evening outcome...`);

  try {
    const outcome = await fetchActualOutcome(force);
    const entry = logOutcome(today, outcome.changePct, outcome.direction);

    if (!entry) {
      await sendTelegram(`⚠️ No morning signal found for ${today}`);
      return;
    }

    await sendTelegram(buildEveningMessage(entry, outcome));
    console.log(`✅ Evening outcome sent: ${entry.result}`);

  } catch (err) {
    console.error("❌ Evening error:", err.message);
    await sendTelegram(`⚠️ Evening outcome error: ${err.message}`).catch(() => {});
  }
}

// ── WEEKLY JOB (Friday only) ─────────────────────────────────────
async function runWeeklyReport() {
  const day = new Date().getDay();
  if (day !== 5) return;

  console.log(`\n[${new Date().toISOString()}] Weekly report...`);
  try {
    await sendTelegram(buildWeeklyMessage());
    console.log("✅ Weekly report sent");
  } catch (err) {
    console.error("❌ Weekly report error:", err.message);
  }
}

// ── ENTRY POINT ──────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === "--setup") {
  getChatId();

} else if (args[0] === "--now") {
  runMorningSignal();

} else if (args[0] === "--evening") {
  // Force flag bypasses market hours check — for testing only
  runEveningOutcome(args.includes("--force"));

} else if (args[0] === "--clear") {
  clearTodayOutcome();
  console.log("Today's outcome cleared. Will be re-logged automatically at 22:00 CET.");

} else if (args[0] === "--weekly") {
  sendTelegram(buildWeeklyMessage()).then(() => console.log("✅ Weekly report sent"));

} else if (args[0] === "--report") {
  generateReport();

} else {
  console.log("🤖 VUAA Signal Bot — Fully Automated");
  console.log("   09:00 CET → morning signal");
  console.log("   22:00 CET → evening outcome");
  console.log("   Friday 22:00 → weekly report");
  console.log("");
  console.log("   Manual:");
  console.log("   --now      force morning signal");
  console.log("   --evening  force evening outcome");
  console.log("   --weekly   force weekly report");
  console.log("   --report   print accuracy log");
  console.log("");

  // 09:00 CET = 07:00 UTC
  cron.schedule("0 7 * * 1-5", runMorningSignal, { timezone: "UTC" });

  // 22:00 CET = 20:00 UTC
  cron.schedule("0 20 * * 1-5", async () => {
    await runEveningOutcome();
    await runWeeklyReport();
  }, { timezone: "UTC" });
}