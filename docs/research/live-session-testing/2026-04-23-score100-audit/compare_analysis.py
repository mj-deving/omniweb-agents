#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path


def flatten_numeric(prefix, value, out):
    if isinstance(value, dict):
        for key, child in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else key
            flatten_numeric(child_prefix, child, out)
        return
    if isinstance(value, list):
        return
    if isinstance(value, bool):
        return
    if isinstance(value, (int, float)):
        out[prefix] = float(value)


def load_json(path: Path):
    return json.loads(path.read_text())


def rel_delta(baseline: float, current: float):
    if baseline == current:
        return 0.0
    if baseline == 0:
        return math.inf
    return abs(current - baseline) / abs(baseline)


def build_metric_map(payload):
    metrics = {}
    for key in ("cohort_size", "score_100_size"):
        if key in payload:
            metrics[key] = float(payload[key])
    for key in ("overall", "score_100_only", "by_category_ge90"):
        if key in payload:
            flatten_numeric(key, payload[key], metrics)
    return metrics


def main():
    parser = argparse.ArgumentParser(description="Compare score-100 audit analysis outputs against a tracked baseline.")
    parser.add_argument("--baseline", required=True, help="Path to the tracked baseline analysis JSON.")
    parser.add_argument("--current", required=True, help="Path to the newly generated analysis JSON.")
    parser.add_argument("--threshold", type=float, default=0.20, help="Relative drift threshold, default 0.20.")
    parser.add_argument("--out", help="Optional JSON report output path.")
    args = parser.parse_args()

    baseline_payload = load_json(Path(args.baseline))
    current_payload = load_json(Path(args.current))

    baseline_metrics = build_metric_map(baseline_payload)
    current_metrics = build_metric_map(current_payload)

    compared = []
    exceeded = []

    for key in sorted(set(baseline_metrics) & set(current_metrics)):
        baseline = baseline_metrics[key]
        current = current_metrics[key]
        drift = rel_delta(baseline, current)
        entry = {
            "metric": key,
            "baseline": baseline,
            "current": current,
            "relative_drift": drift,
            "threshold_exceeded": drift > args.threshold,
        }
        compared.append(entry)
        if entry["threshold_exceeded"]:
            exceeded.append(entry)

    report = {
        "baseline_path": str(Path(args.baseline).resolve()),
        "current_path": str(Path(args.current).resolve()),
        "threshold": args.threshold,
        "metrics_compared": len(compared),
        "threshold_exceeded_count": len(exceeded),
        "threshold_exceeded": exceeded,
    }

    rendered = json.dumps(report, indent=2, sort_keys=True)
    if args.out:
        Path(args.out).write_text(rendered + "\n")
    print(rendered)

    raise SystemExit(2 if exceeded else 0)


if __name__ == "__main__":
    main()
