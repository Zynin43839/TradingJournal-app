"""
Free Economic Calendar Fetcher — no API key required.

Uses ecocal (FXStreet data) under the hood.

Usage:
    python scripts/news_free.py [--days 7] [--api-url http://localhost:3000]
    python scripts/news_free.py --today
    python scripts/news_free.py --symbols XAUUSD,EURUSD
    python scripts/news_free.py --today --symbols XAUUSD --dry-run
    python scripts/news_free.py --dry-run
    python scripts/news_free.py --no-post
"""

import argparse
import json
import sys
from datetime import datetime, timedelta

IMPACT_MAP = {"HIGH": "high", "MEDIUM": "medium", "LOW": "low"}

BKK_OFFSET = timedelta(hours=7)

SYMBOL_CURRENCY_MAP = {
    "XAUUSD": ["USD"],
    "XAGUSD": ["USD"],
    "EURUSD": ["EUR", "USD"],
    "GBPUSD": ["GBP", "USD"],
    "USDJPY": ["USD", "JPY"],
    "AUDUSD": ["AUD", "USD"],
    "NAS100": ["USD"],
    "US30": ["USD"],
    "SP500": ["USD"],
    "BTCUSD": ["USD"],
    "ETHUSD": ["USD"],
    "EURJPY": ["EUR", "JPY"],
    "GBPJPY": ["GBP", "JPY"],
    "CHFJPY": ["CHF", "JPY"],
    "EURGBP": ["EUR", "GBP"],
    "XTIUSD": ["USD"],
    "XNGUSD": ["USD"],
}

# Inverse: currency → list of trading symbols affected
CURRENCY_SYMBOLS_MAP: dict[str, list[str]] = {}
for sym, currencies in SYMBOL_CURRENCY_MAP.items():
    for c in currencies:
        CURRENCY_SYMBOLS_MAP.setdefault(c, []).append(sym)


def _now_bkk() -> datetime:
    return datetime.utcnow() + BKK_OFFSET


def _parse_utc(val) -> datetime | None:
    """Parse a UTC datetime from string or datetime object."""
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00").split("+")[0])
        except (ValueError, TypeError):
            return None
    return None


def _to_bkk(dt_utc) -> tuple[str, str]:
    """Convert UTC time → (time_bkk, datetime_bkk) strings."""
    dt = _parse_utc(dt_utc)
    if dt is None:
        return "", ""
    bkk = dt + BKK_OFFSET
    return bkk.strftime("%H:%M"), bkk.strftime("%Y-%m-%d %H:%M ICT")


def fetch_events(days_ahead: int = 7, today_only: bool = False, symbols: list[str] | None = None, no_post: bool = False) -> list[dict]:
    """Fetch economic calendar events via ecocal (free, no API key)."""
    def _log(msg: str):
        (print if not no_post else lambda m: print(m, file=sys.stderr))(msg)

    try:
        from ecocal import Calendar
    except ImportError:
        print("[FREE] ERROR: ecocal not installed. Run: pip install ecocal", file=sys.stderr)
        sys.exit(1)

    now = datetime.utcnow()
    now_bkk = _now_bkk()

    if today_only:
        start = now
        end = now + timedelta(days=1)
        _log(f"[FREE] Fetching events for today ({now_bkk.date()} Bangkok time)...")
    else:
        end = now + timedelta(days=days_ahead)
        _log(f"[FREE] Fetching events {now.date()} → {end.date()}...")

    try:
        cal = Calendar(
            startHorizon=start if today_only else now,
            endHorizon=end,
            preBuildCalendar=True,
            withDetails=True,
            withProgressBar=False,
        )
        df = cal.getCalendar(withDetails=True)
    except Exception as e:
        print(f"[FREE] ecocal fetch failed: {e}", file=sys.stderr)
        sys.exit(1)

    if df is None or len(df) == 0:
        _log("[FREE] No events found")
        return []

    filter_currencies: set[str] | None = None
    if symbols:
        filter_currencies = set()
        for sym in symbols:
            s = sym.upper().strip()
            if s in SYMBOL_CURRENCY_MAP:
                filter_currencies.update(SYMBOL_CURRENCY_MAP[s])
            else:
                print(f"[FREE] Warning: unknown symbol '{sym}', ignoring", file=sys.stderr)

    def _safe(val, default=""):
        if val is None:
            return default
        if isinstance(val, float) and (val != val):
            return default
        return str(val)

    today_bkk_str = now_bkk.strftime("%Y-%m-%d")

    results = []
    for _, row in df.iterrows():
        impact_raw = _safe(row.get("Impact")).upper()
        impact = IMPACT_MAP.get(impact_raw, "medium")

        date_utc = row.get("dateUtc")
        time_bkk, datetime_bkk = _to_bkk(date_utc)

        event_name = _safe(row.get("Name"))
        if not event_name:
            continue

        currency = _safe(row.get("currencyCode")) or _safe(row.get("Currency"))
        if not currency:
            currency = _safe(row.get("countryCode"))
        currency = currency.upper() or "USD"

        if today_only and datetime_bkk:
            if datetime_bkk[:10] != today_bkk_str:
                continue

        if filter_currencies and currency not in filter_currencies:
            continue

        symbols = CURRENCY_SYMBOLS_MAP.get(currency, [currency])

        results.append({
            "date": datetime_bkk[:10] if datetime_bkk else (_safe(date_utc)[:10] or datetime.utcnow().strftime("%Y-%m-%d")),
            "time_bkk": time_bkk,
            "datetime_bkk": datetime_bkk,
            "currency": currency,
            "symbols": ",".join(symbols),
            "event": event_name,
            "impact": impact,
            "forecast": _safe(row.get("consensus")),
            "previous": _safe(row.get("previous")),
            "actual": _safe(row.get("actual")),
        })

    _log(f"[FREE] Got {len(results)} events")
    return results


def push_to_api(events: list[dict], api_base: str, dry_run: bool = False):
    """POST each event to Express API."""
    if dry_run:
        print(f"\n[DRY RUN] Would push {len(events)} events to {api_base}/api/economic_events")
        high = [e for e in events if e["impact"] == "high"]
        med = [e for e in events if e["impact"] == "medium"]
        low = [e for e in events if e["impact"] == "low"]
        print(f"  High: {len(high)} | Medium: {len(med)} | Low: {len(low)}")
        for e in events[:5]:
            t = e.get("time_bkk", "")
            print(f"  {e['date']} {t:>5s} | {e['currency']:4s} | {e['impact']:6s} | {e['event'][:50]}")
        if len(events) > 5:
            print(f"  ... and {len(events) - 5} more")
        return

    import requests
    pushed = 0
    skipped = 0
    for i, event in enumerate(events):
        try:
            resp = requests.post(f"{api_base}/api/economic_events", json=event, timeout=10)
            if resp.status_code in (200, 201):
                pushed += 1
            else:
                print(f"  [{i+1}] SKIP {event.get('event','')[:40]} — HTTP {resp.status_code}")
                skipped += 1
        except requests.RequestException as e:
            print(f"  [{i+1}] FAIL {event.get('event','')[:40]} — {e}")
            skipped += 1

    print(f"\n[FREE] Done: {pushed} pushed, {skipped} skipped")


def _log(msg: str, no_post: bool = False):
    """Print to stderr when no_post is set (keeps stdout clean for JSON)."""
    if no_post:
        print(msg, file=sys.stderr)
    else:
        print(msg)


def main():
    parser = argparse.ArgumentParser(description="Free economic calendar fetcher (no API key)")
    parser.add_argument("--days", type=int, default=7, help="Days ahead to fetch (default: 7)")
    parser.add_argument("--today", action="store_true", help="Only today's events in Bangkok timezone")
    parser.add_argument("--symbols", type=str, default="", help="Comma-separated trading symbols to filter (e.g. XAUUSD,EURUSD)")
    parser.add_argument("--api-url", default="http://localhost:3000", help="Express API base URL")
    parser.add_argument("--dry-run", action="store_true", help="Preview events without posting")
    parser.add_argument("--no-post", action="store_true", help="Output JSON to stdout only")
    args = parser.parse_args()

    no_post = args.no_post
    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()] if args.symbols else None
    if symbols:
        _log(f"[FREE] Filtering symbols: {', '.join(symbols)}", no_post)

    events = fetch_events(args.days, today_only=args.today, symbols=symbols, no_post=no_post)

    if not events:
        _log("[FREE] No events to push", no_post)
        return

    if args.no_post:
        print(json.dumps(events, indent=2, ensure_ascii=False))
        return

    push_to_api(events, args.api_url, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
