"""
OcnoDetect QA — Selenium Test Suite Configuration
Shared fixtures for all Web UI tests targeting the Vite/React web application.
"""

import os
import sys
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.options import Options as FirefoxOptions

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "utils"))

WEB_URL = os.environ.get("OCNODETECT_WEB_URL", "https://ocnodetect.vercel.app")
HEADLESS = os.environ.get("SELENIUM_HEADLESS", "true").lower() == "true"
BROWSER   = os.environ.get("SELENIUM_BROWSER", "chrome").lower()
IMPLICIT_WAIT = int(os.environ.get("SELENIUM_IMPLICIT_WAIT", "10"))
PAGE_LOAD_TIMEOUT = int(os.environ.get("SELENIUM_PAGE_LOAD_TIMEOUT", "30"))


def _chrome_driver():
    opts = ChromeOptions()
    if HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-web-security")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-notifications")
    opts.add_argument("--disable-infobars")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    return webdriver.Chrome(options=opts)


def _firefox_driver():
    opts = FirefoxOptions()
    if HEADLESS:
        opts.add_argument("--headless")
    opts.set_preference("dom.webnotifications.enabled", False)
    return webdriver.Firefox(options=opts)


@pytest.fixture(scope="function")
def driver():
    """Fresh browser session per test function."""
    if BROWSER == "firefox":
        d = _firefox_driver()
    else:
        d = _chrome_driver()
    d.implicitly_wait(IMPLICIT_WAIT)
    d.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    d.get(WEB_URL)
    yield d
    d.quit()


@pytest.fixture(scope="module")
def driver_module():
    """Single browser session per test module (faster for related tests)."""
    if BROWSER == "firefox":
        d = _firefox_driver()
    else:
        d = _chrome_driver()
    d.implicitly_wait(IMPLICIT_WAIT)
    d.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    d.get(WEB_URL)
    yield d
    d.quit()


@pytest.fixture(scope="session")
def web_url():
    return WEB_URL


@pytest.fixture(scope="session")
def api_url():
    return os.environ.get("OCNODETECT_API_URL", "https://ocnodetect-backend.onrender.com")


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "smoke: Quick smoke tests that validate core functionality"
    )
    config.addinivalue_line(
        "markers", "regression: Full regression tests"
    )
    config.addinivalue_line(
        "markers", "negative: Negative and boundary tests"
    )
    config.addinivalue_line(
        "markers", "ui: Pure UI/layout tests"
    )
