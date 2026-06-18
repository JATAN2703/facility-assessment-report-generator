/**
 * Client-side PDF generation with jsPDF + autotable.
 *
 * Produces a print-ready Facility Assessment Snapshot that mirrors the
 * reference layout, and embeds a *clickable* Medicare Care Compare hyperlink
 * (jsPDF textWithLink / autotable didDrawCell link, not a flattened image).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FacilityData } from "./cms";
import { buildReportRows, resolvedFacilityName, type ManualInputs } from "./report";

// Brand colors (RGB)
const MAGENTA: [number, number, number] = [230, 0, 126];
const PURPLE: [number, number, number] = [106, 27, 154];
const INK: [number, number, number] = [31, 41, 55];
const GREY: [number, number, number] = [107, 114, 128];

/**
 * Draws the hardcoded "INFINITE — Managed by MEDELITE" wordmark, centered.
 * GUARDRAIL: this text is static branding and is never replaced with the
 * facility name (see README / case-study guardrail).
 */
function drawBrandBanner(doc: jsPDF, pageWidth: number, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);

  const infinite = "INFINITE";
  const sep = "  —  ";
  const managed = "Managed by ";
  const medelite = "MEDELITE";

  doc.setFontSize(22);
  const wInfinite = doc.getTextWidth(infinite);
  doc.setFontSize(12);
  const wSep = doc.getTextWidth(sep);
  doc.setFont("helvetica", "normal");
  const wManaged = doc.getTextWidth(managed);
  doc.setFont("helvetica", "bold");
  const wMedelite = doc.getTextWidth(medelite);

  const totalWidth = wInfinite + wSep + wManaged + wMedelite;
  let x = (pageWidth - totalWidth) / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...MAGENTA);
  doc.text(infinite, x, y);
  x += wInfinite;

  doc.setFontSize(12);
  doc.setTextColor(...GREY);
  doc.text(sep, x, y);
  x += wSep;

  doc.setFont("helvetica", "normal");
  doc.text(managed, x, y);
  x += wManaged;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text(medelite, x, y);

  return y + 10;
}

export function generatePdf(data: FacilityData, manual: ManualInputs): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  let y = 56;
  y = drawBrandBanner(doc, pageWidth, y);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text("FACILITY ASSESSMENT SNAPSHOT", pageWidth / 2, y, { align: "center" });
  y += 18;

  // Dynamic state abbreviation
  doc.setFontSize(12);
  doc.text(data.state || "—", pageWidth / 2, y, { align: "center" });
  y += 14;

  const rows = buildReportRows(data, manual);
  const body = rows.map((r) => [r.label, r.value]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 6,
      lineColor: [209, 213, 219],
      lineWidth: 0.5,
      textColor: INK,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 250, fillColor: [249, 250, 251] },
      1: { fontStyle: "italic", textColor: [55, 65, 81] },
    },
    // Visually separate the bonus metric block.
    didParseCell: (hook) => {
      if (hook.section === "body" && rows[hook.row.index]?.group === "metric") {
        if (hook.column.index === 0) hook.cell.styles.fillColor = [245, 243, 255];
      }
    },
  });

  // Clickable Medicare Care Compare source link
  // @ts-expect-error lastAutoTable is attached by jspdf-autotable at runtime
  const afterTableY: number = doc.lastAutoTable.finalY + 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text("Public data source (CMS Medicare Care Compare):", margin, afterTableY);

  doc.setTextColor(37, 99, 235);
  doc.textWithLink(data.careCompareUrl, margin, afterTableY + 13, {
    url: data.careCompareUrl,
  });

  // Footer / provenance
  doc.setTextColor(...GREY);
  doc.setFontSize(8);
  const stamp = data.processingDate
    ? `CMS data processing date: ${data.processingDate}`
    : "Source: CMS Provider Data Catalog";
  doc.text(stamp, margin, afterTableY + 30);

  const safeName = resolvedFacilityName(data, manual)
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  doc.save(`Facility_Assessment_Snapshot_${safeName || data.ccn}.pdf`);
}
