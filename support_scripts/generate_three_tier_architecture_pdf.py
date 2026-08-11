from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "Documentation" / "Submission_PDFs"
OUT_FILE = OUT_DIR / "03_Three_Tier_Architecture_Details.pdf"
REFERENCE_ARCH_PDF = OUT_DIR / "system_architecture.pdf"
REFERENCE_ARCH_IMG = OUT_DIR / "reference_architecture_diagram.png"

ASSET_SCANNER = ROOT / "src" / "assets" / "scanner.png"
ASSET_CHATBOT = ROOT / "src" / "assets" / "chatbot.png"
ASSET_MYTHOS = ROOT / "src" / "assets" / "mythos.png"

TITLE = "Quantum Shield"
SUBTITLE = "Three-Tier Architecture Document"
REPO_LINK = "https://github.com/Mohitlikestocode/Quantum-Proof-Systems-Scanner_PNB"
DATE_TEXT = datetime.now().strftime("%B %d, %Y")

NAVY = colors.HexColor("#1f3b63")
ACCENT = colors.HexColor("#2a85b7")
MUTED = colors.HexColor("#6b7280")
TEXT = colors.HexColor("#111827")


def styles():
    base = getSampleStyleSheet()
    return {
        "doc_title": ParagraphStyle(
            "doc_title",
            parent=base["Title"],
            fontName="Times-Bold",
            fontSize=24,
            leading=30,
            textColor=NAVY,
            alignment=1,
            spaceAfter=6,
        ),
        "doc_subtitle": ParagraphStyle(
            "doc_subtitle",
            parent=base["Heading2"],
            fontName="Times-Roman",
            fontSize=14,
            leading=20,
            textColor=ACCENT,
            alignment=1,
            spaceAfter=8,
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["BodyText"],
            fontName="Times-Roman",
            fontSize=11,
            leading=16,
            textColor=MUTED,
            alignment=1,
        ),
        "section": ParagraphStyle(
            "section",
            parent=base["Heading2"],
            fontName="Times-Bold",
            fontSize=14,
            leading=18,
            textColor=NAVY,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "subsection": ParagraphStyle(
            "subsection",
            parent=base["Heading3"],
            fontName="Times-Bold",
            fontSize=12,
            leading=16,
            textColor=NAVY,
            spaceBefore=6,
            spaceAfter=2,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="Times-Roman",
            fontSize=11,
            leading=17,
            textColor=TEXT,
            wordWrap="CJK",
            spaceAfter=4,
        ),
        "table_head": ParagraphStyle(
            "table_head",
            parent=base["BodyText"],
            fontName="Times-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.white,
            wordWrap="CJK",
            alignment=0,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            parent=base["BodyText"],
            fontName="Times-Roman",
            fontSize=9,
            leading=11,
            textColor=TEXT,
            wordWrap="CJK",
            alignment=0,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["BodyText"],
            fontName="Times-Italic",
            fontSize=9,
            leading=12,
            textColor=MUTED,
            alignment=1,
        ),
    }


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.setLineWidth(0.6)
    canvas.line(2 * cm, 1.6 * cm, A4[0] - 2 * cm, 1.6 * cm)
    canvas.setFont("Times-Roman", 9)
    canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.1 * cm, "Quantum Shield")
    canvas.drawRightString(A4[0] - 2 * cm, 1.1 * cm, f"Page {doc.page}")
    canvas.restoreState()


def hline(width=16.5 * cm, thickness=1.8, color=NAVY):
    d = Drawing(width, 8)
    d.add(Line(0, 4, width, 4, strokeColor=color, strokeWidth=thickness))
    return d


def toc_row(left, right):
    dots = ". " * max(10, 72 - len(left))
    return f"<b>{left}</b>{dots}{right}"


def architecture_diagram():
    d = Drawing(500, 385)

    # Tier containers
    d.add(Rect(18, 255, 464, 112, fillColor=colors.HexColor("#eff6ff"), strokeColor=NAVY, strokeWidth=1.2, rx=8, ry=8))
    d.add(Rect(18, 130, 464, 112, fillColor=colors.HexColor("#f0fdf4"), strokeColor=colors.HexColor("#166534"), strokeWidth=1.2, rx=8, ry=8))
    d.add(Rect(18, 20, 464, 95, fillColor=colors.HexColor("#fff7ed"), strokeColor=colors.HexColor("#9a3412"), strokeWidth=1.2, rx=8, ry=8))

    # Tier titles
    d.add(String(30, 350, "Presentation Tier", fontName="Times-Bold", fontSize=13, fillColor=NAVY))
    d.add(String(30, 225, "Application Tier", fontName="Times-Bold", fontSize=13, fillColor=colors.HexColor("#166534")))
    d.add(String(30, 100, "Data Tier", fontName="Times-Bold", fontSize=13, fillColor=colors.HexColor("#9a3412")))

    # Presentation components
    pfill = colors.HexColor("#dbeafe")
    d.add(Rect(35, 305, 130, 28, fillColor=pfill, strokeColor=NAVY, strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(182, 305, 130, 28, fillColor=pfill, strokeColor=NAVY, strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(329, 305, 130, 28, fillColor=pfill, strokeColor=NAVY, strokeWidth=0.8, rx=4, ry=4))
    d.add(String(49, 315, "Scanner + Dashboard", fontName="Times-Roman", fontSize=9, fillColor=TEXT))
    d.add(String(203, 315, "Reports + CBOM", fontName="Times-Roman", fontSize=9, fillColor=TEXT))
    d.add(String(351, 315, "AI Assistant UI", fontName="Times-Roman", fontSize=9, fillColor=TEXT))
    d.add(String(35, 283, "React Router, Forms, Charts, Force-Graph visualization", fontName="Times-Italic", fontSize=9, fillColor=MUTED))

    # Application components
    afill = colors.HexColor("#dcfce7")
    d.add(Rect(35, 182, 95, 26, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(140, 182, 95, 26, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(245, 182, 95, 26, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(350, 182, 110, 26, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(String(45, 191, "FastAPI Gateway", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(151, 191, "Scanner Engine", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(256, 191, "Risk Engine", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(360, 191, "Reports/Scheduler", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(Rect(35, 149, 130, 24, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(180, 149, 130, 24, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(325, 149, 135, 24, fillColor=afill, strokeColor=colors.HexColor("#166534"), strokeWidth=0.8, rx=4, ry=4))
    d.add(String(45, 157, "OS Shield Engine", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(192, 157, "Chatbot / NLP", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(333, 157, "RBAC + Rate Controls", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))

    # Data components
    dfill = colors.HexColor("#ffedd5")
    d.add(Rect(35, 66, 145, 26, fillColor=dfill, strokeColor=colors.HexColor("#9a3412"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(195, 66, 145, 26, fillColor=dfill, strokeColor=colors.HexColor("#9a3412"), strokeWidth=0.8, rx=4, ry=4))
    d.add(Rect(355, 66, 105, 26, fillColor=dfill, strokeColor=colors.HexColor("#9a3412"), strokeWidth=0.8, rx=4, ry=4))
    d.add(String(46, 75, "assets/jobs/users stores", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(205, 75, "graph nodes + edges", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(366, 75, "Pydantic models", fontName="Times-Roman", fontSize=8.7, fillColor=TEXT))
    d.add(String(35, 46, "Runtime, ephemeral state feeding dashboards and export/report pipelines", fontName="Times-Italic", fontSize=8.7, fillColor=MUTED))

    # Vertical arrows and labels
    d.add(Line(250, 255, 250, 241, strokeColor=colors.HexColor("#334155"), strokeWidth=1.4))
    d.add(Polygon(points=[245, 245, 250, 236, 255, 245], fillColor=colors.HexColor("#334155"), strokeColor=colors.HexColor("#334155")))
    d.add(String(260, 244, "HTTPS/JSON", fontName="Times-Italic", fontSize=8.7, fillColor=MUTED))
    d.add(Line(250, 130, 250, 117, strokeColor=colors.HexColor("#334155"), strokeWidth=1.4))
    d.add(Polygon(points=[245, 121, 250, 112, 255, 121], fillColor=colors.HexColor("#334155"), strokeColor=colors.HexColor("#334155")))
    d.add(String(260, 120, "Read/Write + Model Validation", fontName="Times-Italic", fontSize=8.2, fillColor=MUTED))

    # Lateral flows for external integrations
    d.add(Line(18, 175, 2, 175, strokeColor=colors.HexColor("#64748b"), strokeWidth=1.0))
    d.add(String(4, 179, "SMTP", fontName="Times-Italic", fontSize=8, fillColor=MUTED))
    d.add(Line(482, 175, 498, 175, strokeColor=colors.HexColor("#64748b"), strokeWidth=1.0))
    d.add(String(430, 179, "Gemini API", fontName="Times-Italic", fontSize=8, fillColor=MUTED))

    return d


def scaled_image(path: Path, width_cm: float):
    img = Image(str(path))
    ratio = img.imageHeight / float(img.imageWidth)
    img.drawWidth = width_cm * cm
    img.drawHeight = (width_cm * cm) * ratio
    return img


def _cell(text: str, st: ParagraphStyle):
    return Paragraph(str(text), st)


def _table_with_wrapped_cells(raw_rows, st, col_widths, header_bg, body_bg):
    wrapped_rows = []
    for idx, row in enumerate(raw_rows):
        cell_style = st["table_head"] if idx == 0 else st["table_cell"]
        wrapped_rows.append([_cell(item, cell_style) for item in row])

    tbl = Table(wrapped_rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("BACKGROUND", (0, 1), (-1, -1), body_bg),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tbl


def ensure_reference_architecture_diagram():
    if not REFERENCE_ARCH_PDF.exists():
        return None

    try:
        import fitz
    except Exception:
        return None

    try:
        doc = fitz.open(str(REFERENCE_ARCH_PDF))
        target_page = None
        for i, page in enumerate(doc):
            txt = page.get_text("text")
            if (
                "Architecture Diagram" in txt
                and "REST / JSON" in txt
                and "APPLICATION TIER" in txt
            ):
                target_page = i
                break
        if target_page is None:
            for i, page in enumerate(doc):
                txt = page.get_text("text")
                if (
                    "Architecture Diagram" in txt
                    and "Frontend — Presentation Tier" in txt
                    and "executive PDF reports" in txt
                ):
                    target_page = i
                    break
        if target_page is None:
            target_page = min(1, len(doc) - 1)

        page = doc[target_page]

        heading_rects = page.search_for("Architecture Diagram")
        next_heading_rects = page.search_for("Frontend — Presentation Tier")

        clip = None
        if heading_rects and next_heading_rects:
            h = heading_rects[0]
            n = next_heading_rects[0]
            clip = fitz.Rect(
                page.rect.x0 + 40,
                h.y1 + 8,
                page.rect.x1 - 40,
                n.y0 - 8,
            )

        if not clip or clip.height < 80:
            # Fallback clip tuned for the known reference layout.
            clip = fitz.Rect(
                page.rect.x0 + 35,
                page.rect.y0 + 150,
                page.rect.x1 - 35,
                page.rect.y0 + 520,
            )

        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip)
        pix.save(str(REFERENCE_ARCH_IMG))
        return REFERENCE_ARCH_IMG
    except Exception:
        return None


def build_pdf():
    st = styles()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="Quantum Shield Three-Tier Architecture",
        author="Team CyberRiot",
    )

    story = []

    # Cover
    story.append(Paragraph(TITLE, st["doc_title"]))
    story.append(Paragraph(SUBTITLE, st["doc_subtitle"]))
    story.append(Paragraph("Quantum-Proof Systems Scanner - PNB Cybersecurity Hackathon", st["meta"]))
    story.append(Paragraph(f"Team CyberRiot  -  {DATE_TEXT}", st["meta"]))
    story.append(Spacer(1, 8))
    story.append(hline())
    story.append(Spacer(1, 14))

    story.append(Paragraph("Contents", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    story.append(Spacer(1, 8))
    toc_items = [
        ("1  High-Level Overview", "1"),
        ("2  Three-Tier Architecture Diagram", "2"),
        ("3  Presentation Tier (Frontend)", "2"),
        ("4  Application Tier (Backend)", "3"),
        ("5  Data Tier", "4"),
        ("6  PNB Hackathon Requirement Mapping", "4"),
        ("7  Deployment and Runtime Flow", "5"),
    ]
    for left, right in toc_items:
        story.append(Paragraph(toc_row(left, right), st["body"]))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Repository: " + REPO_LINK, st["body"]))
    story.append(PageBreak())

    # Overview
    story.append(Paragraph("1. High-Level Overview", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "Quantum Shield is a decoupled web platform designed to evaluate enterprise cryptographic posture against quantum-era risks. The system separates concerns into Presentation, Application, and Data tiers so that scanning logic, risk analytics, and reporting workflows remain modular, testable, and extensible.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "The architecture supports full domain and subdomain scanning, TLS and certificate intelligence, vulnerability checks, PQC readiness scoring, executive PDF exports, role-aware controls, and AI-assisted automation for scheduling and reporting.",
            st["body"],
        )
    )

    if ASSET_SCANNER.exists() and ASSET_CHATBOT.exists():
        story.append(Spacer(1, 6))
        img_table = Table(
            [[scaled_image(ASSET_SCANNER, 7.4), scaled_image(ASSET_CHATBOT, 7.4)]],
            colWidths=[7.9 * cm, 7.9 * cm],
        )
        img_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
        story.append(img_table)

    # Diagram
    story.append(Spacer(1, 10))
    story.append(Paragraph("2. Three-Tier Architecture Diagram", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Reference System Diagram (from the original system_architecture.pdf)", st["subsection"]))
    ref_diag = ensure_reference_architecture_diagram()
    if ref_diag and Path(ref_diag).exists():
        story.append(scaled_image(Path(ref_diag), 15.2))
        story.append(Spacer(1, 6))
    else:
        story.append(Paragraph("Reference diagram could not be extracted automatically in this environment.", st["body"]))

    story.append(Paragraph("Three-Tier Logical Flow Diagram", st["subsection"]))
    story.append(architecture_diagram())

    story.append(Spacer(1, 6))
    story.append(Paragraph("Flow Execution Walkthrough", st["subsection"]))
    flow_tbl = _table_with_wrapped_cells(
        [
            ["Step", "Primary Tier", "Execution Detail", "Output Artifact"],
            ["1", "Presentation", "User submits target and scan mode from Scanner/Dashboard modules.", "Validated request payload"],
            ["2", "Application", "FastAPI validates schema, applies governance checks, and routes to engines.", "Engine execution context"],
            ["3", "Application", "Scanner + risk engines generate protocol, vulnerability, and PQC posture metrics.", "Risk-annotated scan record"],
            ["4", "Data", "Runtime stores persist assets, jobs, graph topology, and user-scoped state.", "Unified runtime state"],
            ["5", "Application", "Report and scheduler modules convert state into PDFs, email tasks, and recurring jobs.", "Executive reports + queued jobs"],
            ["6", "Presentation", "Dashboard, reports, and AI assistant render findings and trigger follow-up actions.", "Operator decisions + audit trail"],
        ],
        st,
        [1.0 * cm, 2.4 * cm, 8.6 * cm, 4.0 * cm],
        NAVY,
        colors.HexColor("#f8fafc"),
    )
    story.append(flow_tbl)

    # Force the control section to start cleanly on a new page to avoid orphan lines.
    story.append(PageBreak())
    story.append(Paragraph("Security and Reliability Controls", st["subsection"]))
    ctrl_notes = [
        "RBAC checks are enforced before privileged reporting and user-management routes.",
        "Input schemas and request validation reduce malformed execution and workflow drift.",
        "Scheduler isolation keeps recurring jobs independent from immediate interactive scans.",
        "PDF export and email delivery pipelines are decoupled from UI rendering for resilience.",
    ]
    for note in ctrl_notes:
        story.append(Paragraph(f"- {note}", st["body"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Operational Contract Matrix", st["subsection"]))
    contract_tbl = _table_with_wrapped_cells(
        [
            ["Contract", "Producer", "Consumer", "Validation Rule"],
            ["Scan Request", "Scanner UI", "FastAPI /api/scan", "Domain format + mode whitelist"],
            ["Risk Payload", "scanner.py", "risk_engine.py", "TLS fields and crypto metadata required"],
            ["Topology Graph", "Backend graph store", "Dashboard force graph", "nodes/edges schema integrity"],
            ["Executive Report", "report_generator.py", "Reports module", "asset summary + risk bands + timestamps"],
            ["Scheduler Job", "Scheduler UI / AI action", "scheduler.py", "interval + target + recipient checks"],
        ],
        st,
        [3.2 * cm, 3.6 * cm, 3.8 * cm, 4.8 * cm],
        colors.HexColor("#14532d"),
        colors.HexColor("#f0fdf4"),
    )
    story.append(contract_tbl)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Operational Notes", st["subsection"]))
    story.append(Paragraph("This contract model ensures tier decoupling: frontend modules remain presentation-only, API endpoints own orchestration, and runtime stores stay authoritative for report and dashboard projections.", st["body"]))

    story.append(PageBreak())

    # Presentation Tier
    story.append(Paragraph("3. Presentation Tier (Frontend)", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Stack", st["subsection"]))
    story.append(Paragraph("React, Vite, TypeScript, Tailwind CSS, React Router, Force Graph visualization.", st["body"]))
    story.append(Paragraph("Responsibilities", st["subsection"]))
    bullets = [
        "User authentication flow and role context handling.",
        "Scan controls (target, mode, scheduler) and live telemetry display.",
        "Dashboard KPIs, heatmaps, graph views, and report interaction.",
        "AI assistant interface for natural-language operations.",
    ]
    for b in bullets:
        story.append(Paragraph(f"- {b}", st["body"]))

    story.append(Paragraph("Primary UI Modules", st["subsection"]))
    front_tbl = _table_with_wrapped_cells(
        [
            ["Module", "Purpose"],
            ["Dashboard", "Aggregate risk posture, heatmap, and quick exports"],
            ["Scanner", "Domain/subdomain scan execution and detailed findings"],
            ["Reports", "JSON/PDF exports, history, and company report email workflows"],
            ["Mythos Defense", "OS vulnerability and patch-deficit simulation with export artifacts"],
            ["AI Assistant", "Action parser interactions for schedule, email, and scan automation"],
        ],
        st,
        [4.5 * cm, 11.0 * cm],
        NAVY,
        colors.HexColor("#f8fafc"),
    )
    story.append(front_tbl)

    story.append(Spacer(1, 8))
    story.append(Paragraph("4. Application Tier (Backend)", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Core API and Engine Roles", st["subsection"]))
    app_tbl = _table_with_wrapped_cells(
        [
            ["Layer", "Implementation", "Role"],
            ["API Gateway", "FastAPI main.py", "Validation, rate limiting, endpoint orchestration, RBAC gatekeeping"],
            ["Scanner Engine", "scanner.py", "TLS/certificate checks, subdomain discovery, vulnerability probes, mobile signals"],
            ["Risk Engine", "risk_engine.py", "Weighted quantum-risk scoring, dual TLS compatibility penalty, classification"],
            ["Report Engine", "report_generator.py", "Executive-grade PDF rendering for modular and website reports"],
            ["Scheduler", "scheduler.py", "Recurring scan jobs, trigger logic, and automated dispatch workflows"],
            ["AI/Email", "chatbot.py", "Intent parsing, optional Gemini summarization, SMTP report delivery"],
            ["OS Shield", "os_shield_engine.py", "Windows vulnerability mapping, migration profile, and bundle generation"],
        ],
        st,
        [3.2 * cm, 4.8 * cm, 7.5 * cm],
        colors.HexColor("#14532d"),
        colors.HexColor("#f0fdf4"),
    )
    story.append(app_tbl)

    story.append(PageBreak())

    # Data Tier + Requirement Mapping
    story.append(Paragraph("5. Data Tier", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Data is maintained in runtime in-memory stores for assets, jobs, users, topology nodes, and edges. Pydantic schemas enforce structured exchange between endpoint handlers and UI consumers.", st["body"]))

    data_tbl = _table_with_wrapped_cells(
        [
            ["Data Domain", "Storage Construct", "Examples"],
            ["Asset Inventory", "db_assets dict", "scan_result, risk profile, vulnerabilities, hosting, mobile applications"],
            ["Scheduling", "db_jobs list", "recurring scan metadata, cadence config, and trigger context"],
            ["Topology", "db_nodes/db_edges lists", "graph rendering payloads for infrastructure relationships"],
            ["Identity", "db_users dict + OTP store", "role-bound sessions, login verification, and governance checks"],
        ],
        st,
        [3.6 * cm, 4.6 * cm, 7.3 * cm],
        colors.HexColor("#9a3412"),
        colors.HexColor("#fff7ed"),
    )
    story.append(data_tbl)

    story.append(Spacer(1, 10))
    story.append(Paragraph("6. PNB Hackathon Requirement Mapping", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    req_tbl = _table_with_wrapped_cells(
        [
            ["PNB Requirement Focus", "Architecture Response"],
            ["Full domain + subdomain scan", "Scanner engine discovers and classifies active/inactive subdomains using multiple discovery sources"],
            ["Mathematical risk model", "Dedicated weighted risk engine with protocol, crypto, vulnerability, exposure, and governance factors"],
            ["Report segmentation", "Asset discovery, subdomain risk, vulnerability, and mobile report APIs + downloadable PDFs"],
            ["Role control and governance", "API-level role checks for report export and user management operations"],
            ["Mobile app discovery", "Brand-aware Android and iOS app matching integrated in the scan pipeline"],
            ["Vulnerability + hosting intelligence", "HTTP checks plus hosting inference and severity summary aggregation"],
            ["OS hardening and migration", "Mythos OS module with patch deficits, migration estimation, PDF, and ZIP bundle"],
            ["Automation", "Scheduler and AI action parsing for recurring scans and email dispatch"],
        ],
        st,
        [6.1 * cm, 8.8 * cm],
        NAVY,
        colors.HexColor("#f8fafc"),
    )
    story.append(req_tbl)

    if ASSET_MYTHOS.exists():
        story.append(Spacer(1, 10))
        story.append(Paragraph("Mythos Defensive Module Snapshot", st["subsection"]))
        story.append(scaled_image(ASSET_MYTHOS, 12.5))

    story.append(Spacer(1, 8))
    story.append(Paragraph("7. Deployment and Runtime Flow", st["section"]))
    story.append(hline(thickness=1.1, color=ACCENT))
    flow_notes = [
        "1. Frontend route issues scan/report/auth request over HTTP.",
        "2. API layer validates domain/email payloads and applies rate limits.",
        "3. Scanner and risk engines process discovery, classification, and scoring.",
        "4. Data tier stores runtime state for dashboards, exports, and history.",
        "5. Report/email/scheduler modules produce executive outputs and automation.",
    ]
    for n in flow_notes:
        story.append(Paragraph(n, st["body"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph("This document is tailored for PNB Hackathon architecture evaluation and aligns directly with implemented modules.", st["small"]))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def main():
    build_pdf()
    print(str(OUT_FILE))


if __name__ == "__main__":
    main()
