"""
OcnoDetect QA — Professional Excel & HTML Report Generator
Generates a comprehensive multi-sheet Excel workbook and standalone HTML report
summarising all QA suites: Selenium, Appium, API, Load, Security.
"""

from __future__ import annotations

import os
import sys
import glob
import re
import ast
import datetime
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional

try:
    import openpyxl
    from openpyxl.styles import (
        PatternFill, Font, Alignment, Border, Side, GradientFill
    )
    from openpyxl.utils import get_column_letter
    from openpyxl.chart import BarChart, Reference
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False
    print("WARNING: openpyxl not installed. Excel report will not be generated.")

# ─── Constants ────────────────────────────────────────────────────────────────

QA_ROOT = Path(__file__).parent.parent
REPORTS_DIR = QA_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

TIMESTAMP = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
EXCEL_REPORT  = REPORTS_DIR / f"OcnoDetect_QA_Report_{TIMESTAMP}.xlsx"
HTML_REPORT   = REPORTS_DIR / f"OcnoDetect_QA_Report_{TIMESTAMP}.html"
SUMMARY_JSON  = REPORTS_DIR / f"OcnoDetect_QA_Summary_{TIMESTAMP}.json"

# ─── Colour Palette ──────────────────────────────────────────────────────────

DARK_NAVY   = "0D1B2A"
TEAL_ACCENT = "00C2CC"
GREEN_PASS  = "27AE60"
RED_FAIL    = "E74C3C"
AMBER_SKIP  = "F39C12"
PURPLE_SEC  = "8E44AD"
BLUE_LOAD   = "2980B9"
LIGHT_ROW   = "F2F8FC"
ALT_ROW     = "E8F4FD"
HEADER_TEXT = "FFFFFF"

# ─── Data Classes ────────────────────────────────────────────────────────────

@dataclass
class TestCase:
    test_id:     str
    suite:       str
    category:    str
    name:        str
    description: str
    status:      str = "PENDING"
    duration_ms: int = 0
    error_msg:   str = ""

@dataclass
class SuiteSummary:
    name:    str
    total:   int = 0
    passed:  int = 0
    failed:  int = 0
    skipped: int = 0
    pending: int = 0

# ─── Test Discovery ──────────────────────────────────────────────────────────

def _extract_docstring(src: str) -> str:
    """Return the first line of a function's docstring if present."""
    try:
        # Grab content between triple quotes
        m = re.search(r'"""(.+?)"""', src, re.DOTALL)
        if m:
            return m.group(1).strip().split("\n")[0]
    except Exception:
        pass
    return ""

def discover_tests(suite_dir: Path, suite_name: str, category: str) -> List[TestCase]:
    """Walk a test directory and extract TestCase objects from docstrings."""
    cases: List[TestCase] = []
    pattern = str(suite_dir / "**" / "test_*.py")
    for filepath in sorted(glob.glob(pattern, recursive=True)):
        try:
            src = Path(filepath).read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        # Find all test function definitions
        for m in re.finditer(
            r'def (test_[a-zA-Z0-9_]+)\(self.*?\):\n\s+"""(.*?)"""',
            src, re.DOTALL
        ):
            fn_name  = m.group(1)
            doc      = m.group(2).strip().split("\n")[0]
            # Extract test ID from docstring (e.g. "OCN-SE-001 | ...")
            id_match = re.match(r'(OCN-[A-Z0-9\-]+)\s*\|\s*(.*)', doc)
            if id_match:
                test_id  = id_match.group(1)
                desc     = id_match.group(2).strip()
            else:
                test_id  = fn_name.upper().replace("_", "-")
                desc     = doc
            cases.append(TestCase(
                test_id=test_id,
                suite=suite_name,
                category=category,
                name=fn_name,
                description=desc,
                status="PENDING",
            ))
    return cases

def load_all_tests() -> Dict[str, List[TestCase]]:
    suites = {
        "Selenium Web":     (QA_ROOT / "selenium" / "tests", "Selenium (Web UI)"),
        "Appium Mobile":    (QA_ROOT / "appium"   / "tests", "Appium (Android)"),
        "API":              (QA_ROOT / "api"       / "tests", "REST API"),
        "Security":         (QA_ROOT / "security"  / "tests", "OWASP Security"),
        "Load":             (QA_ROOT / "load"      / "k6",    "k6 Performance"),
    }
    all_cases: Dict[str, List[TestCase]] = {}
    for suite_name, (suite_dir, category) in suites.items():
        if suite_name == "Load":
            # Load tests are JS — extract scenarios from CSV
            cases = _load_k6_scenarios()
        else:
            cases = discover_tests(suite_dir, suite_name, category)
        all_cases[suite_name] = cases
    return all_cases

def _load_k6_scenarios() -> List[TestCase]:
    """Parse load_scenarios.csv for load test cases."""
    csv_path = QA_ROOT / "load" / "scenarios" / "load_scenarios.csv"
    cases: List[TestCase] = []
    try:
        lines = csv_path.read_text(encoding="utf-8").strip().split("\n")
        for line in lines[1:]:  # skip header
            parts = line.split(",", 5)
            if len(parts) >= 6:
                cases.append(TestCase(
                    test_id=parts[0].strip(),
                    suite="Load",
                    category=f"{parts[1].strip()} / {parts[2].strip()}",
                    name=f"{parts[3].strip()} VUs — {parts[4].strip()}",
                    description=parts[5].strip(),
                    status="PENDING",
                ))
    except Exception as e:
        print(f"WARNING: Could not parse load scenarios CSV: {e}")
    return cases

# ─── Excel Report ─────────────────────────────────────────────────────────────

def _make_border(color: str = "CCCCCC") -> Border:
    s = Side(border_style="thin", color=color)
    return Border(left=s, right=s, top=s, bottom=s)

def _make_header_fill(color: str = DARK_NAVY) -> PatternFill:
    return PatternFill("solid", fgColor=color)

def _make_row_fill(index: int) -> PatternFill:
    color = LIGHT_ROW if index % 2 == 0 else ALT_ROW
    return PatternFill("solid", fgColor=color)

def _status_fill(status: str) -> PatternFill:
    color_map = {
        "PASS":    GREEN_PASS,
        "FAIL":    RED_FAIL,
        "SKIP":    AMBER_SKIP,
        "PENDING": "A0A0A0",
    }
    return PatternFill("solid", fgColor=color_map.get(status.upper(), "AAAAAA"))

def write_suite_sheet(wb: "openpyxl.Workbook", sheet_name: str, cases: List[TestCase]) -> SuiteSummary:
    """Write one suite's test cases to a dedicated sheet."""
    ws = wb.create_sheet(title=sheet_name[:31])
    summary = SuiteSummary(name=sheet_name)

    # Column headers
    headers = ["Test ID", "Suite", "Category", "Test Name", "Description", "Status", "Duration (ms)", "Notes"]
    col_widths = [18, 18, 22, 40, 70, 10, 14, 30]

    header_fill = _make_header_fill()
    header_font = Font(name="Calibri", bold=True, color=HEADER_TEXT, size=10)
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align   = Alignment(horizontal="left",   vertical="center", wrap_text=True)

    for ci, (h, w) in enumerate(zip(headers, col_widths), 1):
        cell = ws.cell(row=1, column=ci, value=h)
        cell.fill      = header_fill
        cell.font      = header_font
        cell.alignment = center_align
        cell.border    = _make_border("888888")
        ws.column_dimensions[get_column_letter(ci)].width = w

    ws.row_dimensions[1].height = 30
    ws.freeze_panes = "A2"

    for ri, tc in enumerate(cases, 2):
        row_fill = _make_row_fill(ri)
        row_data = [tc.test_id, tc.suite, tc.category, tc.name, tc.description, tc.status, tc.duration_ms, tc.error_msg]
        for ci, value in enumerate(row_data, 1):
            cell = ws.cell(row=ri, column=ci, value=value)
            cell.border    = _make_border()
            cell.font      = Font(name="Calibri", size=9)
            cell.alignment = left_align if ci > 1 else center_align
            if ci == 6:  # Status column
                cell.fill = _status_fill(tc.status)
                cell.font = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
            else:
                cell.fill = row_fill
        ws.row_dimensions[ri].height = 20

        # Tally
        summary.total += 1
        s = tc.status.upper()
        if s == "PASS":   summary.passed  += 1
        elif s == "FAIL": summary.failed  += 1
        elif s == "SKIP": summary.skipped += 1
        else:             summary.pending += 1

    # Auto-filter
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(cases) + 1}"
    return summary

def write_summary_sheet(wb: "openpyxl.Workbook", summaries: List[SuiteSummary]):
    """Write the executive summary sheet."""
    ws = wb.create_sheet(title="Executive Summary", index=0)
    ws.sheet_view.showGridLines = False

    # Title banner
    ws.merge_cells("A1:I3")
    title_cell = ws["A1"]
    title_cell.value     = "OcnoDetect QA Automation Framework — Executive Summary"
    title_cell.fill      = _make_header_fill(DARK_NAVY)
    title_cell.font      = Font(name="Calibri", bold=True, color=HEADER_TEXT, size=18)
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 50

    # Metadata
    meta = [
        ("Generated:", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("Project:", "OcnoDetect — Clinical AI Oncology Platform"),
        ("Repository:", "github.com/Aksharaa15/ocnodetect"),
        ("Framework:", "Selenium + Appium + pytest + k6 + OWASP"),
    ]
    for row_i, (label, value) in enumerate(meta, 5):
        ws.cell(row=row_i, column=1, value=label).font = Font(bold=True, name="Calibri")
        ws.cell(row=row_i, column=2, value=value).font = Font(name="Calibri")
        ws.row_dimensions[row_i].height = 18

    # Suite totals table
    tbl_row = 11
    tbl_headers = ["Suite", "Total", "Passed", "Failed", "Skipped", "Pending", "Pass Rate"]
    tbl_fill    = _make_header_fill(TEAL_ACCENT)
    for ci, h in enumerate(tbl_headers, 1):
        cell = ws.cell(row=tbl_row, column=ci, value=h)
        cell.fill      = tbl_fill
        cell.font      = Font(bold=True, color=HEADER_TEXT, name="Calibri", size=10)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border    = _make_border("888888")

    ws.column_dimensions["A"].width = 22
    for c in "BCDEFG":
        ws.column_dimensions[c].width = 14

    grand_total = grand_passed = grand_failed = grand_skipped = grand_pending = 0
    for si, s in enumerate(summaries, tbl_row + 1):
        pass_rate = f"{(s.passed / s.total * 100):.1f}%" if s.total > 0 else "N/A"
        row_data  = [s.name, s.total, s.passed, s.failed, s.skipped, s.pending, pass_rate]
        row_fill  = _make_row_fill(si)
        for ci, value in enumerate(row_data, 1):
            cell = ws.cell(row=si, column=ci, value=value)
            cell.fill      = row_fill
            cell.font      = Font(name="Calibri", size=10)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border    = _make_border()
        ws.row_dimensions[si].height = 22
        grand_total   += s.total
        grand_passed  += s.passed
        grand_failed  += s.failed
        grand_skipped += s.skipped
        grand_pending += s.pending

    # Grand total row
    grand_row = tbl_row + len(summaries) + 1
    grand_rate = f"{(grand_passed / grand_total * 100):.1f}%" if grand_total > 0 else "N/A"
    grand_data = ["TOTAL", grand_total, grand_passed, grand_failed, grand_skipped, grand_pending, grand_rate]
    grand_fill = _make_header_fill(DARK_NAVY)
    for ci, value in enumerate(grand_data, 1):
        cell = ws.cell(row=grand_row, column=ci, value=value)
        cell.fill      = grand_fill
        cell.font      = Font(bold=True, color=HEADER_TEXT, name="Calibri", size=10)
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border    = _make_border("888888")
    ws.row_dimensions[grand_row].height = 24

def generate_excel_report(all_cases: Dict[str, List[TestCase]]):
    if not OPENPYXL_AVAILABLE:
        return
    wb = openpyxl.Workbook()
    # Remove default empty sheet
    if "Sheet" in wb.sheetnames:
        del wb["Sheet"]

    summaries: List[SuiteSummary] = []
    sheet_name_map = {
        "Selenium Web":  "Selenium Web",
        "Appium Mobile": "Appium Android",
        "API":           "API Tests",
        "Security":      "Security OWASP",
        "Load":          "Load k6",
    }
    for suite_key, cases in all_cases.items():
        sheet_name = sheet_name_map.get(suite_key, suite_key)
        summary = write_suite_sheet(wb, sheet_name, cases)
        summaries.append(summary)

    write_summary_sheet(wb, summaries)
    wb.save(str(EXCEL_REPORT))
    print(f"[OK] Excel report saved: {EXCEL_REPORT}")
    return summaries

# ─── HTML Report ──────────────────────────────────────────────────────────────

def generate_html_report(all_cases: Dict[str, List[TestCase]], summaries: List[SuiteSummary]):
    total_tests  = sum(s.total   for s in summaries)
    total_passed = sum(s.passed  for s in summaries)
    total_failed = sum(s.failed  for s in summaries)
    total_pending= sum(s.pending for s in summaries)
    pass_rate    = f"{(total_passed / total_tests * 100):.1f}%" if total_tests else "N/A"

    suite_rows = ""
    for s in summaries:
        rate = f"{(s.passed / s.total * 100):.1f}%" if s.total else "N/A"
        bar  = f'<div class="progress"><div class="bar" style="width:{(s.passed/s.total*100) if s.total else 0:.0f}%"></div></div>'
        suite_rows += f"""
        <tr>
          <td><strong>{s.name}</strong></td>
          <td class="num">{s.total}</td>
          <td class="pass">{s.passed}</td>
          <td class="fail">{s.failed}</td>
          <td class="skip">{s.pending}</td>
          <td>{rate} {bar}</td>
        </tr>"""

    test_rows_by_suite = ""
    for suite_key, cases in all_cases.items():
        test_rows_by_suite += f'<tr class="suite-header"><td colspan="5">📋 {suite_key} ({len(cases)} tests)</td></tr>\n'
        for tc in cases[:300]:  # Cap at 300 rows per suite in HTML for perf
            badge_class = {"PASS": "badge-pass", "FAIL": "badge-fail", "PENDING": "badge-pending"}.get(tc.status.upper(), "badge-skip")
            test_rows_by_suite += f"""
            <tr>
              <td class="mono">{tc.test_id}</td>
              <td>{tc.category}</td>
              <td class="desc">{tc.description}</td>
              <td><span class="badge {badge_class}">{tc.status}</span></td>
              <td class="num">{tc.duration_ms}ms</td>
            </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OcnoDetect QA Report — {TIMESTAMP}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Inter', sans-serif; background: #0D1B2A; color: #E8F4FD; min-height: 100vh; }}
  header {{ background: linear-gradient(135deg, #0D1B2A 0%, #1A3A5C 50%, #00C2CC22 100%);
           border-bottom: 2px solid #00C2CC; padding: 40px 60px; position: relative; overflow: hidden; }}
  header::before {{ content: ''; position: absolute; top: -50%; left: -10%; width: 40%; height: 200%;
                   background: radial-gradient(circle, #00C2CC15, transparent 70%); }}
  h1 {{ font-size: 2.2rem; font-weight: 900; color: #fff;
        background: linear-gradient(90deg, #00C2CC, #7B2FBE, #00C2CC);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
  .subtitle {{ color: #A0C4D8; margin-top: 8px; font-size: 0.95rem; }}
  .meta {{ display: flex; gap: 24px; margin-top: 20px; flex-wrap: wrap; }}
  .meta-item {{ background: #1A3A5C88; border: 1px solid #00C2CC44; border-radius: 8px;
                padding: 10px 18px; font-size: 0.85rem; color: #A0C4D8; }}
  .meta-item strong {{ color: #00C2CC; display: block; font-size: 1.4rem; font-weight: 700; }}
  main {{ max-width: 1400px; margin: 0 auto; padding: 40px 30px; }}
  section {{ margin-bottom: 40px; }}
  h2 {{ font-size: 1.2rem; font-weight: 700; color: #00C2CC; margin-bottom: 16px;
        border-left: 4px solid #00C2CC; padding-left: 12px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; }}
  th {{ background: #1A3A5C; color: #00C2CC; font-weight: 600; padding: 12px 14px;
        text-align: left; border-bottom: 2px solid #00C2CC55; }}
  td {{ padding: 10px 14px; border-bottom: 1px solid #1A3A5C; vertical-align: top; }}
  tr:hover td {{ background: #1A3A5C55; }}
  tr.suite-header td {{ background: #0D2A40; color: #00C2CC; font-weight: 700;
                        font-size: 0.9rem; border-top: 3px solid #00C2CC33; }}
  .num {{ text-align: center; font-weight: 600; }}
  .pass {{ color: #27AE60; font-weight: 700; text-align: center; }}
  .fail {{ color: #E74C3C; font-weight: 700; text-align: center; }}
  .skip {{ color: #F39C12; font-weight: 700; text-align: center; }}
  .mono {{ font-family: monospace; font-size: 0.8rem; color: #00C2CC; }}
  .desc {{ color: #C8DCE8; }}
  .badge {{ padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }}
  .badge-pass {{ background: #27AE6033; color: #27AE60; border: 1px solid #27AE60; }}
  .badge-fail {{ background: #E74C3C33; color: #E74C3C; border: 1px solid #E74C3C; }}
  .badge-pending {{ background: #A0A0A033; color: #C0C0C0; border: 1px solid #888; }}
  .badge-skip {{ background: #F39C1233; color: #F39C12; border: 1px solid #F39C12; }}
  .progress {{ background: #1A3A5C; border-radius: 8px; height: 8px; margin-top: 6px; }}
  .bar {{ background: linear-gradient(90deg, #27AE60, #00C2CC); height: 8px; border-radius: 8px;
          transition: width 0.3s; }}
  footer {{ text-align: center; padding: 30px; color: #4A6F8A; font-size: 0.8rem;
            border-top: 1px solid #1A3A5C; margin-top: 40px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }}
  .stat-card {{ background: linear-gradient(135deg, #1A3A5C, #0D2A40);
                border: 1px solid #00C2CC33; border-radius: 12px; padding: 20px;
                text-align: center; }}
  .stat-card .val {{ font-size: 2.5rem; font-weight: 900; color: #00C2CC; }}
  .stat-card .lbl {{ color: #A0C4D8; font-size: 0.85rem; margin-top: 4px; }}
</style>
</head>
<body>
<header>
  <h1>OcnoDetect QA Automation Report</h1>
  <div class="subtitle">Comprehensive QA Framework — Clinical AI Oncology Platform</div>
  <div class="meta">
    <div class="meta-item"><strong>{total_tests}</strong>Total Tests</div>
    <div class="meta-item"><strong style="color:#27AE60">{total_passed}</strong>Passed</div>
    <div class="meta-item"><strong style="color:#E74C3C">{total_failed}</strong>Failed</div>
    <div class="meta-item"><strong style="color:#A0A0A0">{total_pending}</strong>Pending</div>
    <div class="meta-item"><strong style="color:#F39C12">{pass_rate}</strong>Pass Rate</div>
    <div class="meta-item"><strong style="color:#A0C4D8;font-size:0.9rem">{TIMESTAMP}</strong>Generated</div>
  </div>
</header>
<main>
  <section>
    <h2>Suite Summary</h2>
    <table>
      <thead><tr>
        <th>Suite</th><th>Total</th><th>Passed</th><th>Failed</th><th>Pending</th><th>Pass Rate</th>
      </tr></thead>
      <tbody>{suite_rows}</tbody>
    </table>
  </section>
  <section>
    <h2>Test Case Inventory</h2>
    <table>
      <thead><tr>
        <th>Test ID</th><th>Category</th><th>Description</th><th>Status</th><th>Duration</th>
      </tr></thead>
      <tbody>{test_rows_by_suite}</tbody>
    </table>
  </section>
</main>
<footer>
  OcnoDetect QA Automation Framework &nbsp;|&nbsp; Generated {datetime.datetime.now().strftime("%d %b %Y %H:%M")} &nbsp;|&nbsp;
  Repository: github.com/Aksharaa15/ocnodetect
</footer>
</body>
</html>"""

    HTML_REPORT.write_text(html, encoding="utf-8")
    print(f"[OK] HTML report saved: {HTML_REPORT}")

# ─── JSON Summary ──────────────────────────────────────────────────────────────

def save_json_summary(summaries: List[SuiteSummary], all_cases: Dict[str, List[TestCase]]):
    data = {
        "generated_at": TIMESTAMP,
        "project": "OcnoDetect — Clinical AI Oncology Platform",
        "suites": [
            {
                "name":    s.name,
                "total":   s.total,
                "passed":  s.passed,
                "failed":  s.failed,
                "skipped": s.skipped,
                "pending": s.pending,
                "pass_rate": f"{(s.passed / s.total * 100):.1f}%" if s.total else "N/A",
            }
            for s in summaries
        ],
        "grand_total":  sum(s.total   for s in summaries),
        "grand_passed": sum(s.passed  for s in summaries),
        "grand_failed": sum(s.failed  for s in summaries),
        "grand_pending":sum(s.pending for s in summaries),
    }
    SUMMARY_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[OK] JSON summary saved: {SUMMARY_JSON}")

# ─── Entry Point ──────────────────────────────────────────────────────────────

def main():
    print("\n[*] Discovering OcnoDetect QA test cases...")
    all_cases = load_all_tests()

    total_discovered = sum(len(v) for v in all_cases.values())
    print(f"[+] Discovered {total_discovered} total test cases across {len(all_cases)} suites.")

    for suite, cases in all_cases.items():
        print(f"    - {suite}: {len(cases)} tests")

    print("\n[*] Generating Excel report...")
    summaries = generate_excel_report(all_cases)

    if summaries:
        print("\n[*] Generating HTML report...")
        generate_html_report(all_cases, summaries)

        print("\n[*] Saving JSON summary...")
        save_json_summary(summaries, all_cases)

    print("\n[OK] All reports generated successfully.")
    print(f"   Excel : {EXCEL_REPORT}")
    print(f"   HTML  : {HTML_REPORT}")
    print(f"   JSON  : {SUMMARY_JSON}")

if __name__ == "__main__":
    main()
