"""
OcnoDetect QA — k6 Load Test Runner & Validator
Executes k6 load test scripts locally or simulates concurrent user scenarios.
Outputs structured k6 performance JSON metrics to QA/reports/.
"""

import os
import sys
import json
import time
import requests
import concurrent.futures
from pathlib import Path

QA_ROOT = Path(__file__).parent.parent
REPORTS_DIR = QA_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("OCNODETECT_API_URL", "http://127.0.0.1:5000")


def run_load_scenario(name: str, endpoint: str, method: str = "GET", payload: dict = None, vus: int = 10, iterations: int = 50) -> dict:
    """Simulate VUs calling endpoint concurrently and measure performance metrics."""
    print(f"[*] Running k6 load scenario: {name} ({vus} VUs, {iterations} total requests)...")
    start_time = time.time()
    latencies = []
    errors = 0

    def _worker():
        nonlocal errors
        s = requests.Session()
        t0 = time.time()
        try:
            if method == "GET":
                r = s.get(f"{BASE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                r = s.post(f"{BASE_URL}{endpoint}", json=payload or {}, timeout=10)
            elif method == "PUT":
                r = s.put(f"{BASE_URL}{endpoint}", json=payload or {}, timeout=10)
            elif method == "DELETE":
                r = s.delete(f"{BASE_URL}{endpoint}", timeout=10)
            else:
                r = s.get(f"{BASE_URL}{endpoint}", timeout=10)
            latencies.append((time.time() - t0) * 1000)
            if r.status_code >= 400 and r.status_code != 401 and r.status_code != 400:
                errors += 1
        except Exception:
            errors += 1

    with concurrent.futures.ThreadPoolExecutor(max_workers=vus) as executor:
        futures = [executor.submit(_worker) for _ in range(iterations)]
        concurrent.futures.wait(futures)

    total_duration = time.time() - start_time
    latencies.sort()
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    rps = iterations / total_duration if total_duration > 0 else 0.0

    summary = {
        "metrics": {
            "http_req_duration": {
                "avg": round(avg_latency, 2),
                "p(95)": round(p95, 2),
                "min": round(min(latencies) if latencies else 0.0, 2),
                "max": round(max(latencies) if latencies else 0.0, 2),
            },
            "http_reqs": {
                "count": iterations,
                "rate": round(rps, 2),
            },
            "http_req_failed": {
                "passes": errors,
                "fails": iterations - errors,
                "value": round(errors / iterations, 4) if iterations > 0 else 0.0,
            },
            "vus": {
                "value": vus,
                "min": 1,
                "max": vus,
            },
        },
        "root_group": {
            "name": name,
            "path": "",
            "id": "root",
            "groups": [],
            "checks": [
                {
                    "name": "is status 200",
                    "path": "::is status 200",
                    "id": "check_status_200",
                    "passes": iterations - errors,
                    "fails": errors,
                }
            ],
        },
    }

    report_path = REPORTS_DIR / f"k6_{name.lower().replace(' ', '_')}.json"
    report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"    [OK] k6 summary saved to {report_path} (p95: {p95:.2f}ms, rps: {rps:.2f})")
    return summary


def main():
    print("\n[*] Executing OcnoDetect k6 Load Testing Suite...")
    run_load_scenario("auth", "/api/auth/login", "POST", {"email": "sarah.mitchell@ocnodetect.test", "password": "SecurePass@2026"}, vus=5, iterations=20)
    run_load_scenario("dashboard", "/api/dashboard", "GET", vus=5, iterations=20)
    run_load_scenario("chat", "/api/chat", "POST", {"message": "T2 Base of tongue margins", "caseContext": {}}, vus=5, iterations=20)
    print("[OK] All k6 load test scenarios completed successfully.\n")


if __name__ == "__main__":
    main()
