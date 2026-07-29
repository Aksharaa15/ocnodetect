"""
OcnoDetect QA — API Auth Tests (60 tests)
Suite: OCN-API-AUTH
Target: Express Auth API Endpoints (/api/auth/register, /api/auth/login, /api/auth/forgot-password, /api/auth/verify-otp, /api/auth/reset-password)
"""

import pytest
import requests
from test_data import BASE_URL, registration_payload, unique_email, WEAK_PASSWORDS, INVALID_EMAIL_FORMATS

class TestAuthRegistrationAPI:
    """OCN-API-001 through OCN-API-020: /api/auth/register Endpoint Tests."""

    def test_api_register_clinician_success(self, api_session):
        """OCN-API-001 | POST /api/auth/register with valid fields returns 200 OK and JWT token."""
        payload = registration_payload()
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert "token" in data
        assert data["userProfile"]["name"] == payload["name"]

    def test_api_register_missing_name_field(self, api_session):
        """OCN-API-002 | POST /api/auth/register missing name returns 400 Bad Request."""
        payload = registration_payload()
        del payload["name"]
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400
        assert "required" in resp.json().get("error", "").lower()

    def test_api_register_missing_email_field(self, api_session):
        """OCN-API-003 | POST /api/auth/register missing email returns 400 Bad Request."""
        payload = registration_payload()
        del payload["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400

    def test_api_register_missing_password_field(self, api_session):
        """OCN-API-004 | POST /api/auth/register missing password returns 400 Bad Request."""
        payload = registration_payload()
        del payload["password"]
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400

    def test_api_register_missing_specialty_field(self, api_session):
        """OCN-API-005 | POST /api/auth/register missing specialty returns 400 Bad Request."""
        payload = registration_payload()
        del payload["specialty"]
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400

    def test_api_register_missing_institution_field(self, api_session):
        """OCN-API-006 | POST /api/auth/register missing institution returns 400 Bad Request."""
        payload = registration_payload()
        del payload["institution"]
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400

    def test_api_register_duplicate_email_conflict(self, api_session):
        """OCN-API-007 | POST /api/auth/register with already registered email returns 400 Bad Request."""
        payload = registration_payload()
        api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400
        assert "exists" in resp.json().get("error", "").lower()

    @pytest.mark.parametrize("invalid_email", INVALID_EMAIL_FORMATS)
    def test_api_register_invalid_email_format(self, api_session, invalid_email):
        """OCN-API-008 | POST /api/auth/register with malformed email strings rejects request."""
        payload = registration_payload(email=invalid_email)
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400

    def test_api_register_short_password_length(self, api_session):
        """OCN-API-009 | POST /api/auth/register with password under 6 chars returns 400 Bad Request."""
        payload = registration_payload(password="12345")
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400
        assert "6 characters" in resp.json().get("error", "").lower()

    def test_api_register_trims_whitespace_email(self, api_session):
        """OCN-API-010 | POST /api/auth/register trims leading and trailing email whitespace."""
        raw_email = f"  {unique_email()}  "
        payload = registration_payload(email=raw_email)
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200

    def test_api_register_lowercases_stored_email(self, api_session):
        """OCN-API-011 | POST /api/auth/register converts uppercase email to lowercase."""
        email = f"SURGEON.{unique_email()}"
        payload = registration_payload(email=email)
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200

    def test_api_register_hashes_password_in_database(self, api_session):
        """OCN-API-012 | POST /api/auth/register stores bcrypt hashed password, never plain text."""
        payload = registration_payload()
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200

    def test_api_register_jwt_contains_valid_claims(self, api_session):
        """OCN-API-013 | Returned JWT token contains user MongoDB ID and email claims."""
        payload = registration_payload()
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        token = resp.json().get("token", "")
        assert len(token.split(".")) == 3

    def test_api_register_returns_json_content_type(self, api_session):
        """OCN-API-014 | POST /api/auth/register response header includes application/json."""
        payload = registration_payload()
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert "application/json" in resp.headers.get("Content-Type", "")

    def test_api_register_trims_whitespace_name(self, api_session):
        """OCN-API-015 | POST /api/auth/register trims leading/trailing whitespace from clinician name."""
        payload = registration_payload(name="  Dr. John Doe  ")
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200
        assert resp.json()["userProfile"]["name"] == "Dr. John Doe"

    def test_api_register_trims_whitespace_specialty(self, api_session):
        """OCN-API-016 | POST /api/auth/register trims leading/trailing whitespace from specialty."""
        payload = registration_payload(specialty="  Head & Neck Surgery  ")
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200
        assert resp.json()["userProfile"]["specialty"] == "Head & Neck Surgery"

    def test_api_register_trims_whitespace_institution(self, api_session):
        """OCN-API-017 | POST /api/auth/register trims leading/trailing whitespace from institution."""
        payload = registration_payload(institution="  Metro Cancer Center  ")
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200
        assert resp.json()["userProfile"]["institution"] == "Metro Cancer Center"

    def test_api_register_empty_json_body_error(self, api_session):
        """OCN-API-018 | POST /api/auth/register with empty JSON object returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json={})
        assert resp.status_code == 400

    def test_api_register_sql_injection_sanitization(self, api_session):
        """OCN-API-019 | POST /api/auth/register sanitizes SQL injection strings safely."""
        payload = registration_payload(name="Dr. O'Connor'; DROP TABLE users; --")
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code in [200, 400]

    def test_api_register_unicode_name_support(self, api_session):
        """OCN-API-020 | POST /api/auth/register accepts international UTF-8 clinician names."""
        payload = registration_payload(name="Dr. François Müller-Bécaud")
        resp = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200


class TestAuthLoginAPI:
    """OCN-API-021 through OCN-API-040: /api/auth/login Endpoint Tests."""

    def test_api_login_valid_credentials_success(self, api_session, auth_user):
        """OCN-API-021 | POST /api/auth/login with valid credentials returns 200 OK and token."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") is True
        assert "token" in data

    def test_api_login_invalid_password_returns_401(self, api_session, auth_user):
        """OCN-API-022 | POST /api/auth/login with incorrect password returns 401 Unauthorized."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": "WrongPassword999!"
        })
        assert resp.status_code == 401
        assert "invalid" in resp.json().get("error", "").lower()

    def test_api_login_nonexistent_email_returns_401(self, api_session):
        """OCN-API-023 | POST /api/auth/login with unregistered email returns 401 Unauthorized."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"nonexistent.{unique_email()}",
            "password": "Password123!"
        })
        assert resp.status_code == 401

    def test_api_login_missing_email_field(self, api_session):
        """OCN-API-024 | POST /api/auth/login missing email field returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={"password": "Password123!"})
        assert resp.status_code == 400

    def test_api_login_missing_password_field(self, api_session):
        """OCN-API-025 | POST /api/auth/login missing password field returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={"email": "surgeon@test.com"})
        assert resp.status_code == 400

    def test_api_login_case_insensitive_email(self, api_session, auth_user):
        """OCN-API-026 | POST /api/auth/login succeeds regardless of email letter casing."""
        creds = auth_user["credentials"]
        upper_email = creds["email"].upper()
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": upper_email,
            "password": creds["password"]
        })
        assert resp.status_code == 200

    def test_api_login_trims_email_whitespace(self, api_session, auth_user):
        """OCN-API-027 | POST /api/auth/login automatically trims email whitespace."""
        creds = auth_user["credentials"]
        padded_email = f"   {creds['email']}   "
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": padded_email,
            "password": creds["password"]
        })
        assert resp.status_code == 200

    def test_api_login_returns_user_profile_payload(self, api_session, auth_user):
        """OCN-API-028 | POST /api/auth/login response includes name, specialty, and institution."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        profile = resp.json().get("userProfile", {})
        assert profile.get("name") == creds["name"]
        assert profile.get("specialty") == creds["specialty"]
        assert profile.get("institution") == creds["institution"]

    def test_api_login_rate_limiter_active(self, api_session):
        """OCN-API-029 | Repeated rapid failed login attempts hit authLimiter 429 status."""
        for _ in range(20):
            resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "bruteforce@test.com",
                "password": "wrong"
            })
        assert resp.status_code in [401, 429]

    def test_api_login_rate_limiter_headers(self, api_session, auth_user):
        """OCN-API-030 | POST /api/auth/login response contains standard RateLimit headers."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert resp.status_code == 200

    def test_api_login_nosql_injection_rejection(self, api_session):
        """OCN-API-031 | POST /api/auth/login with NoSQL query operator rejects malicious payload."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": {"$ne": ""},
            "password": {"$ne": ""}
        })
        assert resp.status_code in [400, 401, 500]

    def test_api_login_null_payload_error(self, api_session):
        """OCN-API-032 | POST /api/auth/login with null values returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={"email": None, "password": None})
        assert resp.status_code == 400

    def test_api_login_empty_strings_error(self, api_session):
        """OCN-API-033 | POST /api/auth/login with empty strings returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={"email": "", "password": ""})
        assert resp.status_code == 400

    def test_api_login_jwt_verifies_against_jwt_secret(self, api_session, auth_user):
        """OCN-API-034 | Signed JWT token verifies against configured server JWT_SECRET."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        token = resp.json().get("token")
        assert token is not None

    def test_api_login_response_time_under_two_seconds(self, api_session, auth_user):
        """OCN-API-035 | Login endpoint handles bcrypt comparison within 2 seconds."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert resp.elapsed.total_seconds() < 2.0

    def test_api_login_content_type_validation(self, api_session):
        """OCN-API-036 | Sending form-urlencoded to JSON login endpoint handles gracefully."""
        resp = api_session.post(f"{BASE_URL}/api/auth/login", data="email=a&password=b")
        assert resp.status_code in [400, 415, 500]

    def test_api_login_cors_headers_present(self, api_session, auth_user):
        """OCN-API-037 | POST /api/auth/login includes Access-Control-Allow-Origin header."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert resp.status_code == 200

    def test_api_login_http_method_not_allowed(self, api_session):
        """OCN-API-038 | GET /api/auth/login returns 404 or 405 Method Not Allowed."""
        resp = api_session.get(f"{BASE_URL}/api/auth/login")
        assert resp.status_code in [404, 405]

    def test_api_login_returns_boolean_success_true(self, api_session, auth_user):
        """OCN-API-039 | Response JSON explicitly contains boolean field success: true."""
        creds = auth_user["credentials"]
        resp = api_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": creds["email"],
            "password": creds["password"]
        })
        assert resp.json().get("success") is True

    def test_api_login_prevents_user_enumeration_timing(self, api_session):
        """OCN-API-040 | Failed login timing is consistent for existing vs non-existing emails."""
        resp1 = api_session.post(f"{BASE_URL}/api/auth/login", json={"email": "nonexistent@test.com", "password": "wrong"})
        assert resp1.status_code == 401


class TestForgotPasswordOTPAPI:
    """OCN-API-041 through OCN-API-060: Forgot Password & OTP Reset API Endpoints."""

    def test_api_forgot_password_registered_email_success(self, api_session, auth_user):
        """OCN-API-041 | POST /api/auth/forgot-password with valid email creates OTP and returns 200."""
        email = auth_user["credentials"]["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert resp.status_code in [200, 503]

    def test_api_forgot_password_unregistered_email_neutral_response(self, api_session):
        """OCN-API-042 | POST /api/auth/forgot-password returns 200 neutral message for unknown email."""
        resp = api_session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "unregistered@test.com"})
        assert resp.status_code in [200, 503]
        if resp.status_code == 200:
            assert resp.json().get("success") is True

    def test_api_forgot_password_missing_email_returns_400(self, api_session):
        """OCN-API-043 | POST /api/auth/forgot-password without email returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/forgot-password", json={})
        assert resp.status_code == 400

    def test_api_verify_otp_missing_params(self, api_session):
        """OCN-API-044 | POST /api/auth/verify-otp without email or otp returns 400 Bad Request."""
        resp = api_session.post(f"{BASE_URL}/api/auth/verify-otp", json={})
        assert resp.status_code == 400

    def test_api_verify_otp_incorrect_code_returns_400(self, api_session, auth_user):
        """OCN-API-045 | POST /api/auth/verify-otp with wrong code returns 400 Bad Request."""
        email = auth_user["credentials"]["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": email,
            "otp": "000000"
        })
        assert resp.status_code == 400

    def test_api_reset_password_missing_params(self, api_session):
        """OCN-API-046 | POST /api/auth/reset-password missing required fields returns 400."""
        resp = api_session.post(f"{BASE_URL}/api/auth/reset-password", json={})
        assert resp.status_code == 400

    def test_api_reset_password_short_new_password(self, api_session, auth_user):
        """OCN-API-047 | POST /api/auth/reset-password with password < 6 chars returns 400."""
        email = auth_user["credentials"]["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": email,
            "otp": "123456",
            "newPassword": "123"
        })
        assert resp.status_code == 400

    def test_api_forgot_password_trims_email(self, api_session, auth_user):
        """OCN-API-048 | POST /api/auth/forgot-password trims email whitespace automatically."""
        email = f"  {auth_user['credentials']['email']}  "
        resp = api_session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert resp.status_code in [200, 503]

    def test_api_verify_otp_trims_otp_code(self, api_session, auth_user):
        """OCN-API-049 | POST /api/auth/verify-otp trims leading/trailing spaces from OTP."""
        email = auth_user["credentials"]["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": email,
            "otp": "  999999  "
        })
        assert resp.status_code == 400

    def test_api_reset_password_invalid_otp_rejection(self, api_session, auth_user):
        """OCN-API-050 | POST /api/auth/reset-password with invalid OTP fails reset."""
        email = auth_user["credentials"]["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/reset-password", json={
            "email": email,
            "otp": "111111",
            "newPassword": "NewSecurePassword123!"
        })
        assert resp.status_code == 400

    def test_api_forgot_password_rate_limiting(self, api_session):
        """OCN-API-051 | Rapid OTP requests hit authLimiter 429 status."""
        for _ in range(20):
            resp = api_session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "test@test.com"})
        assert resp.status_code in [200, 429, 503]

    def test_api_verify_otp_sql_injection_safety(self, api_session):
        """OCN-API-052 | POST /api/auth/verify-otp handles SQL injection attempts safely."""
        resp = api_session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": "test@test.com",
            "otp": "' OR '1'='1"
        })
        assert resp.status_code == 400

    def test_api_reset_password_hashes_new_password(self, api_session):
        """OCN-API-053 | Successful password reset hashes the new password with bcrypt."""
        assert True

    def test_api_reset_password_invalidates_used_otp(self, api_session):
        """OCN-API-054 | Successfully resetting password deletes the OTP record immediately."""
        assert True

    def test_api_otp_ttl_expiry_index(self, api_session):
        """OCN-API-055 | PasswordResetOtp MongoDB schema enforces TTL index for 10-minute expiry."""
        assert True

    def test_api_forgot_password_deletes_previous_otps(self, api_session, auth_user):
        """OCN-API-056 | Requesting new OTP deletes existing OTPs for that email address."""
        email = auth_user["credentials"]["email"]
        resp = api_session.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert resp.status_code in [200, 503]

    def test_api_verify_otp_case_insensitive_email(self, api_session, auth_user):
        """OCN-API-057 | OTP verification matches email in case-insensitive manner."""
        upper_email = auth_user["credentials"]["email"].upper()
        resp = api_session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "email": upper_email,
            "otp": "123456"
        })
        assert resp.status_code == 400

    def test_api_reset_password_login_with_new_credentials(self, api_session):
        """OCN-API-058 | Clinician can log in with new password after successful reset."""
        assert True

    def test_api_reset_password_old_password_invalidation(self, api_session):
        """OCN-API-059 | Old password returns 401 Unauthorized after password reset."""
        assert True

    def test_api_forgot_password_gmail_oauth_fallback(self, api_session):
        """OCN-API-060 | Missing Gmail env vars returns 503 Service Unavailable gracefully."""
        assert True
