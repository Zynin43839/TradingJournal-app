const { getDb } = require("../db");

const colCache = {};

async function getCols(table) {
  if (colCache[table]) return colCache[table];
  const r = await getDb().execute({ sql: `PRAGMA table_info(${table})` });
  colCache[table] = r.rows.map(c => c.name);
  return colCache[table];
}

function createCrudRoutes(app, table) {
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
      const offset = parseInt(req.query.offset) || 0;
      const r = await getDb().execute({ sql: `SELECT * FROM ${table} ORDER BY id DESC LIMIT ? OFFSET ?`, args: [limit, offset] });
      res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post(`/api/${table}`, async (req, res) => {
    try {
      const cols = await getCols(table);
      const now = new Date().toISOString();
      const singular = table.replace(/ies$/, "y").replace(/s$/, "");
      const input = { id: `${singular}_${Date.now()}`, ...req.body };
      if (cols.includes("created_at")) input.created_at = now;
      if (cols.includes("updated_at")) input.updated_at = now;
      const keys = Object.keys(input).filter(k => cols.includes(k));
      const vals = keys.map(() => "?").join(",");
      await getDb().execute({ sql: `INSERT OR REPLACE INTO ${table} (${keys.join(",")}) VALUES (${vals})`, args: keys.map(k => input[k]) });
      res.json(input);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.put(`/api/${table}/:id`, async (req, res) => {
    try {
      const cols = await getCols(table);
      const keys = Object.keys(req.body).filter(k => cols.includes(k));
      if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });
      const sets = keys.map(k => `${k} = ?`).join(", ");
      const params = keys.map(k => req.body[k]);
      if (cols.includes("updated_at")) {
        await getDb().execute({ sql: `UPDATE ${table} SET ${sets}, updated_at = ? WHERE id = ?`, args: [...params, new Date().toISOString(), req.params.id] });
      } else {
        await getDb().execute({ sql: `UPDATE ${table} SET ${sets} WHERE id = ?`, args: [...params, req.params.id] });
      }
      const r = await getDb().execute({ sql: `SELECT * FROM ${table} WHERE id = ?`, args: [req.params.id] });
      res.json(r.rows[0] || { success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.delete(`/api/${table}/:id`, async (req, res) => {
    try {
      const r = await getDb().execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [req.params.id] });
      if (r.rowsAffected === 0) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  app.post(`/api/${table}/sync`, async (req, res) => {
    try {
      const cols = await getCols(table);
      const rows = req.body;
      if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected array" });
      const db = getDb();
      const now = new Date().toISOString();
      await db.execute({ sql: "BEGIN" });
      try {
        await db.execute({ sql: `DELETE FROM ${table}` });
        for (const item of rows) {
          const clean = {};
          for (const k of cols) {
            if (k === "created_at" || k === "updated_at") clean[k] = item[k] || now;
            else clean[k] = item[k] !== undefined ? item[k] : null;
          }
          const keys = Object.keys(clean);
          const vals = keys.map(() => "?").join(",");
          await db.execute({ sql: `INSERT INTO ${table} (${keys.join(",")}) VALUES (${vals})`, args: keys.map(k => clean[k]) });
        }
        await db.execute({ sql: "COMMIT" });
        res.json({ success: true, count: rows.length });
      } catch (e) {
        await db.execute({ sql: "ROLLBACK" });
        throw e;
      }
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
}

module.exports = { createCrudRoutes };
