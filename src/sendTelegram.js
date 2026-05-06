// src/sendTelegram.js — sends the signal message to Telegram
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!chatId || chatId === "your_chat_id_here") {
    console.log("⚠️  No chat ID set. Run: node index.js --setup");
    console.log("Message that would be sent:\n", text);
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const json = await res.json();
  if (json.ok) {
    console.log("✅ Telegram message sent");
  } else {
    console.error("❌ Telegram error:", json.description);
  }
}

export async function getChatId() {
  const token = process.env.TELEGRAM_TOKEN;
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.result && json.result.length > 0) {
    const chatId = json.result[json.result.length - 1]?.message?.chat?.id;
    console.log(`\n✅ Your Chat ID is: ${chatId}`);
    console.log(`Add this to your .env file: TELEGRAM_CHAT_ID=${chatId}\n`);
    return chatId;
  } else {
    console.log("\n⚠️  No messages found.");
    console.log("1. Open Telegram");
    console.log("2. Search for your bot by username");
    console.log("3. Send it any message (e.g. 'hello')");
    console.log("4. Then run: node index.js --setup again\n");
    return null;
  }
}
