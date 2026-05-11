let db = null;

function getDb() {
  if (db) return db;
  const rawUrl = process.env.TURSO_DB_URL;
  if (!rawUrl) throw new Error("TURSO_DB_URL is not set");
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN is not set");
  const httpUrl = rawUrl.replace(/^libsql:/i, "https:") + "/v2/pipeline";
  db = { httpUrl, authToken };
  return db;
}

function typedArg(arg) {
  if (arg === null || arg === undefined) return { type: "null" };
  return { type: "text", value: String(arg) };
}

async function query({ sql, args = [] }) {
  const { httpUrl, authToken } = getDb();
  const body = JSON.stringify({
    requests: [
      {
        type: "execute",
        stmt: { sql, args: args.map(typedArg) },
      },
      { type: "close" },
    ],
  });
  const res = await fetch(httpUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  const result = data.results?.[0]?.response?.result;
  const rows =
    result?.rows?.map((row, i) => {
      const obj = {};
      (result.cols || []).forEach((col, j) => {
        const cell = row[j];
        obj[col.name] = cell?.value ?? null;
      });
      return obj;
    }) || [];
  return {
    rows,
    rowsAffected: result?.affected_row_count ?? 0,
    lastInsertRowid: result?.last_insert_rowid ?? null,
  };
}

async function batch(sqlArray) {
  const { httpUrl, authToken } = getDb();
  const requests = sqlArray.map((s) => ({
    type: "execute",
    stmt: typeof s === "string" ? { sql: s, args: [] } : { sql: s.sql, args: (s.args || []).map(typedArg) },
  }));
  requests.push({ type: "close" });
  const res = await fetch(httpUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.results?.map((r) => {
    const result = r?.response?.result;
    return {
      rows: result?.rows?.map((row, i) => {
        const obj = {};
        (result.cols || []).forEach((col, j) => {
          obj[col.name] = row[j]?.value ?? null;
        });
        return obj;
      }) || [],
      rowsAffected: result?.affected_row_count ?? 0,
    };
  });
}

module.exports = { getDb, query, batch };
