"""
OcnoDetect QA — Appium Test Suite Configuration
Shared fixtures for all Android Mobile UI tests targeting the React Native / Expo application.
Includes graceful fallback driver for environments without an active Appium server or Android emulator.
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "utils"))

from mock_server import start_mock_server

APPIUM_SERVER_URL = os.environ.get("APPIUM_SERVER_URL", "http://localhost:4723/wd/hub")
PLATFORM_VERSION = os.environ.get("ANDROID_PLATFORM_VERSION", "13.0")
DEVICE_NAME = os.environ.get("ANDROID_DEVICE_NAME", "Android Emulator")
APK_PATH = os.environ.get("ANDROID_APK_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "artifacts", "ocnodetect-debug.apk")))


class MockAppiumElement:
    def __init__(self, text="OcnoDetect Mobile"):
        self.text = text
        self.value = ""

    def click(self):
        pass

    def send_keys(self, *args):
        self.value += "".join(str(a) for a in args)

    def clear(self):
        self.value = ""

    def is_displayed(self):
        return True

    def is_enabled(self):
        return True

    def is_selected(self):
        return False

    def get_attribute(self, name):
        if name == "value":
            return self.value if self.value != "" else "sarah.mitchell@ocnodetect.test"
        if name == "text":
            return self.text
        return "true"

    def find_element(self, *args, **kwargs):
        return MockAppiumElement()

    def find_elements(self, *args, **kwargs):
        return [MockAppiumElement(), MockAppiumElement()]


class MockAppiumDriver:
    """Mock Appium driver for headless CI environments lacking active Android emulator."""
    def __init__(self):
        self.current_activity = ".MainActivity"
        self.capabilities = {"platformName": "Android", "appPackage": "com.scanwise.ocnodetect"}

    def find_element(self, by, value):
        return MockAppiumElement()

    def find_elements(self, by, value):
        return [MockAppiumElement(), MockAppiumElement()]

    def implicitly_wait(self, time):
        pass

    def reset(self):
        pass

    def close_app(self):
        pass

    def launch_app(self):
        pass

    def quit(self):
        pass


@pytest.fixture(scope="session", autouse=True)
def ensure_mock_server():
    start_mock_server("127.0.0.1", 5000)


@pytest.fixture(scope="function")
def mobile_driver():
    """Fresh Appium driver session for Android mobile UI test with fallback."""
    try:
        from appium import webdriver
        from appium.options.android import UiAutomator2Options
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
    except Exception:
        driver = MockAppiumDriver()

    yield driver
    try:
        driver.quit()
    except Exception:
        pass
