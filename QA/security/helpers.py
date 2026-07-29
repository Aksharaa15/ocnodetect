"""
OcnoDetect QA — Common Helper Utilities
Provides shared functionality for all test suites.
"""

import os
import time
import json
import requests
from typing import Optional
from test_data import BASE_URL, VALID_USER, unique_email, registration_payload


# ─── API Helpers ──────────────────────────────────────────────────────────────

def register_and_login(session: requests.Session, email: str = None) -> dict:
    """Register a fresh user and return the login response with JWT token."""
    payload = registration_payload(email=email or unique_email())
    reg_resp = session.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=15)
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    return reg_resp.json()


def get_auth_headers(token: str) -> dict:
    """Return Authorization header dict for authenticated requests."""
    return {"Authorization": f"Bearer {token}"}


def create_authenticated_session(base_url: str = None) -> tuple:
    """
    Create a requests.Session with a fresh authenticated user.
    Returns (session, token, user_data).
    """
    url = base_url or BASE_URL
    session = requests.Session()
    email = unique_email("helper")
    payload = registration_payload(email=email)
    resp = session.post(f"{url}/api/auth/register", json=payload, timeout=15)
    if resp.status_code != 200:
        # Try login if already exists
        login_resp = session.post(
            f"{url}/api/auth/login",
            json={"email": email, "password": payload["password"]},
            timeout=15,
        )
        data = login_resp.json()
    else:
        data = resp.json()
    token = data.get("token", "")
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session, token, data


def api_get(endpoint: str, token: str, params: dict = None) -> requests.Response:
    """Perform an authenticated GET request."""
    headers = get_auth_headers(token)
    return requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params, timeout=15)


def api_post(endpoint: str, token: str = None, json_data: dict = None) -> requests.Response:
    """Perform a POST request, optionally authenticated."""
    headers = get_auth_headers(token) if token else {}
    return requests.post(f"{BASE_URL}{endpoint}", json=json_data, headers=headers, timeout=30)


def api_put(endpoint: str, token: str, json_data: dict = None) -> requests.Response:
    """Perform an authenticated PUT request."""
    headers = get_auth_headers(token)
    return requests.put(f"{BASE_URL}{endpoint}", json=json_data, headers=headers, timeout=15)


def api_delete(endpoint: str, token: str) -> requests.Response:
    """Perform an authenticated DELETE request."""
    headers = get_auth_headers(token)
    return requests.delete(f"{BASE_URL}{endpoint}", headers=headers, timeout=15)


# ─── Response Assertion Helpers ──────────────────────────────────────────────

def assert_success(response: requests.Response, expected_status: int = 200):
    """Assert response is successful."""
    assert response.status_code == expected_status, (
        f"Expected {expected_status}, got {response.status_code}. Body: {response.text[:500]}"
    )
    data = response.json()
    assert "error" not in data or data.get("success") is True, (
        f"Response contains error: {data.get('error')}"
    )
    return data


def assert_error(response: requests.Response, expected_status: int, error_contains: str = None):
    """Assert response is an error with optional message check."""
    assert response.status_code == expected_status, (
        f"Expected {expected_status}, got {response.status_code}. Body: {response.text[:500]}"
    )
    if error_contains:
        data = response.json()
        err_msg = data.get("error", "")
        assert error_contains.lower() in err_msg.lower(), (
            f"Expected error to contain '{error_contains}', got: '{err_msg}'"
        )
    return response.json()


def assert_has_keys(data: dict, keys: list):
    """Assert a dict contains all specified keys."""
    for key in keys:
        assert key in data, f"Missing key '{key}' in response: {list(data.keys())}"


# ─── Retry & Timing Helpers ───────────────────────────────────────────────────

def retry_request(fn, retries: int = 3, delay: float = 1.0):
    """Retry a callable up to N times with a delay."""
    last_exc = None
    for attempt in range(retries):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            time.sleep(delay)
    raise last_exc


def wait_for_api(url: str, timeout: int = 30):
    """Wait until the API health endpoint returns 200."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = requests.get(f"{url}/health", timeout=5)
            if resp.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(2)
    raise TimeoutError(f"API at {url} did not become healthy within {timeout}s")


# ─── File Helpers ─────────────────────────────────────────────────────────────

def load_json_file(path: str) -> dict:
    """Load and parse a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json_file(data: dict, path: str):
    """Serialize data to a JSON file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# ─── Selenium / Browser Helpers ───────────────────────────────────────────────

def wait_for_element(driver, by, locator, timeout: int = 10):
    """Wait for a web element to be visible and return it."""
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, locator))
    )


def safe_click(driver, by, locator, timeout: int = 10):
    """Wait for element and click it safely."""
    element = wait_for_element(driver, by, locator, timeout)
    element.click()
    return element


def fill_field(driver, by, locator, text: str, clear_first: bool = True):
    """Find an input field and fill it with text."""
    element = wait_for_element(driver, by, locator)
    if clear_first:
        element.clear()
    element.send_keys(text)
    return element


def get_page_title(driver) -> str:
    """Return current page title."""
    return driver.title


def take_screenshot(driver, name: str):
    """Save a screenshot to the reports directory."""
    reports_dir = os.path.join(os.path.dirname(__file__), "..", "reports", "screenshots")
    os.makedirs(reports_dir, exist_ok=True)
    path = os.path.join(reports_dir, f"{name}_{int(time.time())}.png")
    driver.save_screenshot(path)
    return path


# ─── Test ID Generator ─────────────────────────────────────────────────────────

_test_counters = {}

def next_test_id(prefix: str) -> str:
    """Generate sequential test IDs like OCN-SE-001, OCN-AP-002."""
    _test_counters[prefix] = _test_counters.get(prefix, 0) + 1
    return f"{prefix}-{_test_counters[prefix]:03d}"
