// src/fetchData.js — fetches all signal data from free APIs
import fetch from "node-fetch";

// Fetch Yahoo Finance quote
async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  return {
    price: meta?.regularMarketPrice,
    prevClose: meta?.chartPreviousClose || meta?.previousClose,
    change: meta?.regularMarketPrice - (meta?.chartPreviousClose || meta?.previousClose),
    changePct: ((meta?.regularMarketPrice - (meta?.chartPreviousClose || meta?.previousClose)) / (meta?.chartPreviousClose || meta?.previousClose)) * 100,
  };
}

// Fetch economic calendar from Investing.com RSS
async function fetchNewsEvents() {
  // Check for major scheduled events today
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  // Weekend — no trading
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { hasEvent: true, events: ["Weekend — no trading"] };
  }

  // Fetch financial news headlines for red flags
  try {
    const res = await fetch(
      "https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const text = await res.text();

    // Check for high-impact keywords
    const redFlags = ["fed", "fomc", "powell", "cpi", "inflation", "jobs report", "nfp", "rate decision", "gdp"];
    const lowerText = text.toLowerCase();
    const foundFlags = redFlags.filter(flag => lowerText.includes(flag));

    if (foundFlags.length > 0) {
      return { hasEvent: true, events: foundFlags.map(f => f.toUpperCase()) };
    }
    return { hasEvent: false, events: [] };
  } catch {
    return { hasEvent: false, events: [] };
  }
}

export async function fetchAllData() {
  console.log("📡 Fetching market data...");

  const [futures, vix, newsData] = await Promise.all([
    fetchYahoo("ES=F"),      // S&P 500 futures
    fetchYahoo("^VIX"),      // VIX
    fetchNewsEvents(),        // News/macro events
  ]);

  // Fetch SPY for VWAP approximation
  const spy = await fetchYahoo("SPY");

  console.log(`✅ Futures: ${futures.changePct?.toFixed(2)}%`);
  console.log(`✅ VIX: ${vix.price?.toFixed(2)} (${vix.changePct?.toFixed(2)}%)`);
  console.log(`✅ SPY: $${spy.price?.toFixed(2)}`);
  console.log(`✅ News events: ${newsData.hasEvent ? newsData.events.join(", ") : "none"}`);

  return { futures, vix, spy, newsData };
}
