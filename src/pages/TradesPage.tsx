import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { get, post, Trade, TradeStats } from "../api";

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], symbol: "XAUUSD", side: "Buy", entry_price: 0, exit_price: 0, pnl: 0, lot_size: 0.01, result: "", emotion_before: "", setup_name: "", pre_trade_notes: "", post_trade_notes: "", lessons_learned: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [tradeData, statsData] = await Promise.all([
        get<Trade[]>("/trading_logs"),
        get<TradeStats>("/trading_logs/stats"),
      ]);
      setTrades(tradeData);
      setStats(statsData);
    } catch { /* ignore */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = form.pnl > 0 ? "Win" : form.pnl < 0 ? "Loss" : "BE";
    await post("/trading_logs", { ...form, result });
    setShowForm(false);
    setForm({ date: new Date().toISOString().split("T")[0], symbol: "XAUUSD", side: "Buy", entry_price: 0, exit_price: 0, pnl: 0, lot_size: 0.01, result: "", emotion_before: "", setup_name: "", pre_trade_notes: "", post_trade_notes: "", lessons_learned: "" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trading Logs</h1>
        <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Trade
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Trades", value: stats.overview.total },
            { label: "Win Rate", value: `${stats.overview.win_rate}%` },
            { label: "Total PnL", value: `$${stats.overview.total_pnl}`, className: stats.overview.total_pnl >= 0 ? "text-green-400" : "text-red-400" },
            { label: "Avg PnL", value: `$${stats.overview.avg_pnl}`, className: stats.overview.avg_pnl >= 0 ? "text-green-400" : "text-red-400" },
          ].map(s => (
            <div key={s.label} className="glass rounded-xl p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.className || ""}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>PnL</th>
              <th>Result</th>
              <th>Setup</th>
              <th>Emotion</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id}>
                <td>{t.date?.slice(0, 10)}</td>
                <td><span className="font-medium">{t.symbol}</span></td>
                <td><span className={`badge ${t.side === "Buy" ? "badge-green" : "badge-red"}`}>{t.side}</span></td>
                <td>{t.entry_price}</td>
                <td>{t.exit_price}</td>
                <td className={t.pnl >= 0 ? "text-green-400" : "text-red-400"}>{t.pnl}</td>
                <td><span className={`badge ${t.result === "Win" ? "badge-green" : t.result === "Loss" ? "badge-red" : "badge-yellow"}`}>{t.result || "BE"}</span></td>
                <td>{t.setup_name || "-"}</td>
                <td>{t.emotion_before || "-"}</td>
              </tr>
            ))}
            {trades.length === 0 && <tr><td colSpan={9} className="text-center text-zinc-500 py-8">No trades yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Add Trade</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label>Date</label><input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                <div><label>Symbol</label><select className="input" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
                  {["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD", "ETHUSD", "NAS100", "US30", "SP500"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Side</label><select className="input" value={form.side} onChange={e => setForm({ ...form, side: e.target.value })}>
                  <option>Buy</option><option>Sell</option>
                </select></div>
                <div><label>Lot Size</label><input className="input" type="number" step="0.01" value={form.lot_size} onChange={e => setForm({ ...form, lot_size: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label>Entry Price</label><input className="input" type="number" step="0.001" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: +e.target.value })} /></div>
                <div><label>Exit Price</label><input className="input" type="number" step="0.001" value={form.exit_price} onChange={e => setForm({ ...form, exit_price: +e.target.value })} /></div>
                <div><label>PnL</label><input className="input" type="number" step="0.01" value={form.pnl} onChange={e => setForm({ ...form, pnl: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Setup Name</label><input className="input" value={form.setup_name} onChange={e => setForm({ ...form, setup_name: e.target.value })} /></div>
                <div><label>Emotion Before</label><select className="input" value={form.emotion_before} onChange={e => setForm({ ...form, emotion_before: e.target.value })}>
                  <option value="">Select...</option>
                  <option>Calm</option><option>Confident</option><option>Anxious</option><option>Excited</option><option>Tired</option><option>Frustrated</option>
                </select></div>
              </div>
              <div><label>Notes</label><textarea className="input" rows={2} value={form.pre_trade_notes} onChange={e => setForm({ ...form, pre_trade_notes: e.target.value })} /></div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Save Trade</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
