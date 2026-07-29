"""
OcnoDetect QA — Security Test Suite Configuration
Shared fixtures for all OWASP security tests.
Auto-starts local mock API server if live server is unreachable.
"""

import os
import sys
import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "utils"))

from mock_server import start_mock_server
from test_data import BASE_URL, unique_email, registration_payload


@pytest.fixture(scope="session", autouse=True)
def ensure_mock_server():
    """Ensure local API server is listening on port 5000."""
    start_mock_server("127.0.0.1", 5000)


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="function")
def api_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s


@pytest.fixture(scope="function")
def auth_user(api_session):
    payload = registration_payload(email=unique_email("sec.user"))
    resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=15)
    assert resp.status_code == 200, f"Security fixture registration failed: {resp.text}"
    data = resp.json()
    data["credentials"] = payload
    yield data


@pytest.fixture(scope="function")
def auth_session(auth_user):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_user['token']}"
    })
    yield s
