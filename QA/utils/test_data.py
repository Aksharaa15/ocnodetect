"""
OcnoDetect QA — Shared Test Data and Fixtures
Provides consistent test data across Selenium, Appium, API, and Security suites.
"""

import os
import uuid
from datetime import datetime

# ─── API Configuration ────────────────────────────────────────────────────────

BASE_URL = os.environ.get("OCNODETECT_API_URL", "http://127.0.0.1:5000")
WEB_URL  = os.environ.get("OCNODETECT_WEB_URL",  "https://ocnodetect.vercel.app")

# ─── Valid Clinician Credentials ──────────────────────────────────────────────

VALID_USER = {
    "name":        "Dr. Sarah Mitchell",
    "email":       "sarah.mitchell@ocnodetect.test",
    "password":    "SecurePass@2026",
    "specialty":   "Head & Neck Oncology Surgery",
    "institution": "Royal Oncology Institute",
}

VALID_USER_2 = {
    "name":        "Dr. James Thornton",
    "email":       "james.thornton@ocnodetect.test",
    "password":    "Secure#Pass2026",
    "specialty":   "Head & Neck Surgery",
    "institution": "Metro Cancer Centre",
}

ADMIN_USER = {
    "name":        "Dr. Amanda Walsh",
    "email":       "amanda.walsh@ocnodetect.test",
    "password":    "AdminSecure@2026",
    "specialty":   "Surgical Oncology",
    "institution": "National Head & Neck Institute",
}

# ─── Invalid / Edge-Case Credentials ─────────────────────────────────────────

INVALID_EMAIL_FORMATS = [
    "notanemail",
    "missing@domain",
    "@nodomain.com",
    "spaces in@email.com",
    "double@@domain.com",
    "",
    "   ",
    "toolong" + "a" * 250 + "@domain.com",
]

WEAK_PASSWORDS = [
    "12345",
    "abc",
    "",
    " ",
    "12",
]

SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT NULL,NULL,NULL--",
    "admin'--",
    "' OR 1=1--",
    "'; EXEC xp_cmdshell('dir'); --",
    "' AND SLEEP(5)--",
]

NOSQL_INJECTION_PAYLOADS = [
    {"$gt": ""},
    {"$ne": None},
    {"$where": "this.email == this.email"},
    {"$regex": ".*"},
]

XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    '<img src=x onerror=alert(1)>',
    "javascript:alert('XSS')",
    "<svg onload=alert(1)>",
    '"><script>alert(document.cookie)</script>',
    "<iframe src=javascript:alert(1)>",
]

PATH_TRAVERSAL_PAYLOADS = [
    "../../etc/passwd",
    "../../../windows/system32/drivers/etc/hosts",
    "..%2F..%2Fetc%2Fpasswd",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
]

# ─── Sample Clinical Data ─────────────────────────────────────────────────────

SAMPLE_PATIENT_IDS = [
    "PT-2024-A7K3Q",
    "PT-2025-B8M4R",
    "PT-2024-C9N5S",
    "PT-2025-D0P6T",
    "PT-2024-E1Q7U",
]

SAMPLE_CASE = {
    "patientId":   "PT-2024-A7K3Q",
    "site":        "Base of Tongue",
    "tnm":         "T2N1M0",
    "confidence":  0.92,
    "findings": [
        "Primary tumor 2.8 x 1.9 x 1.3 cm, moderate differentiation, depth of invasion 8 mm",
        "Single ipsilateral level II lymph node 1.4 cm, no extranodal extension",
        "Surgical margins clear, closest deep margin 3.2 mm",
        "No perineural invasion or lymphovascular invasion identified",
        "AI-generated summary. Final clinical responsibility remains with the surgeon.",
    ],
    "differentials": [
        {"diagnosis": "Squamous Cell Carcinoma, HPV-positive", "probability": "Primary"},
        {"diagnosis": "Undifferentiated Carcinoma", "probability": "Less likely"},
    ],
    "surgicalConsiderations": [
        "Temporary surgical tracheostomy anticipated due to post-operative airway edema risk",
        "RFFF recommended for thin mucosal defect reconstruction with facial-lingual anastomosis",
        "Ipsilateral selective neck dissection levels I-IV with contralateral level II sampling",
        "PEG tube placement for post-operative swallowing rehabilitation",
    ],
    "protocol": "NCCN Head & Neck: Oropharynx HPV-positive T2N1M0 — Primary surgical resection with adjuvant radiation 60 Gy in 30 fractions",
    "prognosticFactors": [
        "HPV/p16 positive — associated with improved 5-year disease-free survival ~85%",
        "Non-smoker, no alcohol history — favourable mutational signature",
        "Low-risk staging cohort — estimated 5-year DFS 82–87%",
    ],
    "multidisciplinaryRecommendations": [
        "Adjuvant IMRT 60 Gy in 30 fractions to high-risk operative bed",
        "SLP swallowing assessment pre-operatively, resume exercises week 3 post-operatively",
        "Pre-radiation dental extraction and oral hygiene protocol",
    ],
    "date": "Today, 14:32",
}

SAMPLE_CHAT_MESSAGE = {
    "message": "What are the recommended surgical margins for T2 base of tongue SCC?",
    "history": [],
    "caseContext": SAMPLE_CASE,
}

# ─── File Upload Test Data ─────────────────────────────────────────────────────

MINIMAL_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj "
    b"xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n"
    b"0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\n"
    b"startxref\n190\n%%EOF"
)

SAMPLE_ONCOLOGY_REPORT_TEXT = """
PATHOLOGY REPORT
Patient: PT-2024-TEST
Date: 2024-09-15
Institution: Royal Oncology Institute

SPECIMEN: Right base of tongue lesion, biopsy

MACROSCOPIC DESCRIPTION:
Received in formalin, measuring 1.8 x 1.2 x 0.9 cm, tan-grey firm tissue.

MICROSCOPIC DESCRIPTION:
Sections show moderately differentiated squamous cell carcinoma with invasive nests.
Depth of invasion: 7mm. Perineural invasion: absent. Lymphovascular invasion: absent.
Margins: closest margin 2.8mm at deep aspect.

LYMPH NODES: 2/14 positive. Largest deposit 1.3cm. No extranodal extension.

HPV STATUS: p16 positive (IHC 3+)

DIAGNOSIS: Squamous Cell Carcinoma, Base of Tongue, HPV-positive
STAGING: T2N1M0 (AJCC 8th Edition)
"""

# ─── JWT Test Tokens ──────────────────────────────────────────────────────────

EXPIRED_JWT = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpZCI6IjY0YzBmMTIzNDU2Nzg5MGFiY2RlZjAxMiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ."
    "invalid_signature_for_expired_token"
)

MALFORMED_JWT = "not.a.valid.jwt.token"

NONE_ALGORITHM_JWT = (
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0."
    "eyJpZCI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSJ9."
)

TAMPERED_JWT_PAYLOAD = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpZCI6IjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ."
    "wrong_signature"
)

# ─── Rate Limit Test Config ───────────────────────────────────────────────────

AUTH_RATE_LIMIT_MAX   = 15   # 15 requests per 15 minutes on /api/auth/*
GENERAL_RATE_LIMIT_MAX = 100  # 100 requests per 15 minutes on /api/*
AI_MINUTE_LIMIT_MAX   = 15   # 15 AI requests per minute (global)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def unique_email(prefix: str = "qa") -> str:
    """Generate a unique email for test isolation."""
    ts = datetime.utcnow().strftime("%H%M%S")
    uid = uuid.uuid4().hex[:6]
    return f"{prefix}.{ts}.{uid}@ocnodetect.test"


def unique_patient_id() -> str:
    """Generate a unique patient ID."""
    ts = datetime.utcnow().strftime("%Y")
    uid = uuid.uuid4().hex[:5].upper()
    return f"PT-{ts}-{uid}"


def registration_payload(
    name: str = None,
    email: str = None,
    password: str = None,
    specialty: str = None,
    institution: str = None,
) -> dict:
    """Build a valid registration payload with optional overrides."""
    return {
        "name":        VALID_USER["name"] if name is None else name,
        "email":       unique_email() if email is None else email,
        "password":    VALID_USER["password"] if password is None else password,
        "specialty":   VALID_USER["specialty"] if specialty is None else specialty,
        "institution": VALID_USER["institution"] if institution is None else institution,
    }
