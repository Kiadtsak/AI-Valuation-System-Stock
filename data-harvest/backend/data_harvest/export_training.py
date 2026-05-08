"""
Training data exporter — prepares harvested data for local LLM fine-tuning.

Use cases:
1. Fine-tune Llama 3 / Qwen / Mistral locally with `unsloth` or `axolotl`
2. Build RAG vector store from raw financials
3. Train a smaller "analyst" model that mimics your AI reports

Usage:
    python -m app.data_harvest.export_training --format alpaca --out training.jsonl
    python -m app.data_harvest.export_training --format openai --out openai.jsonl
    python -m app.data_harvest.export_training --format raw-pairs --out pairs.parquet
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Iterator, Optional

try:
    import pandas as pd
except ImportError:
    pd = None

from .harvester import HarvestConfig


def iter_ai_reports(min_date: Optional[str] = None) -> Iterator[dict]:
    """Iterate through all collected AI reports."""
    if not HarvestConfig.AI_REPORTS.exists():
        return

    for jsonl in sorted(HarvestConfig.AI_REPORTS.glob("ai_reports_*.jsonl")):
        with open(jsonl, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    record = json.loads(line)
                    if min_date and record.get("timestamp", "") < min_date:
                        continue
                    yield record
                except json.JSONDecodeError:
                    continue


def to_alpaca_format(record: dict) -> dict:
    """Convert to Alpaca/Llama-Factory format."""
    msgs = record.get("messages", [])
    if len(msgs) < 3:
        return None

    system_msg = next((m["content"] for m in msgs if m["role"] == "system"), "")
    user_msg = next((m["content"] for m in msgs if m["role"] == "user"), "")
    asst_msg = next((m["content"] for m in msgs if m["role"] == "assistant"), "")

    if not user_msg or not asst_msg:
        return None

    return {
        "instruction": system_msg or "Analyze this stock as a senior equity analyst.",
        "input": user_msg,
        "output": asst_msg,
        "meta": {
            "symbol": record.get("symbol"),
            "model": record.get("model"),
            "timestamp": record.get("timestamp"),
        },
    }


def to_openai_format(record: dict) -> dict:
    """OpenAI fine-tuning format (ChatML)."""
    msgs = record.get("messages", [])
    if len(msgs) < 2:
        return None
    return {"messages": msgs}


def to_sharegpt_format(record: dict) -> dict:
    """ShareGPT format (used by many open models)."""
    msgs = record.get("messages", [])
    role_map = {"system": "system", "user": "human", "assistant": "gpt"}
    return {
        "conversations": [
            {"from": role_map.get(m["role"], m["role"]), "value": m["content"]}
            for m in msgs
        ]
    }


def export_jsonl(format_type: str, output_path: Path, min_date: Optional[str] = None,
                 min_quality: int = 0) -> int:
    """Export to JSONL. Returns number of records written."""
    converter = {
        "alpaca":   to_alpaca_format,
        "openai":   to_openai_format,
        "sharegpt": to_sharegpt_format,
    }.get(format_type)

    if not converter:
        raise ValueError(f"Unknown format: {format_type}")

    count = 0
    with open(output_path, "w", encoding="utf-8") as f:
        for record in iter_ai_reports(min_date=min_date):
            converted = converter(record)
            if converted:
                f.write(json.dumps(converted, ensure_ascii=False) + "\n")
                count += 1

    return count


def export_feature_dataset(output_path: Path) -> int:
    """
    Export structured feature dataset for tabular ML.
    Combines analyses + price snapshots into one big parquet.
    """
    if pd is None:
        raise RuntimeError("pandas required for feature export")

    analysis_files = list(HarvestConfig.ANALYSES.glob("analyses_*.parquet"))
    if not analysis_files:
        print("No analyses found.")
        return 0

    df_list = [pd.read_parquet(f) for f in analysis_files]
    df = pd.concat(df_list, ignore_index=True)

    # Merge price snapshots if available
    price_files = list(HarvestConfig.PRICE_SNAPS.glob("prices_*.parquet"))
    if price_files:
        df_prices = pd.concat([pd.read_parquet(f) for f in price_files], ignore_index=True)
        df_prices = df_prices.rename(columns={"price": "snapshot_close"})
        # Match on symbol + nearest timestamp
        df["analyzed_at"] = pd.to_datetime(df["analyzed_at"])
        df_prices["snapshot_at"] = pd.to_datetime(df_prices["snapshot_at"])
        df = pd.merge_asof(
            df.sort_values("analyzed_at"),
            df_prices.sort_values("snapshot_at"),
            left_on="analyzed_at",
            right_on="snapshot_at",
            by="symbol",
            direction="nearest",
            tolerance=pd.Timedelta("1 hour"),
        )

    df.to_parquet(output_path, compression="snappy")
    return len(df)


def main():
    parser = argparse.ArgumentParser(description="Export Luxe Capital training data")
    parser.add_argument(
        "--format", required=True,
        choices=["alpaca", "openai", "sharegpt", "features"],
        help="Output format",
    )
    parser.add_argument("--out", required=True, help="Output file path")
    parser.add_argument("--min-date", help="Only include records after YYYY-MM-DD")

    args = parser.parse_args()
    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"📊 Exporting from {HarvestConfig.BASE_DIR}")
    print(f"📦 Format: {args.format}")
    print(f"📝 Output: {output_path}")
    print()

    if args.format == "features":
        count = export_feature_dataset(output_path)
        print(f"✅ Exported {count} feature rows → {output_path}")
    else:
        count = export_jsonl(args.format, output_path, min_date=args.min_date)
        print(f"✅ Exported {count} training examples → {output_path}")


if __name__ == "__main__":
    main()
