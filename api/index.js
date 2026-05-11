const express = require("express");
const cors = require("cors");
const path = require("path");

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

// ── Serve frontend (local dev) ──
const frontendPath = path.join(__dirname, "..", "dist");
app.use(express.static(frontendPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ── Diagnostic endpoints ──
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, node: process.version, platform: process.platform });
});

app.get("/api/diag", (_req, res) => {
  const hasUrl = !!process.env.TURSO_DB_URL;
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  const urlPrefix = process.env.TURSO_DB_URL
    ? process.env.TURSO_DB_URL.replace(/\/\/.*@/, "//***@").substring(0, 40)
    : "not set";
  res.json({
    ok: hasUrl && hasToken,
    hasUrl,
    hasToken,
    urlPrefix,
    node: process.version,
  });
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
