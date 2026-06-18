/**
 * CMS Provider Data Catalog — data engine.
 *
 * All access goes through the public CMS Provider Data Catalog API.
 *   Base: https://data.cms.gov/provider-data/api/1/datastore/query/{datasetId}/0
 *   No API key, no documented rate limit, GET-only.
 *
 * NOTE: this module is imported only by the server-side API route
 * (app/api/facility/route.ts). The CMS API does NOT return
 * Access-Control-Allow-Origin headers, so a direct browser fetch is blocked
 * by CORS — see README "Why a backend proxy".
 *
 * Dataset IDs (verified live against the catalog):
 *   4pq5-n9py  Provider Information      -> name, address, beds, star ratings
 *   ijh5-nb2v  Medicare Claims Quality   -> facility-level STR/LT hospitalization + ED
 *   xcdc-v8bm  State US Averages          -> national + per-state averages
 */

export const CMS_BASE =
  "https://data.cms.gov/provider-data/api/1/datastore/query";

export const DATASETS = {
  providerInfo: "4pq5-n9py",
  claimsQuality: "ijh5-nb2v",
  stateUsAverages: "xcdc-v8bm",
} as const;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StarRatings {
  overall: string | null;
  healthInspection: string | null;
  staffing: string | null;
  qualityOfResidentCare: string | null;
}

export interface MetricRow {
  /** facility value (null when CMS footnotes / suppresses it) */
  facility: number | null;
  /** national average */
  national: number | null;
  /** state average */
  state: number | null;
  /** "%" for short-stay percentages, "" for per-1000-day rates */
  unit: "%" | "";
}

export interface ClaimsMetrics {
  strHospitalization: MetricRow;
  strEdVisit: MetricRow;
  ltHospitalization: MetricRow;
  ltEdVisit: MetricRow;
}

export interface FacilityData {
  ccn: string;
  legalName: string;
  location: string;
  state: string;
  certifiedBeds: string | null;
  ratings: StarRatings;
  /** present only when claims data could be fetched (bonus) */
  metrics: ClaimsMetrics | null;
  careCompareUrl: string;
  /** non-fatal notices, e.g. claims data unavailable */
  notes: string[];
  processingDate: string | null;
}

/* ------------------------------------------------------------------ */
/* Low-level query helper                                              */
/* ------------------------------------------------------------------ */

type Condition = { property: string; value: string; operator?: string };

async function queryDataset(
  datasetId: string,
  conditions: Condition[],
  limit = 500
): Promise<Record<string, string>[]> {
  const params = new URLSearchParams();
  conditions.forEach((c, i) => {
    params.set(`conditions[${i}][property]`, c.property);
    params.set(`conditions[${i}][value]`, c.value);
    params.set(`conditions[${i}][operator]`, c.operator ?? "=");
  });
  params.set("limit", String(limit));

  const url = `${CMS_BASE}/${datasetId}/0?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // CMS data refreshes monthly; cache for an hour to be a good API citizen.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`CMS API ${datasetId} responded ${res.status}`);
  }
  const json = (await res.json()) as { results?: Record<string, string>[] };
  return json.results ?? [];
}

/* ------------------------------------------------------------------ */
/* Field mapping helpers                                               */
/* ------------------------------------------------------------------ */

const num = (v: string | undefined | null): number | null => {
  if (v === undefined || v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const str = (v: string | undefined | null): string | null => {
  if (v === undefined || v === null || v.trim() === "") return null;
  return v.trim();
};

// Tokens that should stay fully uppercase after title-casing CMS SHOUTING text.
const KEEP_UPPER = new Set([
  "LLC", "INC", "SNF", "HCR", "LP", "LLP", "PA", "II", "III", "IV",
  "N", "S", "E", "W", "NE", "NW", "SE", "SW", // street directionals
]);

/** Title-case a SHOUTING CMS string while keeping common acronyms/directionals. */
function titleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[a-z0-9']+/gi, (word) => {
      const upper = word.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
}

function buildLocation(p: Record<string, string>): string {
  const address = titleCase(str(p.provider_address) ?? "");
  const city = titleCase(str(p.citytown) ?? "");
  const state = (str(p.state) ?? "").toUpperCase();
  const zip = str(p.zip_code) ?? "";
  // Mirrors the snapshot format: "5280 SW 157th Ave, Miami, FL"
  const parts = [address, city, [state, zip].filter(Boolean).join(" ")].filter(
    Boolean
  );
  return parts.join(", ");
}

export function careCompareUrl(ccn: string, state?: string | null): string {
  const base = `https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`;
  return state ? `${base}/view-all?state=${state}` : base;
}

/* ------------------------------------------------------------------ */
/* Claims metric mapping (BONUS)                                       */
/*                                                                     */
/* Brief shorthand -> CMS dictionary:                                  */
/*   STR -> "Short-Stay" residents                                     */
/*   LT  -> "Long-Stay" residents                                      */
/*                                                                     */
/* Facility values come from the Medicare Claims Quality dataset       */
/* (one row per measure_code, displayed value = adjusted_score).       */
/* State/national averages come from the State US Averages dataset.    */
/* ------------------------------------------------------------------ */

// measure_code (facility dataset) -> our metric key
const CLAIMS_MEASURE_CODES = {
  strHospitalization: "521", // % short-stay rehospitalized after admission
  strEdVisit: "522", // % short-stay with an outpatient ED visit
  ltHospitalization: "551", // hospitalizations per 1000 long-stay resident days
  ltEdVisit: "552", // outpatient ED visits per 1000 long-stay resident days
} as const;

// matching columns in the State US Averages dataset
const AVERAGE_COLUMNS = {
  strHospitalization: "percentage_of_short_stay_residents_who_were_rehospitalized__1d02",
  strEdVisit: "percentage_of_short_stay_residents_who_had_an_outpatient_em_d911",
  ltHospitalization: "number_of_hospitalizations_per_1000_longstay_resident_days",
  ltEdVisit: "number_of_outpatient_emergency_department_visits_per_1000_l_de9d",
} as const;

const METRIC_UNITS: Record<keyof ClaimsMetrics, "%" | ""> = {
  strHospitalization: "%",
  strEdVisit: "%",
  ltHospitalization: "",
  ltEdVisit: "",
};

async function fetchClaimsMetrics(
  ccn: string,
  state: string,
  notes: string[]
): Promise<ClaimsMetrics | null> {
  try {
    const [facilityRows, averageRows] = await Promise.all([
      queryDataset(DATASETS.claimsQuality, [
        { property: "cms_certification_number_ccn", value: ccn },
      ]),
      queryDataset(DATASETS.stateUsAverages, [], 100),
    ]);

    if (facilityRows.length === 0) {
      notes.push("Claims-based quality measures were not available for this CCN.");
      return null;
    }

    // index facility rows by measure_code
    const byCode = new Map<string, Record<string, string>>();
    facilityRows.forEach((r) => byCode.set(r.measure_code, r));

    // pull NATION + this state's average row
    const nationRow = averageRows.find((r) => r.state_or_nation === "NATION");
    const stateRow = averageRows.find((r) => r.state_or_nation === state);

    const build = (key: keyof ClaimsMetrics): MetricRow => {
      const facRow = byCode.get(CLAIMS_MEASURE_CODES[key]);
      const avgCol = AVERAGE_COLUMNS[key];
      return {
        // CMS displays the risk-adjusted score on Care Compare
        facility: facRow ? num(facRow.adjusted_score) : null,
        national: nationRow ? num(nationRow[avgCol]) : null,
        state: stateRow ? num(stateRow[avgCol]) : null,
        unit: METRIC_UNITS[key],
      };
    };

    return {
      strHospitalization: build("strHospitalization"),
      strEdVisit: build("strEdVisit"),
      ltHospitalization: build("ltHospitalization"),
      ltEdVisit: build("ltEdVisit"),
    };
  } catch (err) {
    // Bonus data is best-effort — never fail the whole request over it.
    notes.push(
      `Claims-based metrics could not be loaded (${
        err instanceof Error ? err.message : "unknown error"
      }).`
    );
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export class FacilityNotFoundError extends Error {}

export async function getFacility(ccnRaw: string): Promise<FacilityData> {
  const ccn = ccnRaw.trim();
  if (!/^\d{5,6}$/.test(ccn)) {
    throw new FacilityNotFoundError(
      "A CCN is a 6-digit CMS Certification Number (e.g. 686123)."
    );
  }

  const providerRows = await queryDataset(DATASETS.providerInfo, [
    { property: "cms_certification_number_ccn", value: ccn },
  ]);

  if (providerRows.length === 0) {
    throw new FacilityNotFoundError(
      `No facility found for CCN ${ccn}. Double-check the number and try again.`
    );
  }

  const p = providerRows[0];
  const state = (str(p.state) ?? "").toUpperCase();
  const notes: string[] = [];

  const metrics = await fetchClaimsMetrics(ccn, state, notes);

  return {
    ccn,
    legalName: titleCase(str(p.provider_name) ?? `Facility ${ccn}`),
    location: buildLocation(p),
    state,
    certifiedBeds: str(p.number_of_certified_beds),
    ratings: {
      overall: str(p.overall_rating),
      healthInspection: str(p.health_inspection_rating),
      staffing: str(p.staffing_rating),
      qualityOfResidentCare: str(p.qm_rating),
    },
    metrics,
    careCompareUrl: careCompareUrl(ccn, state),
    notes,
    processingDate: str(p.processing_date),
  };
}
