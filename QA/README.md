# OcnoDetect QA Automation Framework

## Overview
This directory contains the complete QA automation framework for the **OcnoDetect Clinical AI Oncology Platform**.

---

## Framework Structure

```
QA/
├── selenium/          # Web UI tests (300 tests) — Selenium WebDriver + pytest
│   ├── conftest.py
│   ├── requirements.txt
│   └── tests/
│       ├── test_auth.py          # OCN-SE-001 → OCN-SE-050  (Auth)
│       ├── test_dashboard.py     # OCN-SE-051 → OCN-SE-100  (Dashboard)
│       ├── test_scan.py          # OCN-SE-101 → OCN-SE-150  (Scan/Upload)
│       ├── test_chat.py          # OCN-SE-151 → OCN-SE-200  (Chat)
│       ├── test_references.py    # OCN-SE-201 → OCN-SE-250  (References)
│       └── test_profile.py       # OCN-SE-251 → OCN-SE-300  (Profile)
│
├── appium/            # Android Mobile UI tests (300 tests) — Appium + UiAutomator2
│   ├── conftest.py
│   ├── requirements.txt
│   └── tests/
│       ├── test_auth_mobile.py       # OCN-AP-001 → OCN-AP-050  (Auth)
│       ├── test_onboarding.py        # OCN-AP-051 → OCN-AP-080  (Onboarding)
│       ├── test_dashboard_mobile.py  # OCN-AP-081 → OCN-AP-130  (Dashboard)
│       ├── test_scan_mobile.py       # OCN-AP-131 → OCN-AP-190  (Scan)
│       ├── test_chat_mobile.py       # OCN-AP-191 → OCN-AP-240  (Chat)
│       ├── test_profile_mobile.py    # OCN-AP-241 → OCN-AP-270  (Profile)
│       └── test_references_mobile.py # OCN-AP-271 → OCN-AP-300  (References)
│
├── api/               # REST API tests (300 tests) — pytest + requests
│   ├── conftest.py
│   ├── requirements.txt
│   ├── postman/
│   │   └── OcnoDetect_API_Collection.json
│   └── tests/
│       ├── test_auth_api.py        # OCN-API-001 → OCN-API-060  (Auth)
│       ├── test_profile_api.py     # OCN-API-061 → OCN-API-100  (Profile)
│       ├── test_dashboard_api.py   # OCN-API-101 → OCN-API-140  (Dashboard)
│       ├── test_upload_api.py      # OCN-API-141 → OCN-API-190  (Upload/AI)
│       ├── test_chat_api.py        # OCN-API-191 → OCN-API-240  (Chat)
│       ├── test_reference_api.py   # OCN-API-241 → OCN-API-270  (References)
│       └── test_saved_cases_api.py # OCN-API-271 → OCN-API-300  (Saved Cases)
│
├── load/              # Performance tests (300 scenarios) — k6
│   ├── k6/
│   │   ├── baseline_auth.js
│   │   ├── load_dashboard.js
│   │   ├── stress_upload.js
│   │   ├── spike_chat.js
│   │   ├── soak_api.js
│   │   ├── endurance_scan.js
│   │   ├── recovery_db.js
│   │   ├── volume_cases.js
│   │   ├── burst_notifications.js
│   │   └── concurrent_upload.js
│   └── scenarios/
│       └── load_scenarios.csv     # 300 scenario definitions
│
├── security/          # OWASP Security tests (300 tests) — pytest + requests
│   ├── conftest.py
│   ├── requirements.txt
│   └── tests/
│       ├── test_owasp_auth.py      # OCN-SEC-001 → OCN-SEC-040  (Auth)
│       ├── test_injection.py       # OCN-SEC-041 → OCN-SEC-080  (Injection)
│       ├── test_access_control.py  # OCN-SEC-081 → OCN-SEC-115  (IDOR/BAC)
│       ├── test_jwt_security.py    # OCN-SEC-116 → OCN-SEC-150  (JWT)
│       ├── test_headers_cookies.py # OCN-SEC-151 → OCN-SEC-180  (Headers)
│       ├── test_rate_limiting.py   # OCN-SEC-181 → OCN-SEC-210  (Rate Limits)
│       ├── test_upload_security.py # OCN-SEC-211 → OCN-SEC-240  (File Upload)
│       ├── test_api_security.py    # OCN-SEC-241 → OCN-SEC-275  (OWASP API Top 10)
│       └── test_mobile_security.py # OCN-SEC-276 → OCN-SEC-300  (MASVS Mobile)
│
├── utils/             # Shared utilities
│   ├── test_data.py   # Fixtures, payloads, security constants
│   └── helpers.py     # API/Selenium/Browser helpers
│
├── reports/           # Generated reports (auto-created)
│   └── generate_report.py   # Excel + HTML + JSON report generator
│
└── audit/
    └── audit_report.md      # Initial QA audit findings
```

---

## Test Coverage Summary

| Suite | Tests | IDs |
|-------|-------|-----|
| Selenium Web UI | 300 | OCN-SE-001 → OCN-SE-300 |
| Appium Android  | 300 | OCN-AP-001 → OCN-AP-300 |
| REST API        | 300 | OCN-API-001 → OCN-API-300 |
| Load (k6)       | 300 | OCN-LD-001 → OCN-LD-300 |
| Security OWASP  | 300 | OCN-SEC-001 → OCN-SEC-300 |
| **Total**       | **1,500** | |

---

## Running Tests

### Selenium Web UI
```bash
cd QA/selenium
pip install -r requirements.txt
pytest tests/ --html=../reports/selenium.html --self-contained-html -v
```

### REST API Tests
```bash
cd QA/api
pip install -r requirements.txt
cp ../utils/test_data.py test_data.py
OCNODETECT_API_URL=https://ocnodetect-backend.onrender.com pytest tests/ -v
```

### Security Tests
```bash
cd QA/security
pip install -r requirements.txt
cp ../utils/test_data.py test_data.py
OCNODETECT_API_URL=https://ocnodetect-backend.onrender.com pytest tests/ -v
```

### Load Tests (k6)
```bash
# Install k6 from https://k6.io/docs/get-started/installation/
k6 run QA/load/k6/baseline_auth.js
k6 run QA/load/k6/spike_chat.js --env JWT_TOKEN=your_token
```

### Appium Mobile Tests
```bash
# Start Appium server
npx appium
# Run tests
cd QA/appium
pip install -r requirements.txt
pytest tests/ -v
```

### Generate Reports
```bash
pip install openpyxl
python QA/reports/generate_report.py
```

---

## CI/CD — GitHub Actions

The pipeline at `.github/workflows/qa_pipeline.yml` automatically runs:

- **On push/PR** → Selenium, API, Security tests
- **On schedule (nightly)** → All suites including Load and Appium
- **On manual trigger** → Configurable per-suite execution

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OCNODETECT_API_URL` | Backend API base URL |
| `OCNODETECT_WEB_URL` | Frontend web app URL |
| `JWT_TOKEN` | Valid JWT for authenticated tests |
| `APPIUM_SERVER_URL` | Appium server (default: localhost:4723) |
| `ANDROID_APK_PATH` | Path to OcnoDetect APK for device testing |

---

## Framework Standards

- All test names follow the **OCN-{SUITE}-{NNN}** identifier scheme
- No generic names (e.g. "Scenario #1") — all descriptive clinical names
- Tests are **read-only** and never modify application business logic
- Parametrized security payloads use `@pytest.mark.parametrize`
- All suites support parallel execution via pytest-xdist
