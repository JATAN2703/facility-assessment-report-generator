/**
 * BONUS: editable Word (.docx) export, generated client-side with the `docx`
 * library and saved via a Blob download. Mirrors the same report rows and
 * branding banner as the PDF, including the clickable Medicare hyperlink.
 */
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { FacilityData } from "./cms";
import { buildReportRows, resolvedFacilityName, type ManualInputs } from "./report";

function brandBanner(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "INFINITE", bold: true, size: 36, color: "E6007E" }),
      new TextRun({ text: "  —  Managed by ", size: 22, color: "6B7280" }),
      new TextRun({ text: "MEDELITE", bold: true, size: 22, color: "6A1B9A" }),
    ],
  });
}

function row(label: string, value: string, isMetric: boolean): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 55, type: WidthType.PERCENTAGE },
        shading: { fill: isMetric ? "F5F3FF" : "F9FAFB" },
        children: [
          new Paragraph({ children: [new TextRun({ text: label, bold: true })] }),
        ],
      }),
      new TableCell({
        width: { size: 45, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({ children: [new TextRun({ text: value, italics: true })] }),
        ],
      }),
    ],
  });
}

export async function generateDocx(
  data: FacilityData,
  manual: ManualInputs
): Promise<void> {
  const rows = buildReportRows(data, manual);

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((r) => row(r.label, r.value, r.group === "metric")),
  });

  const doc = new Document({
    sections: [
      {
        children: [
          brandBanner(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "FACILITY ASSESSMENT SNAPSHOT", bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: data.state || "—", bold: true })],
          }),
          new Paragraph({ text: "" }),
          table,
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Public data source (CMS Medicare Care Compare): ",
                color: "6B7280",
              }),
              new ExternalHyperlink({
                link: data.careCompareUrl,
                children: [
                  new TextRun({
                    text: data.careCompareUrl,
                    style: "Hyperlink",
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.processingDate
                  ? `CMS data processing date: ${data.processingDate}`
                  : "Source: CMS Provider Data Catalog",
                color: "6B7280",
                size: 16,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = resolvedFacilityName(data, manual)
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Facility_Assessment_Snapshot_${safeName || data.ccn}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
