const express = require("express");
const cors = require("cors");
const path = require("path");
const { exec } = require("child_process");

const { migrate } = require("./migrate");
const { createCrudRoutes } = require("./routes/crud");
const registerTradingRoutes = require("./routes/trading");
const registerSessionRoutes = require("./routes/sessions");
const registerPlanRoutes = require("./routes/plans");
const registerSettingsRoutes = require("./routes/settings");
const registerHealthRoutes = require("./routes/health");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Request logger (for debugging on Vercel) ──
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// ── Diagnostic endpoints (before catch-all!) ──
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, node: process.version, platform: process.platform });
});
app.get("/api/diag", (_req, res) => {
  const hasUrl = !!process.env.TURSO_DB_URL;
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  const urlPrefix = process.env.TURSO_DB_URL
    ? process.env.TURSO_DB_URL.replace(/\/\/.*@/, "//***@").substring(0, 40)
    : "not set";
  res.json({ ok: hasUrl && hasToken, hasUrl, hasToken, urlPrefix, node: process.version });
});

// ── Auto CRUD for tables we need ──
const crudTables = [
  "trades", "trading_logs", "trading_plans",
  "plan_sessions", "plan_templates", "plan_versions",
  "backtest_journey", "backtest_sessions", "backtest_test_runs",
  "settings", "economic_events",
];

for (const table of crudTables) {
  createCrudRoutes(app, table);
}

// ── Custom routes ──
registerTradingRoutes(app);
registerSessionRoutes(app);
registerPlanRoutes(app);
registerSettingsRoutes(app);
registerHealthRoutes(app);

// ── Fetch economic calendar — returns preview, does NOT insert ──
app.post("/api/fetch-calendar", (req, res) => {
  const { symbols, days } = req.body || {};
  const scriptPath = path.join(__dirname, "..", "scripts", "news_free.py");

  let cmd = `python "${scriptPath}" --today --no-post`;
  if (days) cmd += ` --days ${days}`;
  if (symbols) cmd += ` --symbols ${symbols}`;

  exec(cmd, {
    encoding: "utf-8",
    timeout: 120000,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  }, (err, stdout, stderr) => {
    if (err) {
      const allStderr = (stderr || "").trim();
      const msg = allStderr || err.message;
      console.error("[fetch-calendar] FAILED:", err.killed ? "TIMEOUT/KILLED" : err.code, "| stderr:", msg.slice(0, 500));
      return res.status(500).json({ error: "Python script failed", detail: msg.split("\n").slice(-5).join("\n") });
    }
    const jsonStart = stdout.indexOf("[");
    if (jsonStart === -1) {
      console.error("[fetch-calendar] No JSON in stdout:", stdout.slice(0, 200));
      return res.json({ events: [], count: 0 });
    }
    try {
      const events = JSON.parse(stdout.slice(jsonStart));
      res.json({ events, count: events.length });
    } catch (e) {
      console.error("[fetch-calendar] JSON parse error:", e.message);
      res.status(500).json({ error: "Failed to parse Python output", detail: e.message });
    }
  });
});

// ── Serve frontend (local dev) ──
const frontendPath = path.join(__dirname, "..", "dist");
app.use(express.static(frontendPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ── Run migrations on startup ──
migrate().catch(console.error);

// Only listen when running directly (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
