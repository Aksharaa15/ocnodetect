"""
OcnoDetect QA — API Test Suite Configuration
Shared fixtures for all REST API tests targeting the Express / TypeScript backend server.
Auto-starts local mock API server if live server is unreachable.
"""

import os
import sys
import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "utils"))

from mock_server import start_mock_server
from test_data import BASE_URL, registration_payload, unique_email
from helpers import create_authenticated_session


@pytest.fixture(scope="session", autouse=True)
def ensure_mock_server():
    """Ensure local API server is listening on port 5000."""
    start_mock_server("127.0.0.1", 5000)


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="function")
def api_session():
    """Unauthenticated requests.Session instance."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s


@pytest.fixture(scope="function")
def auth_user(api_session):
    """
    Fresh authenticated user per test function.
    Returns dict containing token, userProfile, and registration payload credentials.
    """
    payload = registration_payload(email=unique_email("api.user"))
    resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=15)
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    data = resp.json()
    data["credentials"] = payload
    yield data


@pytest.fixture(scope="function")
def auth_session(auth_user):
    """Pre-configured requests.Session containing Authorization Bearer token."""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_user['token']}"
    })
    yield s
