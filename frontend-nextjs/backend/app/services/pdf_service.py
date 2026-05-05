"""
PDF generation service.
Uses ReportLab for fast, dependency-light PDFs.
"""
from io import BytesIO
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.pdfgen.canvas import Canvas

# Brand colors
GOLD = colors.HexColor("#b8863f")
GOLD_LIGHT = colors.HexColor("#d4a574")
INK = colors.HexColor("#08080a")
GRAY = colors.HexColor("#71717a")
LIGHT_GRAY = colors.HexColor("#e4e4e7")
CREAM = colors.HexColor("#faf7f2")


def _make_styles():
    """Build custom paragraph styles matching brand."""
    base = getSampleStyleSheet()

    return {
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"],
            fontName="Times-Roman", fontSize=36, leading=44,
            textColor=INK, spaceAfter=12, alignment=TA_LEFT,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"],
            fontName="Times-Italic", fontSize=20, leading=26,
            textColor=GOLD, spaceBefore=20, spaceAfter=10,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"],
            fontName="Helvetica-Bold", fontSize=11, leading=14,
            textColor=GRAY, spaceBefore=8, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body", parent=base["BodyText"],
            fontName="Helvetica", fontSize=10.5, leading=16,
            textColor=INK, alignment=TA_JUSTIFY, spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "small", parent=base["BodyText"],
            fontName="Helvetica", fontSize=8.5, leading=12,
            textColor=GRAY,
        ),
        "mono": ParagraphStyle(
            "mono", parent=base["BodyText"],
            fontName="Courier", fontSize=9, leading=12,
            textColor=GRAY,
        ),
        "label": ParagraphStyle(
            "label", parent=base["BodyText"],
            fontName="Helvetica-Bold", fontSize=8, leading=10,
            textColor=GRAY,
        ),
        "value": ParagraphStyle(
            "value", parent=base["BodyText"],
            fontName="Helvetica", fontSize=14, leading=18,
            textColor=INK,
        ),
    }


def _draw_brand_header(canvas: Canvas, doc):
    """Draw header on every page."""
    canvas.saveState()

    # Gold accent line
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.5)
    canvas.line(2 * cm, A4[1] - 1.5 * cm, A4[0] - 2 * cm, A4[1] - 1.5 * cm)

    # Brand mark
    canvas.setFont("Times-Bold", 9)
    canvas.setFillColor(INK)
    canvas.drawString(2 * cm, A4[1] - 1.2 * cm, "LUXE CAPITAL")

    canvas.setFont("Courier", 7)
    canvas.setFillColor(GRAY)
    canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, "STOCK INTELLIGENCE")

    # Footer
    canvas.setFont("Courier", 7)
    canvas.setFillColor(GRAY)
    canvas.drawString(2 * cm, 1.5 * cm, "FOR RESEARCH ONLY · NOT INVESTMENT ADVICE")
    canvas.drawRightString(
        A4[0] - 2 * cm, 1.5 * cm,
        f"PAGE {doc.page}",
    )

    canvas.restoreState()


def _markdown_to_paragraphs(md_text: str, styles: dict) -> list:
    """Convert simple markdown (## headings, paragraphs) to flowables."""
    elements = []
    for line in md_text.split("\n"):
        line = line.rstrip()
        if not line:
            elements.append(Spacer(1, 4))
            continue
        if line.startswith("## "):
            text = line[3:].strip()
            # Strip emoji at start (📊, 💪, etc.)
            if text and not text[0].isascii():
                text = text[1:].strip()
            elements.append(Paragraph(text, styles["h2"]))
        elif line.startswith("### "):
            elements.append(Paragraph(line[4:].strip(), styles["h3"]))
        elif line.startswith("# "):
            elements.append(Paragraph(line[2:].strip(), styles["h1"]))
        elif line.startswith("---"):
            elements.append(Spacer(1, 8))
        elif line.startswith("- ") or line.startswith("* "):
            elements.append(Paragraph(f"• {line[2:].strip()}", styles["body"]))
        else:
            # bold **text**
            text = line
            while "**" in text:
                text = text.replace("**", "<b>", 1).replace("**", "</b>", 1)
            elements.append(Paragraph(text, styles["body"]))
    return elements


# ─── AI Report PDF ──────────────────────────────────────
def build_ai_report_pdf(
    symbol: str,
    company_name: str,
    analysis_md: str,
    metrics: dict,
    generated_at: Optional[datetime] = None,
) -> bytes:
    """
    Generate a polished PDF of an AI analysis report.
    Returns PDF bytes.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2.5 * cm, bottomMargin=2.5 * cm,
        title=f"{symbol} — Equity Research",
        author="Luxe Capital",
    )
    styles = _make_styles()
    story = []
    generated_at = generated_at or datetime.utcnow()

    # ─── Title page ─────────────────────────────────────
    story.append(Spacer(1, 30))
    story.append(Paragraph("EQUITY RESEARCH MEMO", styles["label"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"<b>{symbol}</b>", styles["h1"]))
    if company_name:
        story.append(Paragraph(f"<i>{company_name}</i>", styles["h2"]))
    story.append(Spacer(1, 8))

    # Date
    story.append(Paragraph(
        f"Generated: {generated_at.strftime('%B %d, %Y · %H:%M UTC')}",
        styles["small"],
    ))

    story.append(Spacer(1, 30))

    # ─── Key metrics box ────────────────────────────────
    if metrics:
        # Build 2-column metrics table
        metric_pairs = [
            ("Current Price", metrics.get("price")),
            ("Intrinsic Value", metrics.get("intrinsic_value")),
            ("ROE", metrics.get("roe")),
            ("Net Margin", metrics.get("net_margin")),
            ("P/E Ratio", metrics.get("pe")),
            ("D/E Ratio", metrics.get("de")),
            ("Free Cash Flow", metrics.get("fcf")),
            ("Altman Z-Score", metrics.get("z_score")),
        ]

        # Format values
        formatted = []
        for label, val in metric_pairs:
            if val is None:
                continue
            if "Price" in label or "Value" in label:
                v_str = f"${val:.2f}" if val < 10000 else f"${val/1e9:.2f}B"
            elif "Margin" in label or "ROE" in label:
                v_str = f"{val:.1f}%"
            elif "Cash Flow" in label:
                v_str = f"${val/1e9:.2f}B" if val else "—"
            else:
                v_str = f"{val:.2f}"
            formatted.append((label, v_str))

        # Arrange into grid
        rows = []
        for i in range(0, len(formatted), 2):
            row = []
            for j in range(2):
                if i + j < len(formatted):
                    label, val = formatted[i + j]
                    row.extend([label, val])
                else:
                    row.extend(["", ""])
            rows.append(row)

        if rows:
            t = Table(rows, colWidths=[3.5 * cm, 4 * cm, 3.5 * cm, 4 * cm])
            t.setStyle(TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8),
                ("FONT", (2, 0), (2, -1), "Helvetica-Bold", 8),
                ("TEXTCOLOR", (0, 0), (0, -1), GRAY),
                ("TEXTCOLOR", (2, 0), (2, -1), GRAY),
                ("TEXTCOLOR", (1, 0), (1, -1), INK),
                ("TEXTCOLOR", (3, 0), (3, -1), INK),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, LIGHT_GRAY),
                ("BOX", (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
            ]))
            story.append(t)
            story.append(Spacer(1, 24))

    story.append(PageBreak())

    # ─── Analysis content ───────────────────────────────
    story.append(Paragraph("ANALYSIS", styles["label"]))
    story.append(Spacer(1, 12))
    story.extend(_markdown_to_paragraphs(analysis_md, styles))

    # ─── Footer / Disclaimer ────────────────────────────
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "<i>This document is for informational purposes only and does not constitute "
        "investment advice. Past performance is not indicative of future results. "
        "Always conduct your own research and consult licensed professionals before "
        "making investment decisions.</i>",
        styles["small"],
    ))

    doc.build(story, onFirstPage=_draw_brand_header, onLaterPages=_draw_brand_header)
    return buf.getvalue()


# ─── Comparison Report PDF ──────────────────────────────
def build_comparison_pdf(
    symbols: list[str],
    data_by_symbol: dict[str, dict],
    generated_at: Optional[datetime] = None,
) -> bytes:
    """
    Generate side-by-side comparison PDF for 2-4 tickers.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=2.5 * cm, bottomMargin=2.5 * cm,
        title=f"Comparison: {' vs '.join(symbols)}",
        author="Luxe Capital",
    )
    styles = _make_styles()
    story = []
    generated_at = generated_at or datetime.utcnow()

    story.append(Paragraph("PEER COMPARISON", styles["label"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(" · ".join(symbols), styles["h1"]))
    story.append(Paragraph(
        f"Generated: {generated_at.strftime('%B %d, %Y')}",
        styles["small"],
    ))
    story.append(Spacer(1, 24))

    # Build comparison table
    metric_keys = [
        ("ROE",                "ROE",                 "%",  ".2f"),
        ("ROA",                "ROA",                 "%",  ".2f"),
        ("Net Profit Margin",  "Net Margin",          "%",  ".2f"),
        ("Gross Profit Margin", "Gross Margin",        "%",  ".2f"),
        ("PE Ratio",           "P/E",                 "×",  ".1f"),
        ("PBV Ratio",          "P/BV",                "×",  ".1f"),
        ("Debt to Equity",     "D/E",                 "",   ".2f"),
        ("Current Ratio",      "Current Ratio",       "",   ".2f"),
        ("Free Cash Flow (FCF)", "FCF ($B)",          "$B", "fcf"),
        ("Altman Z-Score",     "Altman Z",            "",   ".2f"),
    ]

    header = ["Metric"] + symbols
    rows = [header]

    for src_key, label, unit, fmt in metric_keys:
        row = [label]
        for sym in symbols:
            d = data_by_symbol.get(sym, {}).get("latest", {})
            val = d.get(src_key)
            if val is None:
                row.append("—")
            elif fmt == "fcf":
                row.append(f"${val/1e9:.1f}B" if val else "—")
            else:
                row.append(f"{val:{fmt}}{unit}")
        rows.append(row)

    col_widths = [4.5 * cm] + [(A4[0] - 5 * cm) / len(symbols) for _ in symbols]
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), CREAM),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (1, 0), (-1, 0), "CENTER"),
        # Body
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("FONTNAME", (1, 1), (-1, -1), "Courier"),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, LIGHT_GRAY),
    ]))
    story.append(t)
    story.append(Spacer(1, 30))

    story.append(Paragraph(
        "<i>Side-by-side metrics are pulled from the most recent fiscal year. "
        "Higher is better for ROE, ROA, margins, FCF, Z-Score. "
        "Lower is better for D/E, P/E, P/BV (relative to peers).</i>",
        styles["small"],
    ))

    doc.build(story, onFirstPage=_draw_brand_header, onLaterPages=_draw_brand_header)
    return buf.getvalue()
