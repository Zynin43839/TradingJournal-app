import { useState, useEffect } from "react";
import { Plus, RotateCcw, ChevronRight, X, TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, BookOpen, CheckCircle2, Zap, Eye, EyeOff } from "lucide-react";
import { get, post, del, PlanSession, TradingPlan } from "../api";

const SYMBOLS = ["XAUUSD", "XAGUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD", "ETHUSD", "NAS100", "US30", "SP500"];
const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const CONFLUENCE_ITEMS = [
  { key: "confluence_ob", label: "OB", color: "bg-blue-500/20 text-blue-400" },
  { key: "confluence_fvg", label: "FVG", color: "bg-purple-500/20 text-purple-400" },
  { key: "confluence_choch", label: "CHoCH", color: "bg-yellow-500/20 text-yellow-400" },
  { key: "confluence_ema", label: "EMA", color: "bg-cyan-500/20 text-cyan-400" },
  { key: "confluence_rsi", label: "RSI", color: "bg-orange-500/20 text-orange-400" },
  { key: "confluence_volume", label: "Vol", color: "bg-pink-500/20 text-pink-400" },
];
const HTF_OPTIONS = ["Bullish", "Bearish", "Neutral"];
const CONDITIONS = ["Uptrend", "Downtrend", "Sideway", "Choppy", "Breakout", "Reversal"];

const emptyPlan = {
  type: "long" as "long" | "short", title: "", pairs: "XAUUSD", timeframe: "H1",
  setup_name: "", direction: "Long", market_condition: "",
  entry_zone_high: 0, entry_zone_low: 0, sl_price: 0, tp_price: 0, tp1: 0, tp2: 0, tp3: 0,
  rr_ratio: 0, confidence: 5,
  confluence_ob: 0, confluence_fvg: 0, confluence_choch: 0, confluence_ema: 0, confluence_rsi: 0, confluence_volume: 0,
  htf_bias: "", key_sr: "", must_see: "", must_avoid: "", pre_trade_notes: "",
};

const emptyReview = { actual_outcome: "", actual_result: "", actual_pnl: 0, followed_plan: null as number | null, market_moved_as_predicted: null as number | null, review_notes: "", lessons_learned: "" };

function formatDate(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return iso.slice(0, 10); }
}

function ConfidenceDots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < n ? "bg-amber-400" : "bg-zinc-700"}`} />
      ))}
    </span>
  );
}

function FlipCard({ p, flipped, onFlip, onReview }: { p: TradingPlan; flipped: boolean; onFlip: () => void; onReview: () => void }) {
  return (
    <div className="group perspective h-[280px]">
      <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${flipped ? "rotate-y-180" : ""}`}>
        {/* Front - Prediction */}
        <div className="absolute inset-0 backface-hidden glass rounded-xl overflow-hidden border border-white/[0.04]">
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${p.type === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {p.type === "long" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {p.type.toUpperCase()}
                </span>
                <span className="text-xs text-zinc-500 font-medium">{p.pairs}</span>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-zinc-500">{p.timeframe}</span>
              </div>
              <button onClick={onFlip} className="text-zinc-500 hover:text-amber-400 transition-colors p-1" title="Flip to review">
                <RotateCcw size={13} />
              </button>
            </div>

            <h3 className="font-semibold text-sm mb-2 leading-snug">{p.title}</h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
              <div className="text-zinc-500">Entry</div>
              <div className="text-right font-mono">{p.entry_zone_low} – {p.entry_zone_high}</div>
              <div className="text-zinc-500">SL</div>
              <div className="text-right font-mono text-red-400">{p.sl_price || "-"}</div>
              <div className="text-zinc-500">TP</div>
              <div className="text-right font-mono text-green-400">{p.tp_price || "-"}</div>
              <div className="text-zinc-500">R:R</div>
              <div className="text-right font-mono">{p.rr_ratio || "-"}:1</div>
            </div>

            <div className="flex gap-1 flex-wrap mb-2">
              {CONFLUENCE_ITEMS.filter(c => (p as any)[c.key]).map(c => (
                <span key={c.key} className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
              ))}
            </div>

            {p.pre_trade_notes && (
              <div className="text-[10px] text-zinc-500 italic leading-relaxed border-t border-white/[0.04] pt-1.5 mt-auto truncate">
                "{p.pre_trade_notes}"
              </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.plan_status === "planned" ? "bg-blue-500/20 text-blue-400" : p.plan_status === "active" ? "bg-amber-500/20 text-amber-400" : p.plan_status === "executed" ? "bg-green-500/20 text-green-400" : p.plan_status === "skipped" ? "bg-zinc-700 text-zinc-400" : "bg-red-500/20 text-red-400"}`}>
                  {p.plan_status || "planned"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-600">Conf</span>
                <ConfidenceDots n={p.confidence} />
              </div>
            </div>
          </div>
        </div>

        {/* Back - Review */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-xl overflow-hidden border border-white/[0.04]">
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <BookOpen size={12} /> Review
              </span>
              <button onClick={onFlip} className="text-zinc-500 hover:text-amber-400 transition-colors p-1" title="Flip back">
                <RotateCcw size={13} />
              </button>
            </div>

            <h3 className="font-semibold text-sm mb-2">{p.title}</h3>

            {p.review_completed ? (
              <div className="flex-1 space-y-2 text-xs overflow-auto">
                <div className="flex items-center gap-2">
                  <span className={`badge ${p.actual_result === "Win" ? "badge-green" : p.actual_result === "Loss" ? "badge-red" : p.actual_result === "BE" ? "badge-yellow" : "badge-zinc"}`}>{p.actual_result || "No Trade"}</span>
                  <span className={p.actual_pnl >= 0 ? "text-green-400 font-mono" : "text-red-400 font-mono"}>${p.actual_pnl}</span>
                </div>
                {p.review_notes && <div className="text-zinc-400 italic leading-relaxed">"{p.review_notes}"</div>}
                {p.lessons_learned && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-amber-400/80 font-medium mb-0.5">Lesson</div>
                    <div className="text-amber-400/60">{p.lessons_learned}</div>
                  </div>
                )}
                {p.followed_plan !== null && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <CheckCircle2 size={10} />
                    {p.followed_plan ? "Followed plan" : "Deviation"}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Zap size={18} className="text-purple-400" />
                </div>
                <p className="text-zinc-500 text-xs text-center">No review yet — what happened?</p>
                <button onClick={onReview} className="btn btn-purple text-xs py-1.5 px-3">
                  Write Review
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 space-y-3">
      <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
        <Icon size={14} className="text-purple-400" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function PlansPage() {
  const [sessions, setSessions] = useState<PlanSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [plans, setPlans] = useState<TradingPlan[]>([]);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [showSession, setShowSession] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showReview, setShowReview] = useState<string | null>(null);
  const [quickMode, setQuickMode] = useState(true);
  const [sessionForm, setSessionForm] = useState({ name: "", description: "", session_type: "daily" as "daily" | "weekly" });
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [reviewForm, setReviewForm] = useState(emptyReview);

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
    setPlanForm(emptyPlan);
    if (selected) get<TradingPlan[]>(`/plan_sessions/${selected}/plans`).then(setPlans);
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!showReview) return;
    await post(`/plans/${showReview}/review`, reviewForm);
    setShowReview(null);
    setReviewForm(emptyReview);
    if (selected) get<TradingPlan[]>(`/plan_sessions/${selected}/plans`).then(setPlans);
  }

  const toggleFlip = (id: string) => {
    const n = new Set(flipped);
    if (n.has(id)) n.delete(id); else n.add(id);
    setFlipped(n);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Trading Plans</h1>
          <p className="text-zinc-500 text-sm">Prediction cards — front: plan, back: review</p>
        </div>
        <button className="btn btn-mint flex items-center gap-2" onClick={() => setShowSession(true)}>
          <Plus size={16} /> New Session
        </button>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4">
        {/* Sessions sidebar */}
        <div className="glass p-3 space-y-1">
          <div className="text-xs text-zinc-600 uppercase tracking-wider font-semibold px-3 py-2">Sessions</div>
          {sessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer text-sm transition-colors ${selected === s.id ? "bg-purple-500/10 text-purple-400" : "hover:bg-white/5"}`}
              onClick={() => setSelected(s.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                  <span>{formatDate(s.session_date)}</span>
                  <span className="text-zinc-700">•</span>
                  <span className="capitalize">{s.session_type}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-zinc-500 shrink-0" />
            </div>
          ))}
          {sessions.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">No sessions</p>}
        </div>

        {/* Plans area */}
        <div>
          {!selected && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
              <Target size={40} className="text-zinc-700 mb-3" />
              <p className="text-sm">Select a session to view trading plans</p>
            </div>
          )}
          {selected && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{sessions.find(s => s.id === selected)?.name}</h2>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-0.5 bg-zinc-800/50 p-0.5 rounded-lg">
                    <button onClick={() => setQuickMode(false)} className={`text-[10px] px-2 py-1 rounded-md transition-colors ${!quickMode ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>Full</button>
                    <button onClick={() => setQuickMode(true)} className={`text-[10px] px-2 py-1 rounded-md transition-colors ${quickMode ? "bg-green-500/10 text-green-400" : "text-zinc-500 hover:text-zinc-300"}`}>Quick</button>
                  </div>
                  <button className="btn btn-mint flex items-center gap-2" onClick={() => { setPlanForm({...emptyPlan}); setShowPlan(true); }}>
                    <Plus size={16} /> Add Plan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {plans.map(p => (
                  <FlipCard key={p.id} p={p} flipped={flipped.has(p.id)} onFlip={() => toggleFlip(p.id)} onReview={() => { setShowReview(p.id); setReviewForm(emptyReview); }} />
                ))}
                {plans.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center py-12 text-zinc-500">
                    <BarChart3 size={32} className="text-zinc-700 mb-2" />
                    <p className="text-sm">No plans in this session</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showSession && (
        <div className="modal-overlay" onClick={() => setShowSession(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Session</h2>
            <form onSubmit={createSession} className="flex flex-col gap-3">
              <div>
                <label>Name</label>
                <input className="input" value={sessionForm.name} onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })} required placeholder="e.g., Mon May 11" />
              </div>
              <div>
                <label>Description</label>
                <textarea className="input" rows={2} value={sessionForm.description} onChange={e => setSessionForm({ ...sessionForm, description: e.target.value })} placeholder="Notes about this session" />
              </div>
              <div>
                <label>Type</label>
                <select className="input" value={sessionForm.session_type} onChange={e => setSessionForm({ ...sessionForm, session_type: e.target.value as "daily" | "weekly" })}>
                  <option value="daily">Daily</option><option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSession(false)}>Cancel</button>
                <button type="submit" className="btn btn-mint">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showPlan && (
        <div className="modal-overlay" onClick={() => setShowPlan(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Trading Plan</h2>
              <button onClick={() => setShowPlan(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createPlan} className="flex flex-col gap-3">
              {/* Direction toggle */}
              <div className="flex gap-3">
                <button type="button" onClick={() => setPlanForm(p => ({ ...p, type: "short", direction: "Short" }))} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${planForm.type === "short" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-zinc-800/60 text-zinc-500 border border-white/[0.06]"}`}>
                  <TrendingDown size={16} /> SHORT
                </button>
                <button type="button" onClick={() => setPlanForm(p => ({ ...p, type: "long", direction: "Long" }))} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${planForm.type === "long" ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-zinc-800/60 text-zinc-500 border border-white/[0.06]"}`}>
                  <TrendingUp size={16} /> LONG
                </button>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Title</label>
                  <input className="input" value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} required placeholder="e.g., OB Retest at London Open" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label>Pair</label>
                    <select className="input" value={planForm.pairs} onChange={e => setPlanForm({ ...planForm, pairs: e.target.value })}>{SYMBOLS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                  </div>
                  <div>
                    <label>TF</label>
                    <select className="input" value={planForm.timeframe} onChange={e => setPlanForm({ ...planForm, timeframe: e.target.value })}>{TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                </div>
              </div>

              {/* Entry zone + SL/TP */}
              <FormSection title="Entry & Risk" icon={Target}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label>Entry Zone Low</label>
                    <input className="input" type="number" step="0.001" value={planForm.entry_zone_low} onChange={e => setPlanForm({ ...planForm, entry_zone_low: +e.target.value })} />
                  </div>
                  <div>
                    <label>Entry Zone High</label>
                    <input className="input" type="number" step="0.001" value={planForm.entry_zone_high} onChange={e => setPlanForm({ ...planForm, entry_zone_high: +e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-red-400">Stop Loss</label>
                    <input className="input border-red-500/15" type="number" step="0.001" value={planForm.sl_price} onChange={e => setPlanForm({ ...planForm, sl_price: +e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-green-400">Take Profit</label>
                    <input className="input border-green-500/15" type="number" step="0.001" value={planForm.tp_price} onChange={e => setPlanForm({ ...planForm, tp_price: +e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label>R:R Ratio</label>
                    <input className="input" type="number" step="0.1" value={planForm.rr_ratio} onChange={e => setPlanForm({ ...planForm, rr_ratio: +e.target.value })} placeholder="2" />
                  </div>
                </div>
                {!quickMode && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-green-400/70">TP1 (50%)</label>
                      <input className="input border-green-500/15" type="number" step="0.001" value={planForm.tp1} onChange={e => setPlanForm({ ...planForm, tp1: +e.target.value })} />
                    </div>
                    <div>
                      <label className="text-green-400/70">TP2 (25%)</label>
                      <input className="input border-green-500/15" type="number" step="0.001" value={planForm.tp2} onChange={e => setPlanForm({ ...planForm, tp2: +e.target.value })} />
                    </div>
                    <div>
                      <label className="text-green-400/70">TP3 (25%)</label>
                      <input className="input border-green-500/15" type="number" step="0.001" value={planForm.tp3} onChange={e => setPlanForm({ ...planForm, tp3: +e.target.value })} />
                    </div>
                  </div>
                )}
              </FormSection>

              {/* Confluence & Analysis */}
              <FormSection title="Technical Analysis" icon={BarChart3}>
                <div className="grid grid-cols-2 gap-3">
                  {!quickMode && (
                    <>
                      <div>
                        <label>Setup Name</label>
                        <input className="input" value={planForm.setup_name} onChange={e => setPlanForm({ ...planForm, setup_name: e.target.value })} placeholder="OB Retest + FVG" />
                      </div>
                      <div>
                        <label>Market Condition</label>
                        <select className="input" value={planForm.market_condition} onChange={e => setPlanForm({ ...planForm, market_condition: e.target.value })}>
                          <option value="">Any</option>
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label>HTF Bias</label>
                    <select className="input" value={planForm.htf_bias} onChange={e => setPlanForm({ ...planForm, htf_bias: e.target.value })}>
                      <option value="">Neutral</option>
                      {HTF_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Key S/R Levels</label>
                    <input className="input" value={planForm.key_sr} onChange={e => setPlanForm({ ...planForm, key_sr: e.target.value })} placeholder="R1=xx, S1=xx" />
                  </div>
                </div>
                {!quickMode && (
                  <div>
                    <label className="text-yellow-400 text-[10px]">Confluence Checklist</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {CONFLUENCE_ITEMS.map(c => (
                        <label key={c.key} className="flex items-center gap-1.5 text-xs cursor-pointer bg-zinc-800/60 px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-colors">
                          <input type="checkbox" checked={!!(planForm as any)[c.key]} onChange={e => setPlanForm({ ...planForm, [c.key]: e.target.checked ? 1 : 0 })} className="accent-purple-500" />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label>Confidence</label>
                  <div className="flex items-center gap-3">
                    <input className="input flex-1" type="range" min={1} max={5} value={planForm.confidence} onChange={e => setPlanForm({ ...planForm, confidence: +e.target.value })} />
                    <span className="text-sm text-amber-400 font-mono">{planForm.confidence}/5</span>
                  </div>
                </div>
              </FormSection>

              {/* Psychology */}
              {!quickMode && (
                <FormSection title="Trading Psychology" icon={Eye}>
                  <div>
                    <label className="text-green-400/80">Must See (before entry)</label>
                    <textarea className="input border-green-500/15" rows={2} value={planForm.must_see} onChange={e => setPlanForm({ ...planForm, must_see: e.target.value })} placeholder="What must happen before I enter?" />
                  </div>
                  <div>
                    <label className="text-red-400/80">Must Avoid</label>
                    <textarea className="input border-red-500/15" rows={2} value={planForm.must_avoid} onChange={e => setPlanForm({ ...planForm, must_avoid: e.target.value })} placeholder="What would invalidate this trade?" />
                  </div>
                  <div>
                    <label>Pre-Trade Notes</label>
                    <textarea className="input" rows={2} value={planForm.pre_trade_notes} onChange={e => setPlanForm({ ...planForm, pre_trade_notes: e.target.value })} placeholder="Why am I taking this trade?" />
                  </div>
                </FormSection>
              )}

              <div className="flex gap-2 justify-end mt-1">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPlan(false)}>Cancel</button>
                <button type="submit" className="btn btn-mint">Add Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(null)}>
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Review Trade Plan</h2>
            <p className="text-zinc-500 text-xs mb-4">Be honest — this is how you learn.</p>
            <form onSubmit={submitReview} className="flex flex-col gap-3">
              <div>
                <label>Actual Outcome</label>
                <textarea className="input" rows={2} value={reviewForm.actual_outcome} onChange={e => setReviewForm({ ...reviewForm, actual_outcome: e.target.value })} placeholder="What actually happened?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label>Result</label>
                  <select className="input" value={reviewForm.actual_result} onChange={e => setReviewForm({ ...reviewForm, actual_result: e.target.value })}>
                    <option value="">Select...</option>
                    <option>Win</option><option>Loss</option><option>BE</option><option>No Trade</option>
                  </select>
                </div>
                <div>
                  <label>Actual P&L ($)</label>
                  <input className="input" type="number" step="0.01" value={reviewForm.actual_pnl} onChange={e => setReviewForm({ ...reviewForm, actual_pnl: +e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-amber-400">Market Moved As Predicted?</label>
                  <div className="flex gap-2 mt-1">
                    {["Yes", "No", "--"].map(opt => (
                      <button key={opt} type="button" onClick={() => setReviewForm({ ...reviewForm, market_moved_as_predicted: opt === "--" ? null : opt === "Yes" ? 1 : 0 })} className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${reviewForm.market_moved_as_predicted === (opt === "Yes" ? 1 : opt === "No" ? 0 : null) ? (opt === "Yes" ? "bg-green-500/20 text-green-400" : opt === "No" ? "bg-red-500/20 text-red-400" : "bg-zinc-700 text-zinc-400") : "bg-zinc-800/60 text-zinc-500"}`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-amber-400">Followed The Plan?</label>
                  <div className="flex gap-2 mt-1">
                    {["Yes", "Changed", "--"].map(opt => (
                      <button key={opt} type="button" onClick={() => setReviewForm({ ...reviewForm, followed_plan: opt === "--" ? null : opt === "Yes" ? 1 : 0 })} className={`flex-1 py-1.5 rounded-lg text-xs transition-colors ${reviewForm.followed_plan === (opt === "Yes" ? 1 : opt === "Changed" ? 0 : null) ? (opt === "Yes" ? "bg-green-500/20 text-green-400" : opt === "Changed" ? "bg-yellow-500/20 text-yellow-400" : "bg-zinc-700 text-zinc-400") : "bg-zinc-800/60 text-zinc-500"}`}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label>Review Notes</label>
                <textarea className="input" rows={2} value={reviewForm.review_notes} onChange={e => setReviewForm({ ...reviewForm, review_notes: e.target.value })} placeholder="What went right/wrong?" />
              </div>
              <div>
                <label className="text-amber-400">Lesson Learned</label>
                <textarea className="input border-amber-500/15" rows={2} value={reviewForm.lessons_learned} onChange={e => setReviewForm({ ...reviewForm, lessons_learned: e.target.value })} placeholder="What will I do differently?" />
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReview(null)}>Cancel</button>
                <button type="submit" className="btn btn-purple flex items-center gap-1.5">
                  <BookOpen size={14} /> Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .perspective { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
