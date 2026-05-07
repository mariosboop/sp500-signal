// src/fetchOutcome.js — fetches VUAA actual close after market
// VUAA trades 08:00-17:30 CET. Evening job runs at 22:00 CET.
import fetch from "node-fetch";

export async function fetchActualOutcome(force = false) {
  // Safety check — don't run before market closes (17:30 CET = 15:30 UTC)
  const nowUTC = new Date();
  const hourUTC = nowUTC.getUTCHours();
  const minuteUTC = nowUTC.getUTCMinutes();
  const totalMinutesUTC = hourUTC * 60 + minuteUTC;
  const marketCloseUTC = 15 * 60 + 30; // 15:30 UTC = 17:30 CET

  if (!force && totalMinutesUTC < marketCloseUTC) {
    const cetHour = hourUTC + 2;
    throw new Error(
      `Market not closed yet. VUAA closes at 17:30 CET. Current time: ${cetHour}:${String(minuteUTC).padStart(2,"0")} CET. Run after 17:30 CET.`
    );
  }

  console.log("📡 Fetching VUAA actual close...");

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/VUAA.L?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const quotes = result?.indicators?.quote?.[0];

    if (!quotes) throw new Error("No VUAA data from Yahoo Finance");

    const closes = quotes.close.filter(Boolean);
    const prevClose = closes[closes.length - 2];
    const todayClose = closes[closes.length - 1];

    const changePct = ((todayClose - prevClose) / prevClose) * 100;
    const direction = changePct >= 0 ? "up" : "down";

    console.log(`✅ VUAA: prev £${prevClose?.toFixed(2)} → today £${todayClose?.toFixed(2)} (${changePct.toFixed(2)}%)`);

    return {
      prevClose: prevClose?.toFixed(2),
      todayClose: todayClose?.toFixed(2),
      changePct: parseFloat(changePct.toFixed(2)),
      direction,
    };
  } catch (err) {
    console.error("❌ Error fetching VUAA outcome:", err.message);
    throw err;
  }
}