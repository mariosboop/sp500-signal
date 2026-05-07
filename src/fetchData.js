// src/fetchData.js — fetches VUAA + VIX + news
// VUAA = Vanguard S&P 500 UCITS ETF (EUR, London Stock Exchange)
// Yahoo Finance ticker: VUAA.L
import fetch from "node-fetch";

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`No data for ${symbol}`);

  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const change = price - prevClose;
  const changePct = (change / prevClose) * 100;

  return { price, prevClose, change, changePct };
}

async function fetchNewsEvents() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { hasEvent: true, events: ["Weekend — no trading"] };
  }

  try {
    const res = await fetch(
      "https://feeds.finance.yahoo.com/rss/2.0/headline?s=VUAA.L&region=GB&lang=en-US",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const text = await res.text();
    const redFlags = ["fed", "fomc", "powell", "cpi", "inflation", "jobs report", "nfp", "rate decision", "gdp", "ecb"];
    const lowerText = text.toLowerCase();
    const foundFlags = redFlags.filter(f => lowerText.includes(f));

    if (foundFlags.length > 0) {
      return { hasEvent: true, events: foundFlags.map(f => f.toUpperCase()) };
    }
    return { hasEvent: false, events: [] };
  } catch {
    return { hasEvent: false, events: [] };
  }
}

export async function fetchAllData() {
  console.log("📡 Fetching VUAA + VIX data...");

  const [vuaa, vix, newsData] = await Promise.all([
    fetchYahoo("VUAA.L"),   // VUAA on London Stock Exchange
    fetchYahoo("^VIX"),     // VIX fear index
    fetchNewsEvents(),
  ]);

  console.log(`✅ VUAA: £${vuaa.price?.toFixed(2)} (${vuaa.changePct?.toFixed(2)}%)`);
  console.log(`✅ VIX:  ${vix.price?.toFixed(2)} (${vix.changePct?.toFixed(2)}%)`);
  console.log(`✅ News: ${newsData.hasEvent ? newsData.events.join(", ") : "clear"}`);

  return { vuaa, vix, newsData };
}