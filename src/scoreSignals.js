// src/scoreSignals.js — scoring for VUAA signal
export function scoreSignals(data) {
  const { vuaa, vix, newsData } = data;
  const signals = [];
  let totalScore = 0;

  // ── SIGNAL 1: VUAA PRICE ACTION ──────────────────────────────
  // Is VUAA already moving up from yesterday's close?
  const vuaaChg = vuaa.changePct || 0;
  let s1Score = 0, s1Status = "", s1Emoji = "";

  if (vuaaChg >= 0.3) {
    s1Score = 2; s1Status = `+${vuaaChg.toFixed(2)}% BULLISH`; s1Emoji = "✅";
  } else if (vuaaChg <= -0.3) {
    s1Score = -2; s1Status = `${vuaaChg.toFixed(2)}% BEARISH`; s1Emoji = "❌";
  } else {
    s1Score = 0; s1Status = `${vuaaChg.toFixed(2)}% FLAT`; s1Emoji = "⚠️";
  }
  totalScore += s1Score;
  signals.push({ name: "VUAA PRICE", status: s1Status, score: s1Score, emoji: s1Emoji });

  // ── SIGNAL 2: VIX LEVEL ───────────────────────────────────────
  const vixLevel = vix.price || 20;
  const vixChg = vix.changePct || 0;
  let s2Score = 0, s2Status = "", s2Emoji = "";

  if (vixLevel > 25) {
    s2Score = -3; s2Status = `${vixLevel.toFixed(1)} TOO HIGH`; s2Emoji = "🚨";
  } else if (vixChg < -2) {
    s2Score = 1; s2Status = `${vixLevel.toFixed(1)} FALLING (${vixChg.toFixed(1)}%)`; s2Emoji = "✅";
  } else if (vixChg > 3) {
    s2Score = -1; s2Status = `${vixLevel.toFixed(1)} RISING (${vixChg.toFixed(1)}%)`; s2Emoji = "❌";
  } else {
    s2Score = 0; s2Status = `${vixLevel.toFixed(1)} NEUTRAL`; s2Emoji = "⚠️";
  }
  totalScore += s2Score;
  signals.push({ name: "VIX", status: s2Status, score: s2Score, emoji: s2Emoji });

  // ── SIGNAL 3: VUAA MOMENTUM ───────────────────────────────────
  // Is VUAA above its opening price? (intraday trend)
  const vuaaAboveOpen = vuaaChg > 0.1;
  const vuaaBelowOpen = vuaaChg < -0.1;
  let s3Score = 0, s3Status = "", s3Emoji = "";

  if (vuaaAboveOpen) {
    s3Score = 2; s3Status = "ABOVE OPEN — BUYERS IN CONTROL"; s3Emoji = "✅";
  } else if (vuaaBelowOpen) {
    s3Score = -2; s3Status = "BELOW OPEN — SELLERS IN CONTROL"; s3Emoji = "❌";
  } else {
    s3Score = 0; s3Status = "FLAT — NO CLEAR DIRECTION"; s3Emoji = "⚠️";
  }
  totalScore += s3Score;
  signals.push({ name: "MOMENTUM", status: s3Status, score: s3Score, emoji: s3Emoji });

  // ── SIGNAL 4: VIX vs VUAA ALIGNMENT ──────────────────────────
  // When VIX is falling AND VUAA is rising — strong alignment
  let s4Score = 0, s4Status = "", s4Emoji = "";
  const strongBull = vixChg < 0 && vuaaChg > 0;
  const strongBear = vixChg > 0 && vuaaChg < 0;

  if (strongBull) {
    s4Score = 1; s4Status = "VIX DOWN + VUAA UP — ALIGNED BULLISH"; s4Emoji = "✅";
  } else if (strongBear) {
    s4Score = -1; s4Status = "VIX UP + VUAA DOWN — ALIGNED BEARISH"; s4Emoji = "❌";
  } else {
    s4Score = 0; s4Status = "MIXED SIGNALS"; s4Emoji = "⚠️";
  }
  totalScore += s4Score;
  signals.push({ name: "VIX/VUAA ALIGN", status: s4Status, score: s4Score, emoji: s4Emoji });

  // ── SIGNAL 5: NEWS / MACRO ────────────────────────────────────
  let s5Score = 0, s5Status = "", s5Emoji = "";
  if (newsData.hasEvent && newsData.events.length > 0) {
    s5Score = -3; s5Status = `HIGH IMPACT: ${newsData.events.slice(0, 2).join(", ")}`; s5Emoji = "🚨";
  } else {
    s5Score = 1; s5Status = "NO MAJOR EVENTS"; s5Emoji = "✅";
  }
  totalScore += s5Score;
  signals.push({ name: "NEWS/MACRO", status: s5Status, score: s5Score, emoji: s5Emoji });

  // ── VERDICT ───────────────────────────────────────────────────
  let verdict, verdictEmoji, action;
  if (totalScore >= 4) {
    verdict = "BUY VUAA NOW"; verdictEmoji = "🟢";
    action = "Target: +1.0% → sell\nStop loss: -0.5% → sell immediately";
  } else if (totalScore >= 2) {
    verdict = "BUY HALF POSITION"; verdictEmoji = "🟡";
    action = "Target: +1.0% → sell\nStop loss: -0.5% → sell immediately";
  } else {
    verdict = "SIT OUT — NO TRADE"; verdictEmoji = "🔴";
    action = "Conditions not favourable. Preserve capital.";
  }

  return { signals, totalScore, verdict, verdictEmoji, action };
}