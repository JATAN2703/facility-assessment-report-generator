"use client";

import { useState } from "react";
import BrandBanner from "@/components/BrandBanner";
import RatingCards from "@/components/RatingCards";
import type { FacilityData } from "@/lib/cms";
import {
  buildReportRows,
  EMPTY_MANUAL,
  type ManualInputs,
} from "@/lib/report";
import { generatePdf } from "@/lib/pdf";
import { generateDocx } from "@/lib/docxExport";

export default function Home() {
  const [ccn, setCcn] = useState("686123");
  const [data, setData] = useState<FacilityData | null>(null);
  const [manual, setManual] = useState<ManualInputs>(EMPTY_MANUAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState<null | "pdf" | "docx">(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/facility?ccn=${encodeURIComponent(ccn.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Lookup failed. Please try again.");
        return;
      }
      setData(json as FacilityData);
    } catch {
      setError("Network error — could not reach the lookup service.");
    } finally {
      setLoading(false);
    }
  }

  function setField<K extends keyof ManualInputs>(key: K, value: ManualInputs[K]) {
    setManual((m) => ({ ...m, [key]: value }));
  }

  const rows = data ? buildReportRows(data, manual) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-6 sm:p-8">
        <BrandBanner state={data?.state} />

        {/* CCN lookup */}
        <form onSubmit={lookup} className="mt-8 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="ccn" className="block text-sm font-medium text-gray-700">
              CMS Certification Number (CCN)
            </label>
            <input
              id="ccn"
              value={ccn}
              onChange={(e) => setCcn(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 686123"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-infinite-magenta focus:ring-2 focus:ring-pink-200 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ccn.trim()}
            className="self-end rounded-lg bg-infinite-magenta px-6 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? "Looking up…" : "Fetch Facility"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {data.notes.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {data.notes.map((n, i) => (
                  <p key={i}>⚠️ {n}</p>
                ))}
              </div>
            )}

            {/* Manual operational inputs */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Manual Operational Inputs
              </h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Name of Facility (override)"
                  placeholder={data.legalName}
                  value={manual.facilityNameOverride}
                  onChange={(v) => setField("facilityNameOverride", v)}
                  hint="Leave blank to use the official CMS legal name."
                />
                <Field
                  label="EMR"
                  placeholder="PCC, MatrixCare…"
                  value={manual.emr}
                  onChange={(v) => setField("emr", v)}
                />
                <Field
                  label="Current Census"
                  placeholder="112"
                  inputMode="numeric"
                  value={manual.currentCensus}
                  onChange={(v) => setField("currentCensus", v)}
                />
                <Field
                  label="Type of Patient"
                  placeholder="Long-term & Short-term"
                  value={manual.patientType}
                  onChange={(v) => setField("patientType", v)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Previous Coverage from Medelite
                  </label>
                  <select
                    value={manual.previousCoverage}
                    onChange={(e) =>
                      setField("previousCoverage", e.target.value as ManualInputs["previousCoverage"])
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:border-infinite-magenta focus:ring-2 focus:ring-pink-200 outline-none"
                  >
                    <option value="">Select…</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <Field
                  label="Previous Provider Performance"
                  placeholder="About 30 patients/day"
                  value={manual.previousProviderPerformance}
                  onChange={(v) => setField("previousProviderPerformance", v)}
                />
                <Field
                  label="Medical Coverage"
                  placeholder="Optometry, PCP, Podiatry"
                  value={manual.medicalCoverage}
                  onChange={(v) => setField("medicalCoverage", v)}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            {/* Star rating cards (bonus) */}
            <RatingCards ratings={data.ratings} metrics={data.metrics} />

            {/* Snapshot preview table */}
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Snapshot Preview
              </h2>
              <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-gray-200">
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={
                          r.group === "metric" ? "bg-purple-50/40" : "bg-white"
                        }
                      >
                        <td className="w-1/2 border-b border-gray-100 px-4 py-2 font-medium text-gray-700">
                          {r.label}
                        </td>
                        <td className="border-b border-gray-100 px-4 py-2 italic text-gray-600">
                          {r.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <a
                href={data.careCompareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-blue-600 underline"
              >
                View public source on Medicare Care Compare ↗
              </a>
            </section>

            {/* Export actions */}
            <section className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  setBusyExport("pdf");
                  try {
                    generatePdf(data, manual);
                  } finally {
                    setBusyExport(null);
                  }
                }}
                disabled={busyExport !== null}
                className="rounded-lg bg-infinite-purple px-6 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                {busyExport === "pdf" ? "Preparing…" : "⬇ Download PDF"}
              </button>
              <button
                onClick={async () => {
                  setBusyExport("docx");
                  try {
                    await generateDocx(data, manual);
                  } finally {
                    setBusyExport(null);
                  }
                }}
                disabled={busyExport !== null}
                className="rounded-lg border border-infinite-purple px-6 py-2.5 font-semibold text-infinite-purple hover:bg-purple-50 disabled:opacity-50 transition"
              >
                {busyExport === "docx" ? "Preparing…" : "⬇ Download Word (.docx)"}
              </button>
            </section>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Data: CMS Provider Data Catalog (public, keyless). Built for the MedElite
        technical case study.
      </p>
    </main>
  );
}

/* Small controlled text field helper */
function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  inputMode?: "numeric" | "text";
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-infinite-magenta focus:ring-2 focus:ring-pink-200 outline-none"
      />
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}
