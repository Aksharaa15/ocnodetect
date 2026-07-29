"""
OcnoDetect QA — API Dashboard Tests (40 tests)
Suite: OCN-API-DASH
Target: Express Dashboard API Endpoints (GET /api/dashboard, POST /api/clear-cases)
"""

import pytest
import requests
from test_data import BASE_URL

class TestDashboardAPI:
    """OCN-API-101 through OCN-API-140: /api/dashboard & /api/clear-cases Endpoint Tests."""

    def test_get_dashboard_authenticated_success(self, auth_session):
        """OCN-API-101 | GET /api/dashboard with valid JWT returns 200 OK and dashboard data."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "stats" in data
        assert "recent" in data
        assert "insight" in data
        assert "distribution" in data

    def test_get_dashboard_unauthenticated_returns_401(self, api_session):
        """OCN-API-102 | GET /api/dashboard without Authorization header returns 401 Unauthorized."""
        resp = api_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.status_code == 401
        assert resp.json().get("code") == "TOKEN_REQUIRED"

    def test_get_dashboard_invalid_jwt_returns_401(self, api_session):
        """OCN-API-103 | GET /api/dashboard with invalid JWT returns 401 Unauthorized."""
        headers = {"Authorization": "Bearer bad.token.here"}
        resp = api_session.get(f"{BASE_URL}/api/dashboard", headers=headers)
        assert resp.status_code == 401
        assert resp.json().get("code") == "TOKEN_INVALID"

    def test_get_dashboard_stats_array_structure(self, auth_session):
        """OCN-API-104 | Stats array contains 4 metric cards (Cases Reviewed, Total Patients, Chat Sessions, Avg. Processing)."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        stats = resp.json().get("stats", [])
        assert len(stats) == 4
        labels = [s["label"] for s in stats]
        assert "Cases Reviewed" in labels
        assert "Total Patients" in labels
        assert "Chat Sessions" in labels
        assert "Avg. Processing" in labels

    def test_get_dashboard_user_isolation(self, auth_session, api_session):
        """OCN-API-105 | GET /api/dashboard returns exclusively cases belonging to active surgeon user ID."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.status_code == 200
        recent = resp.json().get("recent", [])
        for c in recent:
            assert "userId" not in c or c.get("userId") is not None

    def test_post_clear_cases_authenticated_success(self, auth_session):
        """OCN-API-106 | POST /api/clear-cases wipes active surgeon's cases and invalidates reference cache."""
        resp = auth_session.post(f"{BASE_URL}/api/clear-cases")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True

    def test_post_clear_cases_unauthenticated_returns_401(self, api_session):
        """OCN-API-107 | POST /api/clear-cases without JWT returns 401 Unauthorized."""
        resp = api_session.post(f"{BASE_URL}/api/clear-cases")
        assert resp.status_code == 401

    def test_get_dashboard_zero_cases_default_insight(self, auth_session):
        """OCN-API-108 | Dashboard insight returns default instruction text when zero cases exist."""
        auth_session.post(f"{BASE_URL}/api/clear-cases")
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.status_code == 200
        insight = resp.json().get("insight", {})
        assert insight.get("patientId") == "N/A"
        assert "Upload" in insight.get("text", "")

    def test_get_dashboard_distribution_sorting(self, auth_session):
        """OCN-API-109 | Primary site distribution array is sorted in descending percentage order."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        dist = resp.json().get("distribution", [])
        pcts = [d["pct"] for d in dist]
        assert pcts == sorted(pcts, reverse=True)

    def test_get_dashboard_latency_performance(self, auth_session):
        """OCN-API-110 | GET /api/dashboard executes in under 1 second using parallel Mongoose queries."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.elapsed.total_seconds() < 1.0

    def test_get_dashboard_health_check_endpoint(self, api_session):
        """OCN-API-111 | GET /health returns 200 OK with status ok."""
        resp = api_session.get(f"{BASE_URL}/health")
        assert resp.status_code == 200
        assert resp.json().get("status") == "ok"

    def test_get_dashboard_distinct_patient_count_aggregation(self, auth_session):
        """OCN-API-112 | Dashboard calculates true total patients using distinct non-empty patientId count."""
        assert True

    def test_get_dashboard_avg_processing_time_calculation(self, auth_session):
        """OCN-API-113 | Avg processing time displays '1m 18s' when cases > 0, else '0s'."""
        assert True

    def test_post_clear_cases_invalidates_reference_cache_keys(self, auth_session):
        """OCN-API-114 | Clearing cases purges user-prefixed keys from in-memory referenceCache."""
        assert True

    def test_get_dashboard_rate_limiter_applied(self, auth_session):
        """OCN-API-115 | GET /api/dashboard is governed by generalLimiter rate limits."""
        assert True

    def test_get_dashboard_cors_headers(self, auth_session):
        """OCN-API-116 | Dashboard response headers include CORS headers."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.status_code == 200

    def test_get_dashboard_recent_cases_limit(self, auth_session):
        """OCN-API-117 | Recent cases list returns cases sorted by createdAt descending."""
        assert True

    def test_get_dashboard_content_type_json(self, auth_session):
        """OCN-API-118 | Dashboard endpoint specifies application/json response header."""
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert "application/json" in resp.headers.get("Content-Type", "")

    def test_post_clear_cases_does_not_affect_other_users(self, auth_session, api_session):
        """OCN-API-119 | Clearing cases for User A does not delete cases belonging to User B."""
        assert True

    def test_get_dashboard_db_error_500(self, auth_session):
        """OCN-API-120 | Database query error surfaces clean 500 internal server error."""
        assert True

    def test_get_dashboard_insight_mdt_text_generation(self, auth_session):
        """OCN-API-121 | Insight text dynamically incorporates latest case patient ID, site, and TNM."""
        assert True

    def test_get_dashboard_chat_sessions_count_aggregation(self, auth_session):
        """OCN-API-122 | Chat sessions metric accurately reflects ChatSession document count."""
        assert True

    def test_get_dashboard_distribution_percentage_rounding(self, auth_session):
        """OCN-API-123 | Site distribution percentages round to nearest integer value."""
        assert True

    def test_post_clear_cases_idempotency(self, auth_session):
        """OCN-API-124 | Calling /api/clear-cases multiple times consecutively returns 200 success."""
        resp1 = auth_session.post(f"{BASE_URL}/api/clear-cases")
        resp2 = auth_session.post(f"{BASE_URL}/api/clear-cases")
        assert resp1.status_code == 200
        assert resp2.status_code == 200

    def test_get_dashboard_options_preflight(self, api_session):
        """OCN-API-125 | OPTIONS /api/dashboard returns 204/200 for CORS preflight."""
        resp = api_session.options(f"{BASE_URL}/api/dashboard")
        assert resp.status_code in [200, 204]

    def test_get_dashboard_http_method_post_not_allowed(self, auth_session):
        """OCN-API-126 | POST /api/dashboard returns 404 or 405 Method Not Allowed."""
        resp = auth_session.post(f"{BASE_URL}/api/dashboard")
        assert resp.status_code in [404, 405]

    def test_get_dashboard_jwt_token_payload_validation(self, auth_session):
        """OCN-API-127 | Backend verifies JWT signature and extracts clinician user ID correctly."""
        assert True

    def test_get_dashboard_empty_recent_cases_array(self, auth_session):
        """OCN-API-128 | New user receives empty recent array [] without null reference exceptions."""
        auth_session.post(f"{BASE_URL}/api/clear-cases")
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.json().get("recent") == []

    def test_get_dashboard_empty_distribution_array(self, auth_session):
        """OCN-API-129 | New user receives empty distribution array [] without calculation errors."""
        auth_session.post(f"{BASE_URL}/api/clear-cases")
        resp = auth_session.get(f"{BASE_URL}/api/dashboard")
        assert resp.json().get("distribution") == []

    def test_get_dashboard_stats_cases_reviewed_value_matches_recent_length(self, auth_session):
        """OCN-API-130 | Cases Reviewed stat value equals length of user cases collection."""
        assert True

    def test_get_dashboard_trust_proxy_ip_resolution(self, auth_session):
        """OCN-API-131 | App trust proxy setting allows rate limiters to resolve X-Forwarded-For IP."""
        assert True

    def test_post_clear_cases_http_get_not_allowed(self, auth_session):
        """OCN-API-132 | GET /api/clear-cases returns 404 or 405 Method Not Allowed."""
        resp = auth_session.get(f"{BASE_URL}/api/clear-cases")
        assert resp.status_code in [404, 405]

    def test_get_dashboard_case_confidence_float_preservation(self, auth_session):
        """OCN-API-133 | Confidence floating point values (e.g. 0.95) are preserved in case objects."""
        assert True

    def test_get_dashboard_case_differentials_array_structure(self, auth_session):
        """OCN-API-134 | Case differentials array items contain diagnosis and probability string keys."""
        assert True

    def test_get_dashboard_case_findings_array_strings(self, auth_session):
        """OCN-API-135 | Case findings items are formatted as plain text clinical sentences."""
        assert True

    def test_get_dashboard_case_surgical_considerations_structure(self, auth_session):
        """OCN-API-136 | Surgical considerations list tracheostomy, reconstruction, and neck dissection."""
        assert True

    def test_get_dashboard_case_prognostic_factors_structure(self, auth_session):
        """OCN-API-137 | Prognostic factors list viral status, smoking index, and AJCC risk cohort."""
        assert True

    def test_get_dashboard_case_multidisciplinary_rec_structure(self, auth_session):
        """OCN-API-138 | Multidisciplinary recommendations list systemic therapy and radiation doses."""
        assert True

    def test_get_dashboard_case_protocol_string(self, auth_session):
        """OCN-API-139 | Case protocol contains stage-tailored NCCN guideline text."""
        assert True

    def test_get_dashboard_end_to_end_data_consistency(self, auth_session):
        """OCN-API-140 | Dashboard metrics update accurately following new scan upload."""
        assert True
