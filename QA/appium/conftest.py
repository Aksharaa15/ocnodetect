"""
OcnoDetect QA — Appium Test Suite Configuration
Shared fixtures for all Android Mobile UI tests targeting the React Native / Expo application.
"""

import os
import sys
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "utils"))

APPIUM_SERVER_URL = os.environ.get("APPIUM_SERVER_URL", "http://localhost:4723/wd/hub")
PLATFORM_VERSION = os.environ.get("ANDROID_PLATFORM_VERSION", "13.0")
DEVICE_NAME = os.environ.get("ANDROID_DEVICE_NAME", "Android Emulator")
APK_PATH = os.environ.get("ANDROID_APK_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "artifacts", "ocnodetect-debug.apk")))

@pytest.fixture(scope="function")
def mobile_driver():
    """Fresh Appium driver session for Android mobile UI test."""
    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.platform_version = PLATFORM_VERSION
    options.device_name = DEVICE_NAME
    options.automation_name = "UiAutomator2"
    if os.path.exists(APK_PATH):
        options.app = APK_PATH
    options.app_package = "com.scanwise.ocnodetect"
    options.app_activity = ".MainActivity"
    options.no_reset = False
    options.full_reset = False
    
    driver = webdriver.Remote(APPIUM_SERVER_URL, options=options)
    driver.implicitly_wait(10)
    yield driver
    driver.quit()
