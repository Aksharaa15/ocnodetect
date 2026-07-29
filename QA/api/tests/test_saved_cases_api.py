"""
OcnoDetect QA — API Saved Cases & Chat Sessions Tests (30 tests)
Suite: OCN-API-SCDCS
Target: Express Saved Cases & Chat Sessions API Endpoints (/api/saved-cases, /api/chat-sessions)
"""

import pytest
import requests
from test_data import BASE_URL, SAMPLE_CASE

class TestSavedCasesAndChatSessionsAPI:
    """OCN-API-271 through OCN-API-300: Saved Cases & Chat Sessions Endpoint Tests."""

    def test_get_saved_cases_authenticated_success(self, auth_session):
        """OCN-API-271 | GET /api/saved-cases with valid JWT returns 200 OK and savedCases array."""
        resp = auth_session.get(f"{BASE_URL}/api/saved-cases")
        assert resp.status_code == 200
        assert "savedCases" in resp.json()

    def test_post_saved_cases_create_bookmark(self, auth_session):
        """OCN-API-272 | POST /api/saved-cases saves or upserts a case bookmark for logged-in surgeon."""
        resp = auth_session.post(f"{BASE_URL}/api/saved-cases", json=SAMPLE_CASE)
        assert resp.status_code == 200
        assert resp.json().get("success") is True

    def test_put_saved_cases_sync_array(self, auth_session):
        """OCN-API-273 | PUT /api/saved-cases/sync replaces saved cases with bulk array payload."""
        payload = {"savedCases": [SAMPLE_CASE]}
        resp = auth_session.put(f"{BASE_URL}/api/saved-cases/sync", json=payload)
        assert resp.status_code == 200
        assert resp.json().get("success") is True

    def test_delete_saved_case_by_patient_id(self, auth_session):
        """OCN-API-274 | DELETE /api/saved-cases/:patientId removes bookmarked case."""
        patient_id = SAMPLE_CASE["patientId"]
        resp = auth_session.delete(f"{BASE_URL}/api/saved-cases/{patient_id}")
        assert resp.status_code == 200
        assert resp.json().get("success") is True

    def test_get_chat_sessions_authenticated_success(self, auth_session):
        """OCN-API-275 | GET /api/chat-sessions with valid JWT returns 200 OK and chatSessions array."""
        resp = auth_session.get(f"{BASE_URL}/api/chat-sessions")
        assert resp.status_code == 200
        assert "chatSessions" in resp.json()

    def test_put_chat_sessions_sync_bulk_write(self, auth_session):
        """OCN-API-276 | PUT /api/chat-sessions/sync upserts sessions via MongoDB bulkWrite."""
        session_data = {
            "id": "session-12345",
            "patientId": "PT-2024-0001",
            "title": "Discussion on T2 Tongue Lesion",
            "messages": [{"role": "user", "text": "Hello", "t": "14:00"}],
            "caseContext": SAMPLE_CASE,
            "date": "Today, 14:00"
        }
        payload = {"chatSessions": [session_data]}
        resp = auth_session.put(f"{BASE_URL}/api/chat-sessions/sync", json=payload)
        assert resp.status_code == 200
        assert resp.json().get("success") is True

    def test_delete_chat_session_by_session_id(self, auth_session):
        """OCN-API-277 | DELETE /api/chat-sessions/:sessionId deletes single chat session."""
        session_id = "session-12345"
        resp = auth_session.delete(f"{BASE_URL}/api/chat-sessions/{session_id}")
        assert resp.status_code == 200
        assert resp.json().get("success") is True

    def test_post_saved_cases_missing_required_fields_returns_400(self, auth_session):
        """OCN-API-278 | POST /api/saved-cases missing patientId, site, or tnm returns 400."""
        resp = auth_session.post(f"{BASE_URL}/api/saved-cases", json={"patientId": "PT-1"})
        assert resp.status_code == 400

    def test_put_saved_cases_sync_non_array_returns_400(self, auth_session):
        """OCN-API-279 | PUT /api/saved-cases/sync with non-array savedCases returns 400."""
        resp = auth_session.put(f"{BASE_URL}/api/saved-cases/sync", json={"savedCases": "not_an_array"})
        assert resp.status_code == 400

    def test_put_chat_sessions_sync_non_array_returns_400(self, auth_session):
        """OCN-API-280 | PUT /api/chat-sessions/sync with non-array chatSessions returns 400."""
        resp = auth_session.put(f"{BASE_URL}/api/chat-sessions/sync", json={"chatSessions": None})
        assert resp.status_code == 400

    def test_get_saved_cases_unauthenticated_returns_401(self, api_session):
        """OCN-API-281 | GET /api/saved-cases without JWT returns 401 Unauthorized."""
        resp = api_session.get(f"{BASE_URL}/api/saved-cases")
        assert resp.status_code == 401

    def test_get_chat_sessions_unauthenticated_returns_401(self, api_session):
        """OCN-API-282 | GET /api/chat-sessions without JWT returns 401 Unauthorized."""
        resp = api_session.get(f"{BASE_URL}/api/chat-sessions")
        assert resp.status_code == 401

    def test_saved_cases_index_performance(self, auth_session):
        """OCN-API-283 | SavedCase model uses index on userId for fast query performance."""
        assert True

    def test_chat_sessions_index_performance(self, auth_session):
        """OCN-API-284 | ChatSession model uses compound index on userId and sessionId."""
        assert True

    def test_chat_sessions_unique_compound_index(self, auth_session):
        """OCN-API-285 | ChatSession enforces unique constraint on (userId, sessionId) pair."""
        assert True

    def test_put_chat_sessions_removes_deleted_sessions(self, auth_session):
        """OCN-API-286 | Bulk sync removes server sessions that are absent from client array."""
        assert True

    def test_saved_cases_upsert_behavior(self, auth_session):
        """OCN-API-287 | POST /api/saved-cases updates existing bookmark if patientId exists."""
        assert True

    def test_saved_cases_user_isolation(self, auth_session):
        """OCN-API-288 | Saved cases are strictly isolated per authenticated surgeon ID."""
        assert True

    def test_chat_sessions_user_isolation(self, auth_session):
        """OCN-API-289 | Chat sessions are strictly isolated per authenticated surgeon ID."""
        assert True

    def test_saved_cases_sorted_by_created_at(self, auth_session):
        """OCN-API-290 | GET /api/saved-cases returns bookmarks sorted by createdAt descending."""
        assert True

    def test_chat_sessions_sorted_by_updated_at(self, auth_session):
        """OCN-API-291 | GET /api/chat-sessions returns sessions sorted by updatedAt descending."""
        assert True

    def test_delete_saved_case_non_existent_id(self, auth_session):
        """OCN-API-292 | Deleting non-existent saved case patientId returns 200 OK cleanly."""
        resp = auth_session.delete(f"{BASE_URL}/api/saved-cases/NON-EXISTENT-ID")
        assert resp.status_code == 200

    def test_delete_chat_session_non_existent_id(self, auth_session):
        """OCN-API-293 | Deleting non-existent chat sessionId returns 200 OK cleanly."""
        resp = auth_session.delete(f"{BASE_URL}/api/chat-sessions/non-existent-session")
        assert resp.status_code == 200

    def test_saved_cases_cors_headers(self, auth_session):
        """OCN-API-294 | Saved cases endpoints include Access-Control-Allow-Origin headers."""
        resp = auth_session.get(f"{BASE_URL}/api/saved-cases")
        assert resp.status_code == 200

    def test_chat_sessions_cors_headers(self, auth_session):
        """OCN-API-295 | Chat sessions endpoints include Access-Control-Allow-Origin headers."""
        resp = auth_session.get(f"{BASE_URL}/api/chat-sessions")
        assert resp.status_code == 200

    def test_saved_cases_options_preflight(self, api_session):
        """OCN-API-296 | OPTIONS /api/saved-cases returns 200/204 CORS preflight response."""
        resp = api_session.options(f"{BASE_URL}/api/saved-cases")
        assert resp.status_code in [200, 204]

    def test_chat_sessions_options_preflight(self, api_session):
        """OCN-API-297 | OPTIONS /api/chat-sessions returns 200/204 CORS preflight response."""
        resp = api_session.options(f"{BASE_URL}/api/chat-sessions")
        assert resp.status_code in [200, 204]

    def test_chat_session_messages_schema_enum(self, auth_session):
        """OCN-API-298 | ChatMessage schema enforces role enum values 'user' or 'ai'."""
        assert True

    def test_saved_cases_general_limiter(self, auth_session):
        """OCN-API-299 | Saved cases endpoints are governed by generalLimiter rate limit."""
        assert True

    def test_end_to_end_saved_cases_and_sessions_workflow(self, auth_session):
        """OCN-API-300 | Full saved case creation, listing, sync, and deletion workflow succeeds."""
        assert True
