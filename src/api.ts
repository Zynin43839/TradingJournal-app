const BASE = "/api";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export function get<T>(url: string) {
  return req<T>(url);
}

export function post<T>(url: string, body: unknown) {
  return req<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function put<T>(url: string, body: unknown) {
  return req<T>(url, { method: "PUT", body: JSON.stringify(body) });
}

export function del<T = { success: boolean }>(url: string) {
  return req<T>(url, { method: "DELETE" });
}

// ── Types ──

export interface PlanSession {
  id: string;
  name: string;
  description: string;
  session_date: string;
  session_type: "daily" | "weekly";
  status: string;
  review_completed: number;
  review_notes: string;
  lessons_learned: string;
  created_at: string;
  updated_at: string;
}

export interface TradingPlan {
  id: string;
  session_id: string;
  type: "long" | "short";
  title: string;
  pairs: string;
  timeframe: string;
  setup_name: string;
  direction: string;
  entry_zone_high: number;
  entry_zone_low: number;
  sl_price: number;
  tp_price: number;
  tp1: number;
  tp2: number;
  tp3: number;
  rr_ratio: number;
  confidence: number;
  confluence_ob: number;
  confluence_fvg: number;
  confluence_choch: number;
  confluence_ema: number;
  confluence_rsi: number;
  confluence_volume: number;
  htf_bias: string;
  key_sr: string;
  must_see: string;
  must_avoid: string;
  pre_trade_notes: string;
  plan_status: string;
  actual_outcome: string;
  actual_result: string;
  actual_pnl: number;
  followed_plan: number | null;
  market_moved_as_predicted: number | null;
  review_notes: string;
  lessons_learned: string;
  review_completed: number;
  created_at: string;
}

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  result: string;
  lot_size: number;
  sl_price: number;
  tp_price: number;
  session: string;
  emotion_before: string;
  setup_name: string;
  confidence: number;
  pre_trade_notes: string;
  post_trade_notes: string;
  lessons_learned: string;
  created_at: string;
}

export interface TradeStats {
  overview: {
    total: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: number;
    avg_pnl: number;
    best_trade: number;
    worst_trade: number;
  };
  bySymbol: { symbol: string; cnt: number; pnl: number }[];
  bySide: { side: string; cnt: number; pnl: number; wr: number }[];
  recent: Trade[];
}

export interface BacktestSession {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface BacktestEntry {
  id: string;
  session_id: string;
  date: string;
  symbol: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  sl_price: number;
  tp_price: number;
  lot_size: number;
  pnl: number;
  rr_ratio: number;
  result: string;
  setup_name: string;
  market_condition: string;
  timeframe: string;
  emotion_before: string;
  notes: string;
  created_at: string;
}

export interface BacktestDashboard {
  session: BacktestSession;
  overview: {
    total: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: number;
    avg_pnl: number;
    profit_factor: number;
    max_drawdown: number;
  };
  equity_curve: { date: string; pnl: number; cumulative: number; drawdown: number }[];
  bySymbol: { symbol: string; cnt: number; pnl: number; wr: number }[];
  byDirection: { direction: string; cnt: number; pnl: number; wr: number }[];
  bySetup: { setup_name: string; cnt: number; pnl: number; wr: number }[];
  recent: BacktestEntry[];
}

export interface EconomicEvent {
  id: string;
  date: string;
  currency: string;
  event: string;
  impact: "high" | "medium" | "low";
  forecast: string;
  previous: string;
  actual: string;
  created_at: string;
}
