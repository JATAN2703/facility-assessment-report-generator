/**
 * Single source of truth for the Facility Assessment Snapshot layout.
 *
 * Both the on-screen results table and the PDF / DOCX exporters build from
 * buildReportRows(), so the row order and labels always match the reference
 * "Facility Assessment Snapshot" exactly.
 */
import type { FacilityData, MetricRow } from "./cms";

export interface ManualInputs {
  facilityNameOverride: string;
  emr: string;
  currentCensus: string;
  patientType: string;
  previousCoverage: "Yes" | "No" | "";
  previousProviderPerformance: string;
  medicalCoverage: string;
}

export const EMPTY_MANUAL: ManualInputs = {
  facilityNameOverride: "",
  emr: "",
  currentCensus: "",
  patientType: "",
  previousCoverage: "",
  previousProviderPerformance: "",
  medicalCoverage: "",
};

export interface ReportRow {
  label: string;
  value: string;
  /** "core" rows are CMS+manual MVP fields; "metric" rows are the bonus block */
  group: "core" | "metric";
}

const DASH = "—";

function fmtMetric(v: number | null, unit: "%" | ""): string {
  if (v === null) return DASH;
  // Short-stay percentages show one decimal + %; per-1000 rates show two decimals.
  return unit === "%" ? `${v.toFixed(1)}%` : v.toFixed(2);
}

function metricLines(m: MetricRow, labels: [string, string, string]): ReportRow[] {
  return [
    { label: labels[0], value: fmtMetric(m.facility, m.unit), group: "metric" },
    { label: labels[1], value: fmtMetric(m.national, m.unit), group: "metric" },
    { label: labels[2], value: fmtMetric(m.state, m.unit), group: "metric" },
  ];
}

export function resolvedFacilityName(
  data: FacilityData,
  manual: ManualInputs
): string {
  const override = manual.facilityNameOverride.trim();
  return override || data.legalName;
}

export function buildReportRows(
  data: FacilityData,
  manual: ManualInputs
): ReportRow[] {
  const star = (v: string | null) => (v && v.trim() ? v : DASH);

  const rows: ReportRow[] = [
    { label: "Name of Facility", value: resolvedFacilityName(data, manual), group: "core" },
    { label: "Location", value: data.location || DASH, group: "core" },
    { label: "EMR", value: manual.emr.trim() || DASH, group: "core" },
    { label: "Census Capacity", value: data.certifiedBeds || DASH, group: "core" },
    { label: "Current Census", value: manual.currentCensus.trim() || DASH, group: "core" },
    { label: "Type of Patient", value: manual.patientType.trim() || DASH, group: "core" },
    {
      label: "Previous Coverage from Medelite",
      value: manual.previousCoverage || DASH,
      group: "core",
    },
    {
      label: "Previous Provider Performance from Medelite",
      value: manual.previousProviderPerformance.trim() || DASH,
      group: "core",
    },
    { label: "Medical Coverage", value: manual.medicalCoverage.trim() || DASH, group: "core" },
    { label: "Overall Star Rating", value: star(data.ratings.overall), group: "core" },
    { label: "Health Inspection", value: star(data.ratings.healthInspection), group: "core" },
    { label: "Staffing", value: star(data.ratings.staffing), group: "core" },
    {
      label: "Quality of Resident Care",
      value: star(data.ratings.qualityOfResidentCare),
      group: "core",
    },
  ];

  // Bonus: the 12 STR/LT hospitalization + ED lines, in the snapshot's order.
  if (data.metrics) {
    const m = data.metrics;
    rows.push(
      ...metricLines(m.strHospitalization, [
        "Short Term Hospitalization",
        "STR National Avg. for Hospitalization",
        "STR State National Avg. for Hospitalization",
      ]),
      ...metricLines(m.strEdVisit, [
        "STR ED Visit",
        "STR ED Visits National Avg.",
        "STR ED Visits State Avg.",
      ]),
      ...metricLines(m.ltHospitalization, [
        "LT Hospitalization",
        "LT National Avg. for Hospitalization",
        "LT State National Avg. for Hospitalization",
      ]),
      ...metricLines(m.ltEdVisit, [
        "ED Visit",
        "LT ED Visits National Avg.",
        "LT ED Visits State Avg.",
      ])
    );
  }

  return rows;
}
