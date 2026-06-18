/**
 * Hardcoded corporate branding banner.
 *
 * GUARDRAIL: "INFINITE" is a static internal brand name and must NEVER be
 * replaced by the CMS facility name or the user's name override. The facility
 * name lives only in the report body under "Name of Facility".
 */
export default function BrandBanner({ state }: { state?: string }) {
  return (
    <header className="text-center">
      <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
        <span className="brand-gradient">INFINITE</span>
        <span className="text-gray-400 font-medium text-lg align-middle mx-2">
          —
        </span>
        <span className="text-gray-500 font-medium text-lg align-middle">
          Managed by{" "}
        </span>
        <span className="text-infinite-purple font-bold text-lg align-middle">
          MEDELITE
        </span>
      </div>
      <h1 className="mt-3 text-xl font-bold tracking-wide text-gray-800">
        FACILITY ASSESSMENT SNAPSHOT
      </h1>
      {state ? (
        <p className="mt-1 text-base font-semibold text-gray-600">{state}</p>
      ) : null}
    </header>
  );
}
