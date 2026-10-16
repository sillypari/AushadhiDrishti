"""
AushadhiDrishti - API Benchmarking & Latency Diagnostics Utility
---------------------------------------------------------------
Independent testing tool to measure endpoint response latency, 
availability, and payload round-trips for development and hackathon evaluations.

Usage:
    python benchmark_api.py [--host http://localhost:8000] [--runs 5]
"""

import sys
import time
import json
import argparse
import urllib.request
import urllib.error
from typing import Dict, Any, List


def check_endpoint_latency(url: str, timeout: float = 5.0) -> Dict[str, Any]:
    """Measures single endpoint round-trip latency and returns status."""
    start_time = time.perf_counter()
    status_code = None
    error_msg = None
    response_size = 0

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AushadhiDrishti-Benchmark/1.0"}
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.getcode()
            content = response.read()
            response_size = len(content)
    except urllib.error.HTTPError as e:
        status_code = e.code
        error_msg = f"HTTP {e.code}"
    except urllib.error.URLError as e:
        status_code = 0
        error_msg = f"Connection failed: {e.reason}"
    except Exception as e:
        status_code = -1
        error_msg = str(e)

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "url": url,
        "status": status_code,
        "latency_ms": round(elapsed_ms, 2),
        "size_bytes": response_size,
        "error": error_msg,
    }


def run_benchmark(base_url: str, runs: int = 5) -> None:
    """Executes latency benchmark against core API endpoints."""
    base_url = base_url.rstrip("/")
    endpoints = [
        "/",
        "/api/health",
        "/static/css/style.css",
        "/static/js/app.js",
    ]

    print("=" * 65)
    print(f"  AushadhiDrishti API Performance Diagnostics")
    print(f"  Target: {base_url} | Samples per endpoint: {runs}")
    print("=" * 65)

    all_results: Dict[str, List[float]] = {ep: [] for ep in endpoints}

    for ep in endpoints:
        target = f"{base_url}{ep}"
        print(f"\n[+] Testing {ep} ...")
        for i in range(1, runs + 1):
            res = check_endpoint_latency(target)
            if res["status"] == 200:
                all_results[ep].append(res["latency_ms"])
                print(f"    Sample {i}: {res['latency_ms']} ms ({res['size_bytes']} bytes)")
            else:
                print(f"    Sample {i}: FAILED ({res['error'] or res['status']})")
            time.sleep(0.05)

    print("\n" + "-" * 65)
    print(f"{'Endpoint':<28} | {'Min (ms)':<10} | {'Avg (ms)':<10} | {'Max (ms)':<10}")
    print("-" * 65)

    for ep, latencies in all_results.items():
        if latencies:
            min_l = min(latencies)
            avg_l = sum(latencies) / len(latencies)
            max_l = max(latencies)
            print(f"{ep:<28} | {min_l:<10.2f} | {avg_l:<10.2f} | {max_l:<10.2f}")
        else:
            print(f"{ep:<28} | {'N/A':<10} | {'UNREACHABLE':<10} | {'N/A':<10}")

    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AushadhiDrishti API Latency Benchmark")
    parser.add_argument(
        "--host",
        default="http://localhost:8000",
        help="Base server URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=5,
        help="Number of latency probe iterations (default: 5)"
    )
    args = parser.parse_args()

    run_benchmark(args.host, runs=args.runs)
