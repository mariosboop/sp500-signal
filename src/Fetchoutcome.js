// src/fetchOutcome.js — fetches VUAA actual close after market
import fetch from "node-fetch";

export async function fetchActualOutcome() {
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