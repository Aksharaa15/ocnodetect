"""
OcnoDetect QA — Security Test Suite Configuration
Shared fixtures for all OWASP security tests.
"""

import os
import sys
import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "utils"))

from test_data import BASE_URL, unique_email, registration_payload


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
