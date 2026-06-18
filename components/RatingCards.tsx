/**
 * BONUS: responsive data cards for the four CMS star ratings plus a compact
 * facility-vs-state-vs-national comparison for the claims metrics.
 */
import type { ClaimsMetrics, MetricRow, StarRatings } from "@/lib/cms";

function Stars({ value }: { value: string | null }) {
  const n = value ? Number(value) : NaN;
  if (!Number.isFinite(n)) return <span className="text-gray-400">N/A</span>;
  return (
    <span aria-label={`${n} of 5 stars`} className="text-lg">
      {"★".repeat(n)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

function StarCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-white to-gray-50 ring-1 ring-gray-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-800">
          {value ?? "—"}
        </span>
        <span className="text-amber-500">
          <Stars value={value} />
        </span>
      </div>
    </div>
  );
}

function fmt(v: number | null, unit: "%" | "") {
  if (v === null) return "—";
  return unit === "%" ? `${v.toFixed(1)}%` : v.toFixed(2);
}

function MetricBar({ label, m }: { label: string; m: MetricRow }) {
  return (
    <div className="rounded-xl ring-1 ring-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-infinite-purple">
        {fmt(m.facility, m.unit)}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Nat&apos;l {fmt(m.national, m.unit)} · State {fmt(m.state, m.unit)}
      </p>
    </div>
  );
}

export default function RatingCards({
  ratings,
  metrics,
}: {
  ratings: StarRatings;
  metrics: ClaimsMetrics | null;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        CMS Five-Star Ratings
      </h2>
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StarCard label="Overall" value={ratings.overall} />
        <StarCard label="Health Inspection" value={ratings.healthInspection} />
        <StarCard label="Staffing" value={ratings.staffing} />
        <StarCard label="Quality of Care" value={ratings.qualityOfResidentCare} />
      </div>

      {metrics && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Hospitalization &amp; ED Metrics
          </h2>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricBar label="STR Hospitalization" m={metrics.strHospitalization} />
            <MetricBar label="STR ED Visit" m={metrics.strEdVisit} />
            <MetricBar label="LT Hospitalization" m={metrics.ltHospitalization} />
            <MetricBar label="LT ED Visit" m={metrics.ltEdVisit} />
          </div>
        </>
      )}
    </section>
  );
}
