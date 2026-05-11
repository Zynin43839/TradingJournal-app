const { createClient } = require("@libsql/client");

let db = null;

function getDb() {
  if (db) return db;
  db = createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return db;
}

module.exports = { getDb };
