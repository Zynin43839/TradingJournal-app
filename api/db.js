const { createClient } = require("@tursodatabase/serverless/compat");

let db = null;

function getDb() {
  if (db) return db;
  const url = process.env.TURSO_DB_URL;
  if (!url) throw new Error("TURSO_DB_URL is not set. Add it in Vercel Dashboard → Project Settings → Environment Variables");
  db = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return db;
}

module.exports = { getDb };
