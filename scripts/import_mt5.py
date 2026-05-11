"""
MT5 Closed Orders Importer

Connects to MetaTrader 5 locally, fetches last N months of closed orders (deals),
and outputs as CSV or POSTs to the Express API.

Usage:
    # Output as CSV
    python scripts/import_mt5.py --months 3 --output trades.csv

    # POST to API (requires running server)
    python scripts/import_mt5.py --months 3 --api-url http://localhost:3000

    # Dry run (print only)
    python scripts/import_mt5.py --months 3 --dry-run
"""

import argparse
import csv
import sys
from datetime import datetime, timedelta
from typing import Any

import MetaTrader5 as mt5

# ── Mapping: MT5 deal fields → our trading_logs schema ──
FIELD_MAP = {
    "symbol": "symbol",
    "side": "side",       # 0=Buy, 1=Sell → "Buy"/"Sell"
    "volume": "lot_size", # in lots, e.g. 0.01
    "price_open": "entry_price",
    "price_close": "exit_price",
    "profit": "pnl",
    "time_setup": None,   # we'll keep raw timestamp
    "time_done": None,
    "comment": "pre_trade_notes",
    "swap": None,         # not stored currently
    "commission": None,
    "magic": None,
}


def ensure_mt5_running() -> bool:
    """Initialize MT5 terminal. Returns True if successful."""
    if not mt5.initialize():
        print(f"[MT5] initialize() failed: {mt5.last_error()}", file=sys.stderr)
        return False
    print(f"[MT5] Terminal info: {mt5.terminal_info()._asdict().get('name', '?')}")
    print(f"[MT5] Account: {mt5.account_info()._asdict().get('login', '?')}")
    return True


def fetch_deals(months: int = 3) -> list[dict[str, Any]]:
    """Fetch all closed deals (orders) from the last N months."""
    now = datetime.now()
    from_date = now - timedelta(days=months * 30)

    print(f"[MT5] Fetching deals from {from_date.date()} to {now.date()}...")

    # Get history
    history = mt5.history_deals_get(from_date, now)
    if history is None:
        print(f"[MT5] No deals found or error: {mt5.last_error()}", file=sys.stderr)
        return []

    print(f"[MT5] Got {len(history)} total deal records")
    return [deal._asdict() for deal in history]


def filter_closed_orders(deals: list[dict]) -> list[dict]:
    """Filter only real closed trades (skip deposits/withdrawals/corrections)."""
    filtered = []
    for d in deals:
        # MT5 entry=0 means entry order, entry=1 means exit order
        # We want exit orders (entry=1) with non-zero profit, or any that have both entry/exit
        # Actually: position_id identifies a position. We get both open and close deals.
        # entry=0 → position open, entry=1 → position close
        if d.get("entry") == 1:
            filtered.append(d)
    print(f"[MT5] Filtered to {len(filtered)} closed trades (entry=1)")
    return filtered


def convert_trade(deal: dict) -> dict | None:
    """Convert MT5 deal dict to our trading_logs format."""
    symbol = deal.get("symbol", "")
    side_deal = deal.get("type")  # 0=Buy, 1=Sell

    # Skip non-currency symbols if desired, but keep all for now
    side = "Buy" if side_deal == 0 else "Sell"

    # Convert volume: MT5 volume is in lots (100000 units)
    volume = deal.get("volume", 0.0)
    # MT5 volume is integer representing lots * 10000 (for forex)
    # Actually: mt5 volume type is double - standard lot = 1.0
    # We use as-is (0.01 = mini lot)

    pnl = deal.get("profit", 0.0)

    time_close = deal.get("time_done")
    time_open = deal.get("time_setup")

    date_str = ""
    if time_close:
        if isinstance(time_close, datetime):
            date_str = time_close.strftime("%Y-%m-%d")
        else:
            date_str = str(time_close)[:10]

    # For result, compute later based on pnl
    return {
        "date": date_str,
        "symbol": symbol,
        "side": side,
        "entry_price": float(deal.get("price_open", 0)),
        "exit_price": float(deal.get("price_close", 0)),
        "pnl": round(float(pnl), 2),
        "lot_size": round(float(volume), 2),
        "result": "Win" if pnl > 0 else "Loss" if pnl < 0 else "BE",
        "emotion_before": "",
        "setup_name": deal.get("comment", "")[:40] or "",
        "pre_trade_notes": f"MT5 deal #{deal.get('deal', '')} | position #{deal.get('position_id', '')}",
        "post_trade_notes": "",
        "lessons_learned": "",
    }


def write_csv(trades: list[dict], path: str):
    """Write trades to CSV file."""
    if not trades:
        print("[MT5] No trades to write")
        return

    fields = ["date", "symbol", "side", "entry_price", "exit_price", "pnl", "lot_size", "result", "setup_name"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for t in trades:
            writer.writerow({k: t.get(k, "") for k in fields})

    print(f"[MT5] Written {len(trades)} trades to {path}")


def push_to_api(trades: list[dict], api_base: str, dry_run: bool):
    """POST trades to Express API."""
    if dry_run:
        print(f"\n[DRY RUN] Would push {len(trades)} trades to {api_base}/api/trading_logs")
        for t in trades[:5]:
            print(f"  {t['date']} | {t['symbol']:8s} | {t['side']:4s} | entry={t['entry_price']} exit={t['exit_price']} | ${t['pnl']}")
        if len(trades) > 5:
            print(f"  ... and {len(trades) - 5} more")
        return

    import requests
    pushed = 0
    failed = 0
    for i, trade in enumerate(trades):
        try:
            resp = requests.post(f"{api_base}/api/trading_logs", json=trade, timeout=10)
            if resp.status_code in (200, 201):
                pushed += 1
            else:
                print(f"  [{i+1}] FAIL {trade['symbol']} — HTTP {resp.status_code}")
                failed += 1
        except requests.RequestException as e:
            print(f"  [{i+1}] FAIL {trade['symbol']} — {e}")
            failed += 1

    print(f"\n[MT5] Done: {pushed} pushed, {failed} failed")


def main():
    parser = argparse.ArgumentParser(description="Import MT5 closed orders")
    parser.add_argument("--months", type=int, default=3, help="Months of history to fetch (default: 3)")
    parser.add_argument("--output", help="Output CSV file path (e.g. trades.csv)")
    parser.add_argument("--api-url", help="Express API base URL for auto-posting (e.g. http://localhost:3000)")
    parser.add_argument("--dry-run", action="store_true", help="Print trades without saving")
    args = parser.parse_args()

    if not ensure_mt5_running():
        sys.exit(1)

    raw_deals = fetch_deals(args.months)
    closed = filter_closed_orders(raw_deals)

    trades = [convert_trade(d) for d in closed]
    trades = [t for t in trades if t]

    print(f"\n[MT5] Converted {len(trades)} closed trades")

    # Summarize
    total_pnl = sum(t["pnl"] for t in trades)
    wins = sum(1 for t in trades if t["result"] == "Win")
    losses = sum(1 for t in trades if t["result"] == "Loss")
    print(f"  PnL: ${total_pnl:.2f} | Wins: {wins} | Losses: {losses}")

    if args.output:
        write_csv(trades, args.output)
    elif args.api_url:
        push_to_api(trades, args.api_url, args.dry_run)
    elif args.dry_run:
        push_to_api(trades, "http://localhost:3000", dry_run=True)
    else:
        print("\n[MT5] No output method specified. Use --output, --api-url, or --dry-run.")
        # Print first 5 as preview
        print("\nPreview (first 5 trades):")
        push_to_api(trades, "http://localhost:3000", dry_run=True)

    mt5.shutdown()


if __name__ == "__main__":
    main()
