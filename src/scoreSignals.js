// src/scoreSignals.js — applies the 5-signal framework

export function scoreSignals(data) {
  const { futures, vix, spy, newsData } = data;
  const signals = [];
  let totalScore = 0;

  // ── SIGNAL 1: FUTURES (weight 30%, max +2/-2) ──────────────
  const futuresPct = futures.changePct || 0;
  let futuresScore = 0;
  let futuresStatus = "";
  let futuresEmoji = "";

  if (futuresPct >= 0.3) {
    futuresScore = 2;
    futuresStatus = `+${futuresPct.toFixed(2)}% BULLISH`;
    futuresEmoji = "✅";
  } else if (futuresPct <= -0.3) {
    futuresScore = -2;
    futuresStatus = `${futuresPct.toFixed(2)}% BEARISH`;
    futuresEmoji = "❌";
  } else {
    futuresScore = 0;
    futuresStatus = `${futuresPct.toFixed(2)}% FLAT`;
    futuresEmoji = "⚠️";
  }
  totalScore += futuresScore;
  signals.push({
    name: "FUTURES",
    status: futuresStatus,
    score: futuresScore,
    emoji: futuresEmoji,
  });

  // ── SIGNAL 2: VIX (weight 20%, max +1/-3) ──────────────────
  const vixLevel = vix.price || 20;
  const vixChange = vix.changePct || 0;
  let vixScore = 0;
  let vixStatus = "";
  let vixEmoji = "";

  if (vixLevel > 25) {
    vixScore = -3;
    vixStatus = `${vixLevel.toFixed(1)} — TOO HIGH, SIT OUT`;
    vixEmoji = "🚨";
  } else if (vixChange < -2) {
    vixScore = 1;
    vixStatus = `${vixLevel.toFixed(1)} FALLING (${vixChange.toFixed(1)}%)`;
    vixEmoji = "✅";
  } else if (vixChange > 3) {
    vixScore = -1;
    vixStatus = `${vixLevel.toFixed(1)} RISING (${vixChange.toFixed(1)}%)`;
    vixEmoji = "❌";
  } else {
    vixScore = 0;
    vixStatus = `${vixLevel.toFixed(1)} NEUTRAL`;
    vixEmoji = "⚠️";
  }
  totalScore += vixScore;
  signals.push({
    name: "VIX",
    status: vixStatus,
    score: vixScore,
    emoji: vixEmoji,
  });

  // ── SIGNAL 3: SPY vs PREV CLOSE as VWAP proxy ──────────────
  // Early session: price above prev close = buyers in control
  const spyChange = spy.changePct || 0;
  let vwapScore = 0;
  let vwapStatus = "";
  let vwapEmoji = "";

  if (spyChange > 0.1) {
    vwapScore = 2;
    vwapStatus = `SPY +${spyChange.toFixed(2)}% ABOVE PREV CLOSE`;
    vwapEmoji = "✅";
  } else if (spyChange < -0.1) {
    vwapScore = -2;
    vwapStatus = `SPY ${spyChange.toFixed(2)}% BELOW PREV CLOSE`;
    vwapEmoji = "❌";
  } else {
    vwapScore = 0;
    vwapStatus = `SPY ${spyChange.toFixed(2)}% FLAT`;
    vwapEmoji = "⚠️";
  }
  totalScore += vwapScore;
  signals.push({
    name: "PRICE ACTION",
    status: vwapStatus,
    score: vwapScore,
    emoji: vwapEmoji,
  });

  // ── SIGNAL 4: MOMENTUM (futures + SPY aligned) ─────────────
  let macdScore = 0;
  let macdStatus = "";
  let macdEmoji = "";

  const bullishAlignment = futuresPct > 0 && spyChange > 0;
  const bearishAlignment = futuresPct < 0 && spyChange < 0;

  if (bullishAlignment) {
    macdScore = 1;
    macdStatus = "FUTURES + SPY ALIGNED BULLISH";
    macdEmoji = "✅";
  } else if (bearishAlignment) {
    macdScore = -1;
    macdStatus = "FUTURES + SPY ALIGNED BEARISH";
    macdEmoji = "❌";
  } else {
    macdScore = 0;
    macdStatus = "MIXED SIGNALS";
    macdEmoji = "⚠️";
  }
  totalScore += macdScore;
  signals.push({
    name: "MOMENTUM",
    status: macdStatus,
    score: macdScore,
    emoji: macdEmoji,
  });

  // ── SIGNAL 5: NEWS / MACRO EVENTS ──────────────────────────
  let newsScore = 0;
  let newsStatus = "";
  let newsEmoji = "";

  if (newsData.hasEvent && newsData.events.length > 0) {
    newsScore = -3;
    newsStatus = `HIGH IMPACT: ${newsData.events.slice(0, 2).join(", ")}`;
    newsEmoji = "🚨";
  } else {
    newsScore = 1;
    newsStatus = "NO MAJOR EVENTS";
    newsEmoji = "✅";
  }
  totalScore += newsScore;
  signals.push({
    name: "NEWS/MACRO",
    status: newsStatus,
    score: newsScore,
    emoji: newsEmoji,
  });

  // ── VERDICT ─────────────────────────────────────────────────
  let verdict = "";
  let verdictEmoji = "";
  let action = "";

  if (totalScore >= 4) {
    verdict = "DEPLOY FULL AMOUNT";
    verdictEmoji = "🟢";
    action = "Target: +1.0% → cash out\nStop loss: -0.5% → cut immediately";
  } else if (totalScore >= 2) {
    verdict = "DEPLOY HALF AMOUNT";
    verdictEmoji = "🟡";
    action = "Target: +1.0% → cash out\nStop loss: -0.5% → cut immediately";
  } else {
    verdict = "SIT OUT — NO TRADE TODAY";
    verdictEmoji = "🔴";
    action = "Conditions not favourable. Preserve capital.";
  }

  return { signals, totalScore, verdict, verdictEmoji, action };
}
