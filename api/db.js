const { createClient } = require("@libsql/client");

let db = null;

function getDb() {
  if (db) return db;
  let url = process.env.TURSO_DB_URL;
  if (!url) throw new Error("TURSO_DB_URL is not set. Add it in Vercel Dashboard → Project Settings → Environment Variables");
  // Vercel serverless: use https instead of WebSocket (more reliable)
  url = url.replace(/^libsql:/i, "https:");
  db = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return db;
}

module.exports = { getDb };
