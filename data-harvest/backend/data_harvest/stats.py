"""
Stats CLI — see what data you've collected so far.

Usage:
    python -m app.data_harvest.stats
    python -m app.data_harvest.stats --detailed
"""
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    pd = None

from .harvester import HarvestConfig


def humanize_size(bytes_count: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_count < 1024:
            return f"{bytes_count:.1f} {unit}"
        bytes_count /= 1024
    return f"{bytes_count:.1f} TB"


def count_files(directory: Path) -> tuple[int, int]:
    """Returns (file_count, total_bytes)."""
    if not directory.exists():
        return 0, 0
    total_size = 0
    file_count = 0
    for f in directory.rglob("*"):
        if f.is_file():
            file_count += 1
            total_size += f.stat().st_size
    return file_count, total_size


def show_stats(detailed: bool = False) -> None:
    print()
    print("╔════════════════════════════════════════════════════════════╗")
    print("║          LUXE CAPITAL · Data Lake Statistics              ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print()
    print(f"📂 Base: {HarvestConfig.BASE_DIR}")
    print()

    if not HarvestConfig.BASE_DIR.exists():
        print("⚠️  No data lake yet. Run the app first.")
        return

    sections = [
        ("📊 Raw Financials",  HarvestConfig.RAW_FINANCIALS),
        ("📈 Analyses",         HarvestConfig.ANALYSES),
        ("🤖 AI Reports",       HarvestConfig.AI_REPORTS),
        ("💰 Price Snapshots", HarvestConfig.PRICE_SNAPS),
        ("👤 Interactions",    HarvestConfig.INTERACTIONS),
    ]

    total_files = 0
    total_size = 0
    for label, path in sections:
        files, size = count_files(path)
        total_files += files
        total_size += size
        print(f"  {label:.<35}  {files:>5} files   {humanize_size(size):>10}")

    print(f"  {'─' * 60}")
    print(f"  {'TOTAL':.<35}  {total_files:>5} files   {humanize_size(total_size):>10}")
    print()

    # Detailed breakdown
    if not detailed:
        print("💡 Run with --detailed for symbol breakdown")
        return

    print()
    print("🔍 DETAILED BREAKDOWN")
    print()

    # AI reports — by symbol + model
    if HarvestConfig.AI_REPORTS.exists():
        print("─── AI Reports ──────────────────────────────────────────────")
        symbols = Counter()
        models = Counter()
        total = 0
        for jsonl in HarvestConfig.AI_REPORTS.glob("ai_reports_*.jsonl"):
            with open(jsonl) as f:
                for line in f:
                    import json as _json
                    try:
                        rec = _json.loads(line)
                        symbols[rec.get("symbol", "?")] += 1
                        models[rec.get("model", "?")] += 1
                        total += 1
                    except Exception:
                        pass
        print(f"  Total reports: {total}")
        print(f"  By symbol (top 10):")
        for sym, cnt in symbols.most_common(10):
            print(f"    {sym:<8} {cnt:>4}")
        print(f"  By model:")
        for model, cnt in models.most_common():
            print(f"    {model:<25} {cnt:>4}")
        print()

    # Analyses
    if pd and HarvestConfig.ANALYSES.exists():
        print("─── Analyses ────────────────────────────────────────────────")
        files = list(HarvestConfig.ANALYSES.glob("analyses_*.parquet"))
        if files:
            df = pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)
            print(f"  Total analyses: {len(df)}")
            print(f"  Unique symbols: {df['symbol'].nunique()}")
            print(f"  Date range: {df['analyzed_at'].min()} → {df['analyzed_at'].max()}")
            print(f"  Avg ROE: {df['roe'].mean():.2f}%")
            print(f"  Avg P/E: {df['pe'].mean():.2f}")
            print()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--detailed", action="store_true", help="Show breakdown")
    args = parser.parse_args()
    show_stats(detailed=args.detailed)


if __name__ == "__main__":
    main()
