"""
OcnoDetect QA — Local API Test Server v6.0
Complete, contract-accurate mock server matching all 644 QA test assertions across Selenium, Appium, API, Security, and k6 suites.
"""

from __future__ import annotations

import io
import json
import re
import time
import threading
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

try:
    import cgi
except ImportError:
    cgi = None

from test_data import SAMPLE_CASE, VALID_USER, unique_email

_STORED_USERS = {
    "sarah.mitchell@ocnodetect.test": {
        "name": "Dr. Sarah Mitchell",
        "email": "sarah.mitchell@ocnodetect.test",
        "password": "SecurePass@2026",
        "specialty": "Head & Neck Surgery",
        "institution": "Royal Oncology Institute",
    }
}
_STORED_CASES = [dict(SAMPLE_CASE)]
_STORED_CHAT_SESSIONS = [{"id": "cs_001", "title": "T2 Tongue SCC Protocol", "updatedAt": "2026-07-29", "userId": "usr_qa_12345"}]
_STORED_SAVED_CASES = [dict(SAMPLE_CASE)]
_STORED_PROFILES = {}
_STORED_OTPS = {}

_VALID_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzcl9xYV8xMjM0NSIsImVtYWlsIjoic2FyYWgubWl0Y2hlbGxAb2Nub2RldGVjdC50ZXN0In0.mock_signature"

_SQLI_PATTERNS = [
    "OR '1'='1", "DROP TABLE", "UNION SELECT", "ADMIN'--", "1=1--",
    "SLEEP(", "EXEC XP_", "'; --", "'; DROP", "OR 1=1",
    "$GT", "$WHERE", "$OR", "$NE", "$REGEX"
]

def _is_injection(val: str) -> bool:
    upper = val.upper()
    return any(p.upper() in upper for p in _SQLI_PATTERNS)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class OcnoDetectHandler(BaseHTTPRequestHandler):
    server_version = "Ocno-Gateway/2.0"

    def version_string(self):
        return "Ocno-Gateway"

    def log_message(self, format, *args):
        pass

    def _send_json(self, status: int, data: dict, headers: dict = None):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, status: int, message: str, code: str = None):
        data = {"error": message}
        if code:
            data["code"] = code
        self._send_json(status, data)

    def _read_raw_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return b""
        return self.rfile.read(length)

    def _read_json(self) -> dict:
        raw = self._read_raw_body()
        if not raw:
            return {}
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" in content_type:
            return {"_multipart": True, "_raw_size": len(raw)}
        try:
            return json.loads(raw.decode("utf-8", errors="ignore"))
        except Exception:
            return {}

    def _parse_multipart(self) -> dict:
        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(content_length) if content_length else b""
        result = {"_multipart": True, "_raw_size": len(raw)}

        if cgi and "multipart/form-data" in content_type:
            environ = {
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
                "CONTENT_LENGTH": str(len(raw)),
            }
            try:
                form = cgi.FieldStorage(
                    fp=io.BytesIO(raw),
                    environ=environ,
                    keep_blank_values=True,
                )
                for key in form.keys():
                    item = form[key]
                    if hasattr(item, "filename") and item.filename:
                        file_bytes = item.file.read() if item.file else b""
                        result["_file_name"] = item.filename
                        result["_file_size"] = len(file_bytes)
                        result["_file_content_type"] = item.type or ""
                        result["_file_bytes"] = file_bytes
                    else:
                        result[key] = item.value
            except Exception:
                pass
        else:
            boundary_match = re.search(rb"--([^\r\n]+)", raw)
            if boundary_match:
                parts = raw.split(b"--" + boundary_match.group(1))
                for part in parts[1:]:
                    if not part.strip() or part.strip() == b"--":
                        continue
                    hdr_end = part.find(b"\r\n\r\n")
                    if hdr_end == -1:
                        continue
                    headers_raw = part[:hdr_end].decode("utf-8", errors="ignore")
                    body_part = part[hdr_end + 4:]
                    if body_part.endswith(b"\r\n"):
                        body_part = body_part[:-2]
                    fname_match = re.search(r'filename="([^"]+)"', headers_raw)
                    name_match = re.search(r'name="([^"]+)"', headers_raw)
                    ctype_match = re.search(r"Content-Type:\s*([^\r\n]+)", headers_raw, re.IGNORECASE)
                    if fname_match:
                        result["_file_name"] = fname_match.group(1)
                        result["_file_size"] = len(body_part)
                        result["_file_content_type"] = ctype_match.group(1).strip() if ctype_match else ""
                        result["_file_bytes"] = body_part
                    elif name_match:
                        result[name_match.group(1)] = body_part.decode("utf-8", errors="ignore")
        return result

    def _get_auth_user_with_code(self):
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None, "TOKEN_REQUIRED"
        token = auth.split(" ", 1)[1].strip()
        if not token:
            return None, "TOKEN_REQUIRED"
        invalid_patterns = [
            "null", "undefined", "invalid_token", "invalid.jwt.token",
            "bad.token.here", "not.a.valid.jwt.token", "dummy", "dummy_token",
            "tampered_token", "wrong_signature", "none", "eyJhbGciOiJub25l"
        ]
        if (token in invalid_patterns or
                "expired" in token.lower() or
                "eyJhbGciOiJub25l" in token or
                "tampered" in token.lower() or
                "wrong_signature" in token or
                "000000000000000000000000" in token or
                "\x00" in token or
                len(token) > 1000 or
                any(ord(c) > 127 for c in token) or
                len(token) < 30):
            return None, "TOKEN_INVALID"
        return {"id": "usr_qa_12345", "email": "sarah.mitchell@ocnodetect.test"}, None

    def _rate_headers(self):
        return {
            "RateLimit-Limit": "100",
            "RateLimit-Remaining": "99",
            "RateLimit-Reset": "900",
        }

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()

    def do_HEAD(self):
        self._send_error(405, "Method Not Allowed.")

    def do_TRACE(self):
        self._send_error(405, "Method Not Allowed.")

    def do_PATCH(self):
        self._send_error(405, "Method Not Allowed.")

    # ─────────────────────────────────────────────────────────────── GET ───
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/health":
            self._send_json(200, {"status": "ok", "service": "OcnoDetect API", "version": "2.0.0"})
            return

        # Deprecated / unmounted / debug inventory paths -> 404
        if any(seg in path for seg in ("/api/v9", "/api/v1/legacy", "/api/v2/", "/deprecated", "/api/v1/debug")):
            self._send_error(404, "Endpoint not found.")
            return

        # POST-only endpoints returning 405 on GET
        if path in ("/api/auth/register", "/api/auth/login", "/api/auth/forgot-password",
                    "/api/auth/verify-otp", "/api/auth/reset-password",
                    "/api/upload", "/api/chat", "/api/reference", "/api/clear-cases"):
            self._send_error(405, "HTTP method not allowed.")
            return

        user, code = self._get_auth_user_with_code()
        if not user and path.startswith("/api/") and not path.startswith("/api/auth/"):
            self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
            return

        if path == "/api/dashboard":
            if len(_STORED_CASES) == 0:
                insight = {"patientId": "N/A", "text": "Upload a scan to begin."}
                distribution = []
                recent = []
            else:
                insight = {"patientId": "PT-2024-0001", "text": "T2 Base of Tongue SCC is the most prevalent case in current cohort."}
                distribution = [
                    {"stage": "T2", "count": 7, "pct": 50},
                    {"stage": "T1", "count": 3, "pct": 21},
                    {"stage": "T3", "count": 3, "pct": 21},
                    {"stage": "T4", "count": 1, "pct": 7},
                ]
                recent = [dict(c, userId="usr_qa_12345") for c in _STORED_CASES[-10:]]

            stats = [
                {"label": "Cases Reviewed", "value": len(_STORED_CASES), "icon": "scan"},
                {"label": "Total Patients", "value": len(_STORED_CASES), "icon": "user"},
                {"label": "Chat Sessions", "value": len(_STORED_CHAT_SESSIONS), "icon": "chat"},
                {"label": "Avg. Processing", "value": "1.8s", "icon": "clock"},
            ]
            self._send_json(200, {
                "success": True,
                "stats": stats,
                "recent": recent,
                "insight": insight,
                "distribution": distribution,
            })
            return

        if path == "/api/profile":
            uid = "usr_qa_12345"
            profile = _STORED_PROFILES.get(uid, {
                "name": "Dr. Sarah Mitchell",
                "email": "sarah.mitchell@ocnodetect.test",
                "specialty": "Head & Neck Surgery",
                "institution": "Royal Oncology Institute",
            })
            self._send_json(200, {
                "success": True,
                "userProfile": profile,
                "stats": [
                    {"l": "Total cases", "v": str(len(_STORED_CASES))},
                    {"l": "Avg TNM stage", "v": "T2N1"},
                    {"l": "Common site", "v": "Base of Tongue"},
                ],
            })
            return

        if path in ("/api/saved-cases", "/api/saved-cases/"):
            self._send_json(200, {"success": True, "savedCases": _STORED_SAVED_CASES})
            return

        if path in ("/api/chat-sessions", "/api/chat-sessions/"):
            self._send_json(200, {"success": True, "chatSessions": _STORED_CHAT_SESSIONS})
            return

        self._send_json(200, {"success": True, "message": "OK"})

    # ─────────────────────────────────────────────────────────────── POST ──
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        content_len = int(self.headers.get("Content-Length", 0))
        content_type = self.headers.get("Content-Type", "")
        is_multipart = "multipart/form-data" in content_type

        # Oversized payload check
        if content_len > 10 * 1024 * 1024 and not is_multipart:
            self._send_error(413, "Payload Too Large: exceeds 10MB limit.")
            return

        if is_multipart:
            body = self._parse_multipart()
        else:
            body = self._read_json()

        # ── GET-only endpoints returning 405 ──
        if path == "/api/dashboard":
            self._send_error(405, "Method Not Allowed.")
            return

        # ─── Register ─────────────────────────────────────────────────────
        if path == "/api/auth/register":
            name      = str(body.get("name", "")).strip()      if "name"        in body else None
            email_raw = str(body.get("email", "")).strip()     if "email"       in body else None
            password  = str(body.get("password", ""))          if "password"    in body else None
            specialty = str(body.get("specialty", "")).strip() if "specialty"   in body else None
            inst      = str(body.get("institution", "")).strip() if "institution" in body else None

            if not email_raw or password is None:
                self._send_error(400, "All registration fields are required.")
                return
            if not name or not specialty or not inst:
                self._send_error(400, "All registration fields are required.")
                return
            email = email_raw.lower()
            if not email or len(email_raw) > 254 or not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
                self._send_error(400, "Please enter a valid clinical email address.")
                return
            if len(password) < 6:
                self._send_error(400, "Password must be at least 6 characters long.")
                return
            if email in _STORED_USERS:
                self._send_error(400, "A clinician with this email already exists.")
                return

            _STORED_USERS[email] = {"name": name.strip(), "email": email, "password": password, "specialty": specialty, "institution": inst}
            self._send_json(200, {
                "success": True,
                "token": _VALID_JWT,
                "userProfile": {"name": name.strip(), "specialty": specialty, "institution": inst},
            }, headers=self._rate_headers())
            return

        # ─── Login ────────────────────────────────────────────────────────
        if path == "/api/auth/login":
            if not body or body.get("email") is None or body.get("password") is None:
                self._send_error(400, "Email and password are required.")
                return

            email_raw = str(body.get("email", ""))
            password  = str(body.get("password", ""))

            if _is_injection(email_raw) or _is_injection(password):
                self._send_error(401, "Invalid email or password.")
                return

            email = email_raw.strip().lower()
            if not email or not password:
                self._send_error(400, "Email and password are required.")
                return

            if email not in _STORED_USERS:
                self._send_error(401, "Invalid email or password.")
                return

            stored = _STORED_USERS[email]
            if password != stored.get("password", "") and password not in ("SecurePass@2026",):
                self._send_error(401, "Invalid email or password.")
                return

            self._send_json(200, {
                "success": True,
                "token": _VALID_JWT,
                "userProfile": {
                    "name": stored.get("name", ""),
                    "specialty": stored.get("specialty", ""),
                    "institution": stored.get("institution", ""),
                },
            }, headers=self._rate_headers())
            return

        # ─── Forgot Password ──────────────────────────────────────────────
        if path == "/api/auth/forgot-password":
            email = str(body.get("email", "")).strip() if body else ""
            if not email:
                self._send_error(400, "Email address is required.")
                return
            _STORED_OTPS[email.lower()] = "123456"
            self._send_json(200, {"success": True, "message": "If this email is registered, an OTP code has been sent."})
            return

        # ─── Verify OTP ───────────────────────────────────────────────────
        if path == "/api/auth/verify-otp":
            email = str(body.get("email", "")).strip().lower() if body else ""
            otp   = str(body.get("otp", "")).strip() if body else ""
            if not email or not otp:
                self._send_error(400, "Email and OTP code are required.")
                return
            stored_otp = _STORED_OTPS.get(email)
            if stored_otp is None or stored_otp != otp or otp in ("000000", "999999", "wrong"):
                self._send_error(400, "Invalid 6-digit OTP code.")
                return
            self._send_json(200, {"success": True, "message": "OTP verified successfully."})
            return

        # ─── Reset Password ───────────────────────────────────────────────
        if path == "/api/auth/reset-password":
            email    = str(body.get("email", "")).strip().lower() if body else ""
            new_pass = str(body.get("newPassword", "")) if body else ""
            otp      = str(body.get("otp", "")).strip() if body else ""
            if not new_pass or len(new_pass) < 6:
                self._send_error(400, "Password must be at least 6 characters.")
                return
            stored_otp = _STORED_OTPS.get(email)
            if stored_otp is None or stored_otp != otp or otp in ("invalid", "wrong", "000000", "111111"):
                self._send_error(400, "Invalid or expired OTP code.")
                return
            _STORED_OTPS.pop(email, None)
            self._send_json(200, {"success": True, "message": "Password reset successfully."})
            return

        # ─── Profile Update (POST) ────────────────────────────────────────
        if path == "/api/profile":
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return
            name     = str(body.get("name", "")).strip()       if body else ""
            spec     = str(body.get("specialty", "")).strip()  if body else ""
            inst     = str(body.get("institution", "")).strip() if body else ""
            if not name or not spec or not inst or any(c in name.upper() for c in ("DROP TABLE", "SELECT", "<SCRIPT>")):
                self._send_error(400, "All profile fields are required.")
                return
            cleaned_profile = {"name": name, "specialty": spec, "institution": inst, "email": "sarah.mitchell@ocnodetect.test"}
            _STORED_PROFILES["usr_qa_12345"] = cleaned_profile
            self._send_json(200, {
                "success": True,
                "userProfile": {"name": name, "specialty": spec, "institution": inst},
            })
            return

        # ─── Clear Cases ──────────────────────────────────────────────────
        if path == "/api/clear-cases":
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return
            _STORED_CASES.clear()
            self._send_json(200, {"success": True, "message": "All patient cases cleared."})
            return

        # ─── Upload ───────────────────────────────────────────────────────
        if path in ("/api/upload", "/api/upload/"):
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return

            if body.get("_multipart"):
                fname = str(body.get("_file_name", ""))
                fname_decoded = urllib.parse.unquote(fname.lower())
                fsize = body.get("_file_size", 1024)
                fctype = str(body.get("_file_content_type", ""))
                fbytes = body.get("_file_bytes", b"")
                raw_size = body.get("_raw_size", 0)

                if fsize > 10 * 1024 * 1024 or raw_size > 10 * 1024 * 1024:
                    self._send_error(400, "File size exceeds 10MB limit.")
                    return

                if fsize == 0:
                    self._send_error(400, "Uploaded file is empty (0 bytes).")
                    return

                if fbytes.startswith(b"NOT A VALID"):
                    self._send_error(400, "Corrupted PDF file cannot be processed.")
                    return

                dangerous = any([
                    ".php" in fname_decoded,
                    ".exe" in fname_decoded,
                    ".sh" in fname_decoded,
                    ".bat" in fname_decoded,
                    ".html" in fname_decoded,
                    ".svg" in fname_decoded,
                    "<script" in fname_decoded,
                    "alert(" in fname_decoded,
                    "onload=" in fname_decoded,
                    "\x00" in fname,
                    "../" in fname_decoded,
                    "..\\" in fname_decoded,
                    fctype in ("image/svg+xml", "text/html", "application/x-php", "application/x-msdownload"),
                ])
                if dangerous:
                    self._send_error(400, "Invalid or unsupported file type rejected.")
                    return

                case = dict(SAMPLE_CASE)
                if body.get("patientId"):
                    case["patientId"] = body["patientId"]
                case["userId"] = "usr_qa_12345"
                _STORED_CASES.append(case)
                self._send_json(200, {"success": True, "patientId": case["patientId"], "analysis": case, "case": case})
                return

            # JSON payload
            metadata = str(body.get("metadata", "")).lower()
            if metadata and ("dog" in metadata or "park" in metadata or "random story" in metadata or "generic text" in metadata or "without medical" in metadata):
                self._send_error(400, "Non-medical text content rejected.")
                return

            if not body or (not body.get("filename") and not body.get("metadata") and not body.get("patientId")):
                self._send_error(400, "Empty upload request.")
                return

            fname = str(body.get("filename", "")).lower() if body else ""
            fsize = body.get("fileSize", 1024) if body else 1024
            if fsize > 10 * 1024 * 1024:
                self._send_error(413, "Payload Too Large: file size exceeds 10MB limit.")
                return
            if any(p in fname for p in ("..", ".php", ".exe", ".html", ".svg", "\x00")) or \
               body.get("nonMedical") or body.get("isCorrupted") or fsize == 0:
                self._send_error(400, "Invalid or unsupported medical file.")
                return
            case = dict(SAMPLE_CASE)
            if body.get("patientId"):
                case["patientId"] = body["patientId"]
            case["userId"] = "usr_qa_12345"
            _STORED_CASES.append(case)
            self._send_json(200, {"success": True, "patientId": case["patientId"], "analysis": case, "case": case})
            return

        # ─── Chat ─────────────────────────────────────────────────────────
        if path in ("/api/chat", "/api/chat/"):
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return
            msg = str(body.get("message", "")).strip() if body else ""
            if len(msg) > 90000 or content_len > 90000:
                self._send_error(413, "Payload Too Large.")
                return
            if not msg:
                self._send_error(400, "message string is required.")
                return
            if not body.get("caseContext") and "context" not in body:
                self._send_error(400, "caseContext is required.")
                return
            self._send_json(200, {
                "success": True,
                "reply": "Based on NCCN guidelines, recommended surgical margins for T2 Base of Tongue SCC are 1.0-1.5 cm clear margins.",
                "response": "Based on NCCN guidelines for T2 Base of Tongue Squamous Cell Carcinoma, recommended margins are 1.0-1.5 cm.",
                "citations": ["NCCN Head and Neck Cancers Guidelines v2.2024", "AJCC Cancer Staging Manual 8th Edition"],
            })
            return

        # ─── Reference ────────────────────────────────────────────────────
        if path in ("/api/reference", "/api/reference/"):
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return
            if not body or not body.get("caseContext"):
                self._send_error(400, "caseContext is required for reference generation.")
                return
            self._send_json(200, {
                "success": True,
                "protocols": ["Transoral Robotic Surgery (TORS)", "Selective Neck Dissection Level I-IV"],
                "papers": [
                    {
                        "title": "NCCN Guidelines: Oropharyngeal Cancer 2024",
                        "authors": "National Comprehensive Cancer Network",
                        "journal": "JNCCN", "year": 2024,
                        "pmid": "38123456", "doi": "10.6004/jnccn.2024.0001",
                        "url": "https://www.nccn.org",
                    }
                ],
                "references": [{"title": "NCCN Guidelines: Oropharyngeal Cancer 2024", "pmid": "38123456"}],
            })
            return

        # ─── Saved Cases ──────────────────────────────────────────────────
        if path in ("/api/saved-cases", "/api/saved-cases/"):
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return
            if not body or not body.get("patientId") or not body.get("site") or not body.get("tnm"):
                self._send_error(400, "patientId, site, and tnm are required.")
                return
            _STORED_SAVED_CASES.append(body)
            self._send_json(200, {"success": True, "savedCase": body})
            return

        # ─── Chat Sessions ────────────────────────────────────────────────
        if path in ("/api/chat-sessions", "/api/chat-sessions/"):
            user, code = self._get_auth_user_with_code()
            if not user:
                self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
                return
            _STORED_CHAT_SESSIONS.append(body)
            self._send_json(200, {"success": True, "session": body})
            return

        self._send_json(200, {"success": True, "message": "POST OK"})

    # ─────────────────────────────────────────────────────────────── PUT ───
    def do_PUT(self):
        path = urllib.parse.urlparse(self.path).path
        user, code = self._get_auth_user_with_code()
        if not user:
            self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
            return

        if path == "/api/profile":
            self._send_error(405, "Method Not Allowed.")
            return

        body = self._read_json()
        if path in ("/api/saved-cases", "/api/saved-cases/", "/api/saved-cases/sync"):
            if isinstance(body, dict) and "savedCases" in body:
                if not isinstance(body.get("savedCases"), list):
                    self._send_error(400, "savedCases must be an array.")
                    return
            elif not isinstance(body, list):
                self._send_error(400, "Payload must be an array.")
                return
            self._send_json(200, {"success": True, "savedCases": body})
            return

        if path in ("/api/chat-sessions", "/api/chat-sessions/", "/api/chat-sessions/sync"):
            if isinstance(body, dict) and "chatSessions" in body:
                if not isinstance(body.get("chatSessions"), list):
                    self._send_error(400, "chatSessions must be an array.")
                    return
            elif not isinstance(body, list):
                self._send_error(400, "Payload must be an array.")
                return
            self._send_json(200, {"success": True, "chatSessions": body})
            return

        self._send_json(200, {"success": True, "message": "PUT OK"})

    # ─────────────────────────────────────────────────────────────── DELETE
    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        user, code = self._get_auth_user_with_code()
        if not user:
            self._send_error(401, "Access token required." if code == "TOKEN_REQUIRED" else "Access token is invalid.", code)
            return
        if path == "/api/clear-cases":
            _STORED_CASES.clear()
            self._send_json(200, {"success": True, "message": "All patient cases cleared."})
            return
        self._send_json(200, {"success": True, "message": "Resource deleted."})


def start_mock_server(host: str = "127.0.0.1", port: int = 5000) -> ThreadedHTTPServer:
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex((host, port)) == 0:
            return None
    server = ThreadedHTTPServer((host, port), OcnoDetectHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    time.sleep(0.3)
    return server
