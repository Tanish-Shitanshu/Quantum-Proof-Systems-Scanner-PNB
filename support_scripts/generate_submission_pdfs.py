from pathlib import Path
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "Documentation" / "Submission_PDFs"

PROJECT_NAME = "Quantum Shield: Enterprise Post-Quantum Security Platform"
REPO_LINK = "https://github.com/Mohitlikestocode/Quantum-Proof-Systems-Scanner_PNB"
PACKAGE_NAME = "quantum-shield-pnb"


def _p(text: str, st):
    return Paragraph(text, st["body"])


def _cell(text: str, st, head=False):
    style = ParagraphStyle(
        "tbl_head" if head else "tbl_body",
        parent=st["body"],
        fontName="Helvetica-Bold" if head else "Helvetica",
        fontSize=8.8,
        leading=11.2,
        textColor=colors.white if head else colors.HexColor("#111827"),
    )
    return Paragraph(text, style)


def _styled_table(rows, widths, st, header_bg=colors.HexColor("#0B1F4D"), body_bg=colors.HexColor("#F8FAFC")):
    wrapped = []
    for i, row in enumerate(rows):
        wrapped.append([_cell(col, st, head=(i == 0)) for col in row])
    tbl = Table(wrapped, colWidths=widths, repeatRows=1)
    tbl.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("BACKGROUND", (0, 1), (-1, -1), body_bg),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )
    return tbl


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0B1F4D"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1F3A8A"),
            spaceAfter=14,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceAfter=5,
        ),
        "mono": ParagraphStyle(
            "Mono",
            parent=base["Code"],
            fontName="Courier",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#111827"),
            backColor=colors.HexColor("#F3F4F6"),
            borderPadding=6,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#475569"),
            alignment=1,
        ),
    }


def _header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.drawString(2 * cm, 1.2 * cm, f"{PROJECT_NAME}")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _doc(filename: str) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        str(OUT_DIR / filename),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2 * cm,
        title=PROJECT_NAME,
        author="Team CyberRiot",
    )


def _cover(st, report_title: str):
    generated = datetime.now().strftime("%Y-%m-%d %H:%M")
    return [
        Paragraph(report_title, st["title"]),
        Paragraph("Submission Document", st["subtitle"]),
        Paragraph(f"Solution Name: <b>{PROJECT_NAME}</b>", st["body"]),
        Paragraph(f"Repository: <u>{REPO_LINK}</u>", st["body"]),
        Paragraph(f"Generated: {generated}", st["body"]),
        Spacer(1, 8),
    ]


def build_solution_overview_pdf():
    st = _styles()
    story = []
    story.extend(_cover(st, "Document 1: Solution Name and Repository Details"))

    story.append(Paragraph("Official Solution Name", st["h1"]))
    story.append(Paragraph(PROJECT_NAME, st["body"]))

    story.append(Paragraph("Updated Repository Link", st["h1"]))
    story.append(Paragraph(REPO_LINK, st["body"]))

    story.append(Paragraph("Project Identification", st["h1"]))
    data = [
        ["Field", "Value"],
        ["Package Name", PACKAGE_NAME],
        ["Team", "CyberRiot"],
        ["Primary Domain", "Post-Quantum Security Scanning and Reporting"],
        ["Frontend", "React + Vite + TypeScript + Tailwind CSS"],
        ["Backend", "FastAPI + Python Engine Modules"],
    ]
    table = Table(data, colWidths=[5.5 * cm, 10.8 * cm])
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1F4D")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Executive Description", st["h1"]))
    story.append(
        Paragraph(
            "Quantum Shield is an enterprise-grade post-quantum security platform designed to scan domains and subdomains, detect cryptographic weaknesses, classify risk posture, produce governance-ready reports, and support OS-level defensive analysis. The platform unifies scanner telemetry, risk scoring, reporting, scheduling, and AI-assisted operations in one integrated interface.",
            st["body"],
        )
    )

    story.append(Spacer(1, 18))
    story.append(Paragraph("Prepared for formal submission and technical evaluation.", st["small"]))

    doc = _doc("01_Solution_Name_and_Repository.pdf")
    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)


def build_installation_pdf():
    st = _styles()
    story = []
    story.extend(_cover(st, "Document 2: Updated Installation Document"))

    story.append(Paragraph("1. Installation Scope", st["h1"]))
    story.append(_p("This guide provisions Quantum Shield end-to-end for development, technical demonstration, and deployment validation. It includes full hardware/software requirements, operating-system compatibility, dependency inventory, runtime configuration, startup commands, verification checks, and hardening checkpoints.", st))

    story.append(Paragraph("2. Hardware Sizing", st["h1"]))
    story.append(
        _styled_table(
            [
                ["Profile", "CPU", "Memory", "Disk", "Network"],
                ["Minimum (Local Demo)", "2 logical cores", "4 GB RAM", "2 GB free", "Stable internet"],
                ["Recommended (Team Dev)", "4-8 logical cores", "8-16 GB RAM", "5-10 GB free", "Broadband"],
                ["Staging / Internal Pilot", "8+ logical cores", "16 GB+ RAM", "20 GB+ SSD", "Low-latency enterprise network"],
            ],
            [3.8 * cm, 2.7 * cm, 2.8 * cm, 2.6 * cm, 4.4 * cm],
            st,
        )
    )

    story.append(Paragraph("3. Supported Operating Systems", st["h1"]))
    story.append(
        _styled_table(
            [
                ["Operating System", "Support", "Notes"],
                ["Windows 10/11 (x64)", "Primary", "Validated for PowerShell workflow and backend report generation"],
                ["Ubuntu 20.04+ / Debian-based Linux", "Supported", "Use python3 + pip3 and Node.js LTS packages"],
                ["macOS 12+ (Apple Silicon / Intel)", "Supported", "Use Homebrew-managed Python and Node.js"],
            ],
            [5.4 * cm, 2.2 * cm, 8.2 * cm],
            st,
        )
    )

    story.append(Paragraph("4. Mandatory Software Prerequisites", st["h1"]))
    story.append(
        _styled_table(
            [
                ["Component", "Version", "Purpose"],
                ["Python", "3.10+", "Backend API, engines, scheduler, PDF generation"],
                ["pip", "23+ recommended", "Install backend libraries from requirements.txt"],
                ["Node.js", "20.19+ or 22.12+", "Frontend runtime and Vite tooling"],
                ["npm", "10+ recommended", "Install JavaScript dependencies and run scripts"],
                ["Git", "2.35+", "Source retrieval and version tracking"],
            ],
            [3.6 * cm, 3.0 * cm, 9.2 * cm],
            st,
        )
    )
    story.append(_p("Optional utilities: OpenSSL CLI (certificate inspection), curl/Postman (API validation), and a modern Chromium-based browser for dashboard rendering.", st))

    story.append(PageBreak())
    story.append(Paragraph("5. Dependency Inventory", st["h1"]))
    story.append(_p("Backend libraries (from backend/requirements.txt):", st))
    story.append(
        _styled_table(
            [
                ["Library", "Role"],
                ["fastapi", "HTTP API framework and endpoint layer"],
                ["uvicorn", "ASGI server runtime"],
                ["pydantic", "Data contracts and request/response validation"],
                ["python-multipart", "Multipart/form-data request handling"],
                ["requests", "HTTP client calls for integrations"],
                ["cryptography", "Cryptographic processing and security operations"],
                ["python-dotenv", "Environment variable loading from .env"],
                ["apscheduler", "Scheduled and recurring scan jobs"],
                ["dateparser", "Natural-language date and schedule parsing"],
                ["reportlab", "Executive PDF report generation"],
            ],
            [4.4 * cm, 11.4 * cm],
            st,
            header_bg=colors.HexColor("#14532D"),
            body_bg=colors.HexColor("#F0FDF4"),
        )
    )

    story.append(Spacer(1, 6))
    story.append(_p("Frontend runtime + build libraries (from package.json):", st))
    story.append(
        _styled_table(
            [
                ["Category", "Packages"],
                ["Runtime", "react, react-dom, react-router-dom, react-force-graph-2d"],
                ["Build", "vite, typescript, @vitejs/plugin-react"],
                ["Styling", "tailwindcss, postcss, autoprefixer, @tailwindcss/forms, @tailwindcss/container-queries"],
                ["Lint/Quality", "eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals"],
                ["Type Definitions", "@types/node, @types/react, @types/react-dom"],
            ],
            [3.6 * cm, 12.2 * cm],
            st,
            header_bg=colors.HexColor("#1E3A8A"),
            body_bg=colors.HexColor("#EFF6FF"),
        )
    )

    story.append(Paragraph("6. Environment Configuration", st["h1"]))
    story.append(_p("Create a backend environment file at backend/.env and set only the keys required by the optional features you plan to enable (AI summary and/or email dispatch).", st))
    story.append(
        _styled_table(
            [
                ["Variable", "Required", "Description"],
                ["GEMINI_API_KEY", "Optional (feature-dependent)", "Enables AI summarization and chatbot-assisted responses"],
                ["SMTP_EMAIL", "Optional (feature-dependent)", "Sender address used for scheduled/direct report emails"],
                ["SMTP_PASSWORD", "Optional (feature-dependent)", "SMTP authentication secret for sender account"],
            ],
            [4.2 * cm, 3.8 * cm, 7.8 * cm],
            st,
            header_bg=colors.HexColor("#7C2D12"),
            body_bg=colors.HexColor("#FFF7ED"),
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("7. Installation Steps", st["h1"]))
    story.append(_p("A) Clone repository", st))
    story.append(Paragraph("git clone https://github.com/Mohitlikestocode/Quantum-Proof-Systems-Scanner_PNB.git\ncd Quantum-Proof-Systems-Scanner_PNB", st["mono"]))

    story.append(_p("B) Frontend dependency install", st))
    story.append(Paragraph("npm install", st["mono"]))

    story.append(_p("C) Backend dependency install", st))
    story.append(Paragraph("cd backend\npip install -r requirements.txt", st["mono"]))

    story.append(_p("D) Run backend service", st))
    story.append(Paragraph("cd backend\nuvicorn main:app --reload --host 0.0.0.0 --port 8000", st["mono"]))

    story.append(_p("E) Run frontend service", st))
    story.append(Paragraph("npm run dev", st["mono"]))

    story.append(_p("F) Production frontend build (optional validation)", st))
    story.append(Paragraph("npm run build\nnpm run preview", st["mono"]))

    story.append(Paragraph("8. Runtime Verification Checklist", st["h1"]))
    checks = [
        "Backend health: API service responds and docs open at http://localhost:8000/docs",
        "Frontend health: Vite serves dashboard on the local URL reported in terminal",
        "Functional validation: run at least one scan and confirm dashboard tables/graphs populate",
        "Reporting validation: generate a PDF report and verify file creation/download",
        "Optional integration check: validate AI summary or SMTP dispatch when keys are configured",
    ]
    for line in checks:
        story.append(_p(f"- {line}", st))

    story.append(Paragraph("9. Troubleshooting and Hardening", st["h1"]))
    hardening = [
        "Use Python virtual environments to isolate backend packages and prevent global version conflicts.",
        "Pin dependency versions for reproducible CI and deployment builds.",
        "Restrict environment file access and rotate API/SMTP secrets periodically.",
        "Run the backend behind a reverse proxy for TLS termination in shared environments.",
        "Enable periodic dependency audits (npm audit / pip-audit) in CI pipelines.",
    ]
    for line in hardening:
        story.append(_p(f"- {line}", st))

    story.append(Spacer(1, 18))
    story.append(Paragraph("This installation document is comprehensive for current repository implementation and submission review readiness.", st["small"]))

    doc = _doc("02_Installation_Document.pdf")
    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)


def build_architecture_pdf():
    st = _styles()
    story = []
    story.extend(_cover(st, "Document 3: Updated 3-Tier Architecture Details"))

    story.append(Paragraph("Architecture Summary", st["h1"]))
    story.append(
        Paragraph(
            "The solution follows a classic 3-tier architecture: Presentation Tier (React web interface), Application Tier (FastAPI orchestration and engine services), and Data Tier (in-memory stores plus model contracts and controlled external integrations).",
            st["body"],
        )
    )

    story.append(Paragraph("Tier Breakdown", st["h1"]))
    tier_data = [
        ["Tier", "Primary Components", "Responsibilities"],
        [
            "Presentation Tier",
            "React + Vite + TypeScript UI modules",
            "User authentication flow, scan controls, dashboards, reports, visualizations, AI assistant interface",
        ],
        [
            "Application Tier",
            "FastAPI endpoints and Python engines",
            "Input validation, scan orchestration, risk scoring, scheduling, PDF generation, chatbot actions, governance checks",
        ],
        [
            "Data Tier",
            "In-memory stores + schema models",
            "Asset/job/user/graph persistence during runtime, structured data exchange, report payload composition",
        ],
    ]
    tiers = Table(tier_data, colWidths=[3.3 * cm, 5.3 * cm, 7.7 * cm])
    tiers.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1F4D")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(tiers)

    story.append(Paragraph("Architecture Diagram", st["h1"]))
    diagram_lines = [
        "+--------------------------------------------------------------+",
        "|                    PRESENTATION TIER                        |",
        "|      Browser UI (React + Vite + TypeScript + Tailwind)     |",
        "+---------------------------+----------------------------------+",
        "                            | HTTPS/JSON API Calls",
        "+---------------------------v----------------------------------+",
        "|                    APPLICATION TIER                         |",
        "| FastAPI API Layer (main.py)                                 |",
        "|  - Scanner Orchestration    - Risk Engine                   |",
        "|  - Reports/PDF Engine       - Scheduler                     |",
        "|  - Chatbot/Email Actions    - RBAC/Governance               |",
        "+---------------------------+----------------------------------+",
        "                            | Read/Write Runtime Data",
        "+---------------------------v----------------------------------+",
        "|                         DATA TIER                           |",
        "| In-memory data stores (assets/users/jobs/nodes/edges)       |",
        "| Pydantic schema models + controlled external integrations    |",
        "+--------------------------------------------------------------+",
    ]
    story.append(Paragraph("<br/>".join(diagram_lines), st["mono"]))

    story.append(Paragraph("Data Flow Notes", st["h1"]))
    notes = [
        "1. UI components submit scan/report/auth actions through REST endpoints.",
        "2. API layer validates inputs, applies rate limits, and invokes engines.",
        "3. Engine outputs are normalized and stored in runtime data structures.",
        "4. Reports and exports are generated from aggregated in-memory state.",
        "5. Optional external providers support AI summarization and SMTP delivery.",
    ]
    for item in notes:
        story.append(Paragraph(item, st["body"]))

    story.append(Spacer(1, 18))
    story.append(Paragraph("3-tier architecture details are aligned with the current code implementation.", st["small"]))

    doc = _doc("03_Three_Tier_Architecture_Details.pdf")
    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_solution_overview_pdf()
    build_installation_pdf()
    print("PDF generation complete:")
    print(OUT_DIR / "01_Solution_Name_and_Repository.pdf")
    print(OUT_DIR / "02_Installation_Document.pdf")
    print("03_Three_Tier_Architecture_Details.pdf is generated via support_scripts/generate_three_tier_architecture_pdf.py")


if __name__ == "__main__":
    main()
