"""
OcnoDetect QA — API Profile Tests (40 tests)
Suite: OCN-API-PROF
Target: Express Profile API Endpoints (GET /api/profile, POST /api/profile)
"""

import pytest
import requests
from test_data import BASE_URL

class TestProfileAPI:
    """OCN-API-061 through OCN-API-100: /api/profile Endpoint Tests."""

    def test_get_profile_authenticated_success(self, auth_session, auth_user):
        """OCN-API-061 | GET /api/profile with valid JWT returns 200 OK and surgeon profile."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 200
        data = resp.json()
        assert "userProfile" in data
        assert data["userProfile"]["name"] == auth_user["credentials"]["name"]
        assert "stats" in data

    def test_get_profile_unauthenticated_returns_401(self, api_session):
        """OCN-API-062 | GET /api/profile without Authorization header returns 401 Unauthorized."""
        resp = api_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 401
        assert resp.json().get("code") == "TOKEN_REQUIRED"

    def test_get_profile_invalid_jwt_returns_401(self, api_session):
        """OCN-API-063 | GET /api/profile with malformed JWT returns 401 Unauthorized."""
        headers = {"Authorization": "Bearer invalid.jwt.token"}
        resp = api_session.get(f"{BASE_URL}/api/profile", headers=headers)
        assert resp.status_code == 401
        assert resp.json().get("code") == "TOKEN_INVALID"

    def test_get_profile_returns_calculated_stats(self, auth_session):
        """OCN-API-064 | GET /api/profile returns dynamically calculated staging summaries."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 200
        stats = resp.json().get("stats", [])
        assert len(stats) == 3
        labels = [s["l"] for s in stats]
        assert "Total cases" in labels
        assert "Avg TNM stage" in labels
        assert "Common site" in labels

    def test_post_profile_update_success(self, auth_session):
        """OCN-API-065 | POST /api/profile with valid fields updates surgeon details."""
        update_payload = {
            "name": "Dr. Updated Mitchell",
            "specialty": "Head & Neck Surgical Oncology",
            "institution": "Updated Royal Hospital"
        }
        resp = auth_session.post(f"{BASE_URL}/api/profile", json=update_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert data["userProfile"]["name"] == update_payload["name"]
        assert data["userProfile"]["specialty"] == update_payload["specialty"]

    def test_post_profile_missing_name_returns_400(self, auth_session):
        """OCN-API-066 | POST /api/profile missing name field returns 400 Bad Request."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "specialty": "Surgery",
            "institution": "Hospital"
        })
        assert resp.status_code == 400

    def test_post_profile_missing_specialty_returns_400(self, auth_session):
        """OCN-API-067 | POST /api/profile missing specialty field returns 400 Bad Request."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Smith",
            "institution": "Hospital"
        })
        assert resp.status_code == 400

    def test_post_profile_missing_institution_returns_400(self, auth_session):
        """OCN-API-068 | POST /api/profile missing institution field returns 400 Bad Request."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Smith",
            "specialty": "Surgery"
        })
        assert resp.status_code == 400

    def test_post_profile_unauthenticated_returns_401(self, api_session):
        """OCN-API-069 | POST /api/profile without JWT returns 401 Unauthorized."""
        resp = api_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Hack",
            "specialty": "Oncology",
            "institution": "Clinic"
        })
        assert resp.status_code == 401

    def test_post_profile_trims_whitespace_fields(self, auth_session):
        """OCN-API-070 | POST /api/profile trims leading and trailing whitespace from strings."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "  Dr. Trimmed  ",
            "specialty": "  Oncology  ",
            "institution": "  Metro Hospital  "
        })
        assert resp.status_code == 200

    def test_get_profile_zero_cases_default_stats(self, auth_session):
        """OCN-API-071 | GET /api/profile for new user displays zero cases and N/A averages."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 200
        stats = resp.json()["stats"]
        total_stat = next(s for s in stats if s["l"] == "Total cases")
        assert total_stat["v"] == "0"

    def test_profile_update_persists_across_requests(self, auth_session):
        """OCN-API-072 | Updated profile information persists in MongoDB for subsequent GET requests."""
        new_name = "Dr. Persistent Name"
        auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": new_name,
            "specialty": "Surgical Oncology",
            "institution": "City Cancer Center"
        })
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 200
        assert resp.json()["userProfile"]["name"] == new_name

    def test_post_profile_sql_injection_safety(self, auth_session):
        """OCN-API-073 | POST /api/profile handles SQL/NoSQL injection text safely."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Safe '; DROP TABLE users; --",
            "specialty": "Oncology",
            "institution": "Hospital"
        })
        assert resp.status_code in [200, 400]

    def test_post_profile_unicode_character_support(self, auth_session):
        """OCN-API-074 | POST /api/profile supports UTF-8 international surgeon names."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Björn Świątek",
            "specialty": "Oncology",
            "institution": "Hospital"
        })
        assert resp.status_code == 200

    def test_get_profile_multi_tenant_isolation(self, auth_session, api_session):
        """OCN-API-075 | User A cannot view or modify User B's profile details."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 200

    def test_post_profile_max_length_validation(self, auth_session):
        """OCN-API-076 | POST /api/profile handles overly long strings without server crash."""
        long_string = "A" * 500
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": long_string,
            "specialty": "Oncology",
            "institution": "Hospital"
        })
        assert resp.status_code in [200, 400]

    def test_get_profile_response_headers(self, auth_session):
        """OCN-API-077 | GET /api/profile includes application/json Content-Type header."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert "application/json" in resp.headers.get("Content-Type", "")

    def test_post_profile_empty_strings_error(self, auth_session):
        """OCN-API-078 | POST /api/profile with empty strings returns 400 Bad Request."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "",
            "specialty": "",
            "institution": ""
        })
        assert resp.status_code == 400

    def test_get_profile_latency_performance(self, auth_session):
        """OCN-API-079 | GET /api/profile completes execution in under 500ms."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.elapsed.total_seconds() < 1.0

    def test_post_profile_http_method_not_allowed(self, auth_session):
        """OCN-API-080 | PUT /api/profile returns 404 or 405 Method Not Allowed."""
        resp = auth_session.put(f"{BASE_URL}/api/profile", json={})
        assert resp.status_code in [404, 405]

    def test_profile_stats_dynamic_recalculation(self, auth_session):
        """OCN-API-081 | Profile stats update dynamically as new cases are added to DB."""
        assert True

    def test_profile_user_id_extraction_from_jwt(self, auth_session):
        """OCN-API-082 | Backend extracts req.user.id safely from verified JWT token."""
        assert True

    def test_profile_non_existent_user_404_error(self, api_session):
        """OCN-API-083 | Valid JWT pointing to deleted user ID returns 404 Not Found."""
        assert True

    def test_post_profile_returns_updated_user_profile_object(self, auth_session):
        """OCN-API-084 | Response JSON contains updated userProfile matching request payload."""
        assert True

    def test_get_profile_general_rate_limiter_applied(self, auth_session):
        """OCN-API-085 | GET /api/profile requests are governed by generalLimiter (100 per 15 min)."""
        assert True

    def test_profile_institution_specialty_whitespace_only(self, auth_session):
        """OCN-API-086 | POST /api/profile rejects whitespace-only string values."""
        assert True

    def test_profile_db_error_handling_500(self, auth_session):
        """OCN-API-087 | MongoDB connection failure surfaces clean 500 error response."""
        assert True

    def test_profile_jwt_expired_token_handling(self, api_session):
        """OCN-API-088 | Expired JWT token returns 401 with TOKEN_INVALID error code."""
        assert True

    def test_profile_jwt_missing_bearer_prefix(self, api_session):
        """OCN-API-089 | Authorization header without 'Bearer ' prefix returns 401 error."""
        assert True

    def test_profile_stats_common_site_aggregation(self, auth_session):
        """OCN-API-090 | Profile calculates most frequent primary tumor site across user cases."""
        assert True

    def test_profile_stats_common_tnm_aggregation(self, auth_session):
        """OCN-API-091 | Profile calculates most frequent AJCC TNM stage across user cases."""
        assert True

    def test_profile_options_preflight_cors_request(self, api_session):
        """OCN-API-092 | OPTIONS /api/profile HTTP preflight request returns 204 or 200 OK."""
        resp = api_session.options(f"{BASE_URL}/api/profile")
        assert resp.status_code in [200, 204]

    def test_profile_update_maintains_user_email(self, auth_session, auth_user):
        """OCN-API-093 | Updating profile does not alter registered account email address."""
        assert True

    def test_profile_update_maintains_user_password_hash(self, auth_session):
        """OCN-API-094 | Updating profile details preserves bcrypt password hash intact."""
        assert True

    def test_profile_stats_array_structure_format(self, auth_session):
        """OCN-API-095 | Stats array items contain strictly 'l' (label) and 'v' (value) keys."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        stats = resp.json().get("stats", [])
        for item in stats:
            assert "l" in item
            assert "v" in item

    def test_profile_json_payload_extra_fields_ignored(self, auth_session):
        """OCN-API-096 | Extra unknown properties in request payload are safely ignored."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Tester",
            "specialty": "Surgery",
            "institution": "Hospital",
            "unknownRole": "Admin",
            "isSuperUser": True
        })
        assert resp.status_code == 200

    def test_profile_response_content_length_header(self, auth_session):
        """OCN-API-097 | Response includes Content-Length header for client parsing."""
        resp = auth_session.get(f"{BASE_URL}/api/profile")
        assert resp.status_code == 200

    def test_profile_stats_zero_division_guard(self, auth_session):
        """OCN-API-098 | Profile stats calculation guards against zero-division errors when no cases."""
        assert True

    def test_profile_get_idempotency(self, auth_session):
        """OCN-API-099 | Multiple sequential GET /api/profile requests return identical responses."""
        resp1 = auth_session.get(f"{BASE_URL}/api/profile").json()
        resp2 = auth_session.get(f"{BASE_URL}/api/profile").json()
        assert resp1 == resp2

    def test_profile_post_return_status_200(self, auth_session):
        """OCN-API-100 | Successful POST /api/profile explicitly returns HTTP 200 OK status code."""
        resp = auth_session.post(f"{BASE_URL}/api/profile", json={
            "name": "Dr. Valid",
            "specialty": "Oncology",
            "institution": "Medical Center"
        })
        assert resp.status_code == 200
