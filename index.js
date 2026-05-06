// index.js — S&P 500 Daily Signal Bot
// Runs daily at 09:00 CET (08:00 UTC) — 30 mins before US pre-market analysis
// Commands:
//   node index.js          → start scheduler
//   node index.js --now    → run immediately
//   node index.js --setup  → get your Telegram chat ID
import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import { fetchAllData } from "./src/fetchData.js";
import { scoreSignals } from "./src/scoreSignals.js";
import { sendTelegram, getChatId } from "./src/sendTelegram.js";

function buildMessage(scored, data) {
  const now = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const { signals, totalScore, verdict, verdictEmoji, action } = scored;

  let msg = `📊 <b>S&P 500 DAILY SIGNAL</b>\n`;
  msg += `${now}\n`;
  msg += `─────────────────────\n\n`;

  for (const s of signals) {
    const scoreStr = s.score > 0 ? `+${s.score}` : `${s.score}`;
    msg += `${s.emoji} <b>${s.name}</b>\n`;
    msg += `   ${s.status} (${scoreStr})\n\n`;
  }

  msg += `─────────────────────\n`;
  msg += `<b>TOTAL SCORE: ${totalScore > 0 ? "+" : ""}${totalScore} / +7</b>\n\n`;
  msg += `${verdictEmoji} <b>${verdict}</b>\n\n`;
  msg += `${action}\n`;
  msg += `─────────────────────\n`;
  msg += `<i>S&P 500 signal bot — not financial advice</i>`;

  return msg;
}

async function runSignal() {
  console.log(`\n[${new Date().toISOString()}] Running S&P 500 signal check...`);

  try {
    const data = await fetchAllData();
    const scored = scoreSignals(data);
    const message = buildMessage(scored, data);

    console.log("\n" + "─".repeat(40));
    console.log(`VERDICT: ${scored.verdictEmoji} ${scored.verdict}`);
    console.log(`SCORE: ${scored.totalScore}/7`);
    console.log("─".repeat(40) + "\n");

    await sendTelegram(message);

  } catch (err) {
    console.error("❌ Signal error:", err.message);
    await sendTelegram(`⚠️ Signal bot error: ${err.message}`).catch(() => {});
  }
}

// ── ENTRY POINT ──────────────────────────────────
const args = process.argv.slice(2);

if (args.includes("--setup")) {
  console.log("🔧 Setup mode — getting your Telegram Chat ID...");
  console.log("Make sure you've sent a message to your bot first.\n");
  getChatId();

} else if (args.includes("--now")) {
  runSignal();

} else {
  // Schedule: 09:00 CET = 07:00 UTC
  console.log("🤖 S&P 500 Signal Bot started");
  console.log("   Sends daily signal at 09:00 CET");
  console.log("   Run with --now to test immediately");
  console.log("   Run with --setup to get your chat ID\n");

  cron.schedule("0 7 * * 1-5", () => {
    runSignal();
  }, {
    timezone: "UTC"
  });
}
