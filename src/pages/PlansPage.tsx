import { useState, useEffect } from "react";
import { Plus, ChevronRight } from "lucide-react";
import { get, post, put, del, PlanSession, TradingPlan } from "../api";

export default function PlansPage() {
  const [sessions, setSessions] = useState<PlanSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [plans, setPlans] = useState<TradingPlan[]>([]);
  const [showSession, setShowSession] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [sessionForm, setSessionForm] = useState({ name: "", description: "", session_type: "daily" as "daily" | "weekly" });
  const [planForm, setPlanForm] = useState({ title: "", pairs: "XAUUSD", direction: "Long", type: "long" as "long" | "short", entry_zone_high: 0, entry_zone_low: 0, sl_price: 0, tp_price: 0, rr_ratio: 0, confidence: 5, setup_name: "", timeframe: "H1" });

  useEffect(() => { get<PlanSession[]>("/plan_sessions").then(setSessions).catch(() => {}); }, []);

  useEffect(() => {
    if (selected) get<TradingPlan[]>(`/plan_sessions/${selected}/plans`).then(setPlans).catch(() => setPlans([]));
    else setPlans([]);
  }, [selected]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    const s = await post<PlanSession>("/plan_sessions", { ...sessionForm, session_date: new Date().toISOString().split("T")[0] });
    setSessions(prev => [s, ...prev]);
    setShowSession(false);
    setSessionForm({ name: "", description: "", session_type: "daily" });
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    await post("/trading_plans", { ...planForm, session_id: selected });
    setShowPlan(false);
    setPlanForm({ title: "", pairs: "XAUUSD", direction: "Long", type: "long", entry_zone_high: 0, entry_zone_low: 0, sl_price: 0, tp_price: 0, rr_ratio: 0, confidence: 5, setup_name: "", timeframe: "H1" });
    if (selected) {
      const data = await get<TradingPlan[]>(`/plan_sessions/${selected}/plans`);
      setPlans(data);
    }
  }

  async function deleteSession(id: string) {
    await del(`/plan_sessions/${id}`);
    if (selected === id) setSelected(null);
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trading Plans</h1>
        <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowSession(true)}>
          <Plus size={16} /> New Session
        </button>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4">
        <div className="glass rounded-xl p-3">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm transition-colors ${
                selected === s.id ? "bg-teal-500/10 text-teal-400" : "hover:bg-white/5"
              }`}
              onClick={() => setSelected(s.id)}
            >
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-zinc-500">{s.session_date?.slice(0, 10)} · {s.session_type}</div>
              </div>
              <ChevronRight size={14} className="text-zinc-500" />
            </div>
          ))}
          {sessions.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">No sessions yet</p>}
        </div>

        <div>
          {!selected && <p className="text-zinc-500 text-center py-12">Select a session to view plans</p>}
          {selected && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{sessions.find(s => s.id === selected)?.name}</h2>
                <button className="btn btn-teal flex items-center gap-2" onClick={() => setShowPlan(true)}>
                  <Plus size={16} /> Add Plan
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(p => (
                  <div key={p.id} className={`glass rounded-xl p-4 ${p.review_completed ? "border-l-2 border-l-teal-500" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{p.title}</span>
                      <span className={`badge ${p.type === "long" ? "badge-green" : "badge-red"}`}>{p.type.toUpperCase()}</span>
                    </div>
                    <div className="text-sm text-zinc-400 space-y-1">
                      <div>{p.pairs} · {p.timeframe} · {p.setup_name || "No setup"}</div>
                      <div>Entry: {p.entry_zone_low}–{p.entry_zone_high} · SL: {p.sl_price} · TP: {p.tp_price}</div>
                      <div>R:R {p.rr_ratio} · Confidence {p.confidence}/5</div>
                      {p.review_completed > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="text-teal-400">Result: {p.actual_result} · PnL: {p.actual_pnl}</div>
                          <div className="text-xs mt-1">{p.review_notes}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {plans.length === 0 && <p className="text-zinc-500 col-span-2 text-center py-8">No plans in this session</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSession && (
        <div className="modal-overlay" onClick={() => setShowSession(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Session</h2>
            <form onSubmit={createSession} className="flex flex-col gap-3">
              <div><label>Name</label><input className="input" value={sessionForm.name} onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })} required /></div>
              <div><label>Description</label><textarea className="input" rows={2} value={sessionForm.description} onChange={e => setSessionForm({ ...sessionForm, description: e.target.value })} /></div>
              <div><label>Type</label><select className="input" value={sessionForm.session_type} onChange={e => setSessionForm({ ...sessionForm, session_type: e.target.value as "daily" | "weekly" })}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option>
              </select></div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSession(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPlan && (
        <div className="modal-overlay" onClick={() => setShowPlan(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Add Trading Plan</h2>
            <form onSubmit={createPlan} className="flex flex-col gap-3">
              <div><label>Title</label><input className="input" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Pair</label><select className="input" value={planForm.pairs} onChange={e => setPlanForm({ ...planForm, pairs: e.target.value })}>
                  {["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD", "ETHUSD"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
                <div><label>Direction</label><select className="input" value={planForm.direction} onChange={e => setPlanForm({ ...planForm, direction: e.target.value, type: e.target.value === "Long" ? "long" : "short" })}>
                  <option>Long</option><option>Short</option>
                </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Entry Zone Low</label><input className="input" type="number" step="0.001" value={planForm.entry_zone_low} onChange={e => setPlanForm({ ...planForm, entry_zone_low: +e.target.value })} /></div>
                <div><label>Entry Zone High</label><input className="input" type="number" step="0.001" value={planForm.entry_zone_high} onChange={e => setPlanForm({ ...planForm, entry_zone_high: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Stop Loss</label><input className="input" type="number" step="0.001" value={planForm.sl_price} onChange={e => setPlanForm({ ...planForm, sl_price: +e.target.value })} /></div>
                <div><label>Take Profit</label><input className="input" type="number" step="0.001" value={planForm.tp_price} onChange={e => setPlanForm({ ...planForm, tp_price: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label>R:R Ratio</label><input className="input" type="number" step="0.1" value={planForm.rr_ratio} onChange={e => setPlanForm({ ...planForm, rr_ratio: +e.target.value })} /></div>
                <div><label>Confidence (1-5)</label><input className="input" type="number" min={1} max={5} value={planForm.confidence} onChange={e => setPlanForm({ ...planForm, confidence: +e.target.value })} /></div>
                <div><label>Timeframe</label><select className="input" value={planForm.timeframe} onChange={e => setPlanForm({ ...planForm, timeframe: e.target.value })}>
                  {["M5", "M15", "M30", "H1", "H4", "D1"].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label>Setup Name</label><input className="input" value={planForm.setup_name} onChange={e => setPlanForm({ ...planForm, setup_name: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPlan(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal">Add Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
