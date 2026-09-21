import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule, FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from datetime import date, timedelta
import os

wb = openpyxl.Workbook()

# ── Colour palette ──────────────────────────────────────────────────────────
C_HEADER_BG  = "1F3864"   # dark navy
C_HEADER_FG  = "FFFFFF"
C_SUBHDR_BG  = "2E75B6"   # medium blue
C_SUBHDR_FG  = "FFFFFF"
C_ALT_ROW    = "EBF3FB"   # light blue
C_WHITE      = "FFFFFF"
C_CRITICAL   = "FF0000"   # red  (≤30 days)
C_WARNING    = "FFC000"   # amber (31–90 days)
C_OK         = "70AD47"   # green (>90 days)
C_BORDER     = "BDD7EE"

thin  = Side(style="thin",   color=C_BORDER)
thick = Side(style="medium", color="1F3864")
border_all   = Border(left=thin, right=thin, top=thin, bottom=thin)
border_thick = Border(left=thick, right=thick, top=thick, bottom=thick)

def hdr_font(size=11, bold=True, color=C_HEADER_FG):
    return Font(name="Calibri", size=size, bold=bold, color=color)

def cell_font(size=10, bold=False, color="000000"):
    return Font(name="Calibri", size=size, bold=bold, color=color)

def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

def center(wrap=False):
    return Alignment(horizontal="center", vertical="center", wrap_text=wrap)

def left(wrap=False):
    return Alignment(horizontal="left", vertical="center", wrap_text=wrap)

# ============================================================
#  SHEET 1 – DOMAIN TRACKER
# ============================================================
ws_domain = wb.active
ws_domain.title = "Domain Tracker"
ws_domain.sheet_view.showGridLines = False
ws_domain.freeze_panes = "A3"

# ── Title row ────────────────────────────────────────────────
ws_domain.merge_cells("A1:L1")
title_cell = ws_domain["A1"]
title_cell.value = "🌐  GrahVarta — Domain Resource Tracker"
title_cell.font  = Font(name="Calibri", size=16, bold=True, color=C_HEADER_FG)
title_cell.fill  = fill(C_HEADER_BG)
title_cell.alignment = center()
ws_domain.row_dimensions[1].height = 36

# ── Column headers ────────────────────────────────────────────
domain_headers = [
    ("A", "S.No",              8),
    ("B", "Domain Name",       28),
    ("C", "Registrar",         18),
    ("D", "Purchase Date",     16),
    ("E", "Expiry Date",       16),
    ("F", "Days Remaining",    16),
    ("G", "Status",            14),
    ("H", "Auto-Renew",        13),
    ("I", "DNS Provider",      18),
    ("J", "SSL Expiry",        16),
    ("K", "Linked Project",    22),
    ("L", "Notes",             30),
]

for col_letter, heading, width in domain_headers:
    c = ws_domain[f"{col_letter}2"]
    c.value = heading
    c.font  = hdr_font(10)
    c.fill  = fill(C_SUBHDR_BG)
    c.alignment = center(wrap=True)
    c.border = border_all
    ws_domain.column_dimensions[col_letter].width = width

ws_domain.row_dimensions[2].height = 30

# ── Sample data ───────────────────────────────────────────────
today = date.today()
domain_data = [
    (1, "grahvarta.com",      "GoDaddy",    date(2024,  3, 15), date(2026, 3, 15),  "Yes", "Cloudflare",  date(2026,  6, 15), "Main App",      "Primary domain"),
    (2, "grahvarta.in",       "Namecheap",  date(2024,  5,  1), date(2026, 5,  1),  "Yes", "Cloudflare",  date(2026,  5,  1), "India Market",  ""),
    (3, "grahvarta.app",      "Google",     date(2025,  1, 20), date(2026, 1, 20),  "No",  "Google DNS",  date(2025, 12, 31), "PWA",           "Renewal pending"),
    (4, "astrology.grahvarta.com", "GoDaddy", date(2024, 8, 10), date(2026, 8, 10), "Yes", "Cloudflare", date(2026,  8, 10), "Astrologer App","Subdomain"),
]

for row_idx, (sno, domain, registrar, purchase, expiry, auto_renew,
              dns, ssl_expiry, project, notes) in enumerate(domain_data, start=3):
    days_left = (expiry - today).days
    bg = C_ALT_ROW if row_idx % 2 == 0 else C_WHITE

    values = [sno, domain, registrar, purchase, expiry,
              f"=E{row_idx}-TODAY()", "",   # Days Remaining & Status filled by formula
              auto_renew, dns, ssl_expiry, project, notes]

    for col_idx, val in enumerate(values, start=1):
        c = ws_domain.cell(row=row_idx, column=col_idx, value=val)
        c.font      = cell_font()
        c.fill      = fill(bg)
        c.border    = border_all
        c.alignment = center() if col_idx in (1, 7, 8) else left()
        if col_idx in (4, 5, 10):  # date columns
            c.number_format = "DD-MMM-YYYY"
        if col_idx == 6:           # Days Remaining — formula
            c.number_format = "0"

    ws_domain.row_dimensions[row_idx].height = 22

# ── Conditional formatting: Status column (G) ─────────────────
# We'll use a formula-driven approach via DATA VALIDATION for Status
# and colour the Days Remaining column with a 3-colour scale
ws_domain.conditional_formatting.add(
    f"F3:F200",
    ColorScaleRule(
        start_type="num", start_value=0,   start_color=C_CRITICAL,
        mid_type="num",   mid_value=60,    mid_color="FFC000",
        end_type="num",   end_value=365,   end_color=C_OK,
    )
)

# Auto-populate Status with formula in column G
for row_idx in range(3, 203):
    c = ws_domain.cell(row=row_idx, column=7)
    if row_idx <= 6:  # keep sample rows
        pass
    c.value = f'=IF(F{row_idx}="","",IF(F{row_idx}<=30,"🔴 Critical",IF(F{row_idx}<=90,"🟡 Expiring Soon","🟢 Active")))'
    c.alignment = center()
    c.font = cell_font(bold=False)

# ── Data validation: Auto-Renew ───────────────────────────────
dv_renew = DataValidation(type="list", formula1='"Yes,No,Manual"', showDropDown=False)
ws_domain.add_data_validation(dv_renew)
dv_renew.sqref = "H3:H200"


# ============================================================
#  SHEET 2 – HOSTING TRACKER
# ============================================================
ws_host = wb.create_sheet("Hosting Tracker")
ws_host.sheet_view.showGridLines = False
ws_host.freeze_panes = "A3"

ws_host.merge_cells("A1:M1")
h_title = ws_host["A1"]
h_title.value = "🖥️  GrahVarta — Hosting Resource Tracker"
h_title.font  = Font(name="Calibri", size=16, bold=True, color=C_HEADER_FG)
h_title.fill  = fill(C_HEADER_BG)
h_title.alignment = center()
ws_host.row_dimensions[1].height = 36

hosting_headers = [
    ("A", "S.No",           8),
    ("B", "Service Name",   24),
    ("C", "Provider",       16),
    ("D", "Type",           16),
    ("E", "Region",         14),
    ("F", "Purchase Date",  16),
    ("G", "Expiry Date",    16),
    ("H", "Days Remaining", 16),
    ("I", "Status",         14),
    ("J", "Monthly Cost",   14),
    ("K", "Auto-Renew",     13),
    ("L", "Linked Domain",  22),
    ("M", "Notes",          30),
]

for col_letter, heading, width in hosting_headers:
    c = ws_host[f"{col_letter}2"]
    c.value = heading
    c.font  = hdr_font(10)
    c.fill  = fill(C_SUBHDR_BG)
    c.alignment = center(wrap=True)
    c.border = border_all
    ws_host.column_dimensions[col_letter].width = width

ws_host.row_dimensions[2].height = 30

hosting_data = [
    (1, "AWS EC2 – Main",        "AWS",         "VPS / EC2",         "ap-south-1", date(2025, 1,  1), date(2026,  1,  1), "Yes", 45.00,  "grahvarta.com",       "t3.medium instance"),
    (2, "Firebase Hosting",      "Google",      "Static / CDN",      "Global",     date(2024, 6, 15), date(2026,  6, 15), "Yes",  0.00,  "grahvarta.app",       "Free tier"),
    (3, "AWS RDS – Postgres",    "AWS",         "Managed Database",  "ap-south-1", date(2025, 1,  1), date(2026,  1,  1), "Yes", 35.00,  "grahvarta.com",       "db.t3.micro"),
    (4, "Cloudflare Pro",        "Cloudflare",  "CDN / Security",    "Global",     date(2025, 3,  1), date(2026,  3,  1), "Yes", 20.00,  "All domains",         ""),
    (5, "Play Store Account",    "Google",      "App Distribution",  "Global",     date(2024, 1, 10), date(2099, 12, 31), "N/A",  0.00,  "GrahVarta Apps",      "One-time $25 paid"),
    (6, "Apple Developer",       "Apple",       "App Distribution",  "Global",     date(2025, 4,  1), date(2026,  4,  1), "Yes", 99.00,  "GrahVarta iOS",       "Annual renewal"),
]

for row_idx, (sno, service, provider, stype, region,
              purchase, expiry, auto_renew, cost, linked, notes) in enumerate(hosting_data, start=3):
    bg = C_ALT_ROW if row_idx % 2 == 0 else C_WHITE

    row_vals = [sno, service, provider, stype, region,
                purchase, expiry,
                f"=G{row_idx}-TODAY()",   # Days Remaining
                "",                        # Status (formula below)
                cost, auto_renew, linked, notes]

    for col_idx, val in enumerate(row_vals, start=1):
        c = ws_host.cell(row=row_idx, column=col_idx, value=val)
        c.font      = cell_font()
        c.fill      = fill(bg)
        c.border    = border_all
        c.alignment = center() if col_idx in (1, 9, 11) else left()
        if col_idx in (6, 7):
            c.number_format = "DD-MMM-YYYY"
        if col_idx == 8:
            c.number_format = "0"
        if col_idx == 10:
            c.number_format = '"$"#,##0.00'

    ws_host.row_dimensions[row_idx].height = 22

# Status formula
for row_idx in range(3, 203):
    c = ws_host.cell(row=row_idx, column=9)
    c.value = f'=IF(G{row_idx}="","",IF(G{row_idx}>TODAY()+3650,"🔵 Permanent",IF(H{row_idx}<=30,"🔴 Critical",IF(H{row_idx}<=90,"🟡 Expiring Soon","🟢 Active"))))'
    c.alignment = center()
    c.font = cell_font()

# Colour scale on Days Remaining
ws_host.conditional_formatting.add(
    "H3:H200",
    ColorScaleRule(
        start_type="num", start_value=0,   start_color=C_CRITICAL,
        mid_type="num",   mid_value=60,    mid_color="FFC000",
        end_type="num",   end_value=365,   end_color=C_OK,
    )
)

dv_renew2 = DataValidation(type="list", formula1='"Yes,No,Manual,N/A"', showDropDown=False)
ws_host.add_data_validation(dv_renew2)
dv_renew2.sqref = "K3:K200"


# ============================================================
#  SHEET 3 – DASHBOARD / SUMMARY
# ============================================================
ws_dash = wb.create_sheet("Dashboard", 0)  # insert at front
ws_dash.sheet_view.showGridLines = False

ws_dash.merge_cells("A1:H1")
d_title = ws_dash["A1"]
d_title.value = "📊  GrahVarta — Resource Expiry Dashboard"
d_title.font  = Font(name="Calibri", size=18, bold=True, color=C_HEADER_FG)
d_title.fill  = fill(C_HEADER_BG)
d_title.alignment = center()
ws_dash.row_dimensions[1].height = 40
ws_dash.column_dimensions["A"].width = 28
for col in "BCDEFGH":
    ws_dash.column_dimensions[col].width = 16

# Summary cards header
ws_dash.merge_cells("A3:H3")
c = ws_dash["A3"]
c.value = "DOMAIN SUMMARY"
c.font  = hdr_font(12)
c.fill  = fill(C_SUBHDR_BG)
c.alignment = center()
ws_dash.row_dimensions[3].height = 26

summary_labels = [
    ("A4", "Total Domains"),
    ("A5", "Critical (≤30 days)"),
    ("A6", "Expiring Soon (≤90 days)"),
    ("A7", "Active / Healthy"),
]
for cell_ref, label in summary_labels:
    c = ws_dash[cell_ref]
    c.value = label
    c.font  = cell_font(bold=True)
    c.fill  = fill(C_ALT_ROW)
    c.alignment = left()
    c.border = border_all

# Formula cells (column B)
domain_formulas = [
    ("B4", "=COUNTA('Domain Tracker'!B3:B200)"),
    ("B5", '=COUNTIF(\'Domain Tracker\'!G3:G200,"🔴 Critical")'),
    ("B6", '=COUNTIF(\'Domain Tracker\'!G3:G200,"🟡 Expiring Soon")'),
    ("B7", '=COUNTIF(\'Domain Tracker\'!G3:G200,"🟢 Active")'),
]
for cell_ref, formula in domain_formulas:
    c = ws_dash[cell_ref]
    c.value = formula
    c.font  = cell_font(bold=True, color="1F3864")
    c.fill  = fill(C_WHITE)
    c.alignment = center()
    c.border = border_all

ws_dash.merge_cells("A9:H9")
c = ws_dash["A9"]
c.value = "HOSTING SUMMARY"
c.font  = hdr_font(12)
c.fill  = fill(C_SUBHDR_BG)
c.alignment = center()
ws_dash.row_dimensions[9].height = 26

hosting_summary = [
    ("A10", "Total Services"),
    ("A11", "Critical (≤30 days)"),
    ("A12", "Expiring Soon (≤90 days)"),
    ("A13", "Active / Healthy"),
    ("A14", "Monthly Cost (USD)"),
]
hosting_formulas = [
    ("B10", "=COUNTA('Hosting Tracker'!B3:B200)"),
    ("B11", '=COUNTIF(\'Hosting Tracker\'!I3:I200,"🔴 Critical")'),
    ("B12", '=COUNTIF(\'Hosting Tracker\'!I3:I200,"🟡 Expiring Soon")'),
    ("B13", '=COUNTIF(\'Hosting Tracker\'!I3:I200,"🟢 Active")'),
    ("B14", "=SUM('Hosting Tracker'!J3:J200)"),
]
for (lref, label), (fref, formula) in zip(hosting_summary, hosting_formulas):
    lc = ws_dash[lref]
    lc.value = label
    lc.font  = cell_font(bold=True)
    lc.fill  = fill(C_ALT_ROW)
    lc.alignment = left()
    lc.border = border_all

    fc = ws_dash[fref]
    fc.value = formula
    fc.font  = cell_font(bold=True, color="1F3864")
    fc.fill  = fill(C_WHITE)
    fc.alignment = center()
    fc.border = border_all
    if lref == "A14":
        fc.number_format = '"$"#,##0.00'

ws_dash["B14"].number_format = '"$"#,##0.00'

# Last updated note
ws_dash["A16"].value = f"Last updated: {today.strftime('%d %b %Y')}"
ws_dash["A16"].font  = Font(name="Calibri", size=9, italic=True, color="888888")

# ── Save ──────────────────────────────────────────────────────
out_path = "d:/grahvartaapp/GrahVarta_Resource_Tracker.xlsx"
wb.save(out_path)
print(f"Saved: {out_path}")
