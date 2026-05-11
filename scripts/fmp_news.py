"""
Financial Modeling Prep (FMP) Economic Calendar Fetcher

Usage:
    python scripts/fmp_news.py --api-key YOUR_KEY [--days 7] [--api-url http://localhost:3000]

Fetches economic events from FMP and POSTs them to the Express API.
"""

import argparse
import json
import sys
import requests
from datetime import datetime, timedelta

FMP_BASE = "https://financialmodelingprep.com/api/v3"

def fetch_economic_calendar(api_key: str, days: int = 7) -> list[dict]:
    """Fetch economic calendar events from FMP."""
    from_date = datetime.now().strftime("%Y-%m-%d")
    to_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

    url = f"{FMP_BASE}/economic_calendar"
    params = {"from": from_date, "to": to_date, "apikey": api_key}

    print(f"[FMP] Fetching economic calendar {from_date} → {to_date}...")
    resp = requests.get(url, params=params, timeout=30)

    if resp.status_code != 200:
        print(f"[FMP] ERROR: HTTP {resp.status_code} — {resp.text[:200]}")
        sys.exit(1)

    data = resp.json()
    if not isinstance(data, list):
        print(f"[FMP] Unexpected response format: {type(data).__name__}")
        return []

    print(f"[FMP] Got {len(data)} events")
    return data


def parse_event(raw: dict) -> dict:
    """Convert FMP event format to our economic_events schema."""

    impact_map = {
        "High": "high",
        "Medium": "medium",
        "Low": "low",
        "": "medium",
    }

    impact = impact_map.get(raw.get("impact", ""), "medium")
    date_str = raw.get("date", "")

    return {
        "date": date_str[:10] if date_str else "",
        "currency": raw.get("country", "").upper() or "USD",
        "event": raw.get("event", raw.get("indicator", "Unknown event")),
        "impact": impact,
        "forecast": raw.get("forecast", ""),
        "previous": raw.get("previous", ""),
        "actual": raw.get("actual", ""),
    }


def push_to_api(events: list[dict], api_base: str, dry_run: bool = False):
    """POST each event to Express API."""
    if dry_run:
        print(f"\n[DRY RUN] Would push {len(events)} events to {api_base}/api/economic_events")
        for e in events[:3]:
            print(f"  {e['date']} | {e['currency']:4s} | {e['impact']:6s} | {e['event'][:50]}")
        if len(events) > 3:
            print(f"  ... and {len(events) - 3} more")
        return

    pushed = 0
    skipped = 0
    for i, event in enumerate(events):
        try:
            resp = requests.post(
                f"{api_base}/api/economic_events",
                json=event,
                timeout=10,
            )
            if resp.status_code == 200 or resp.status_code == 201:
                pushed += 1
            else:
                print(f"  [{i+1}] SKIP {event.get('event','')[:40]} — HTTP {resp.status_code}")
                skipped += 1
        except requests.RequestException as e:
            print(f"  [{i+1}] FAIL {event.get('event','')[:40]} — {e}")
            skipped += 1

    print(f"\n[FMP] Done: {pushed} pushed, {skipped} skipped")


def main():
    parser = argparse.ArgumentParser(description="Fetch economic calendar from FMP")
    parser.add_argument("--api-key", required=True, help="Financial Modeling Prep API key")
    parser.add_argument("--days", type=int, default=7, help="Days to fetch (default: 7)")
    parser.add_argument("--api-url", default="http://localhost:3000", help="Express API base URL")
    parser.add_argument("--dry-run", action="store_true", help="Print events without posting")
    parser.add_argument("--no-post", action="store_true", help="Output JSON to stdout only")
    args = parser.parse_args()

    raw_events = fetch_economic_calendar(args.api_key, args.days)
    parsed = [parse_event(e) for e in raw_events]
    parsed = [e for e in parsed if e.get("event")]

    if args.no_post:
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
        return

    push_to_api(parsed, args.api_url, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
