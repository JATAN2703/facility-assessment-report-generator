import { NextRequest, NextResponse } from "next/server";
import { getFacility, FacilityNotFoundError } from "@/lib/cms";

/**
 * GET /api/facility?ccn=686123
 *
 * Server-side proxy to the CMS Provider Data Catalog. Exists because the CMS
 * API does not send CORS headers, so the browser cannot call it directly.
 * Returns a normalized FacilityData payload (see lib/cms.ts).
 */
export async function GET(req: NextRequest) {
  const ccn = req.nextUrl.searchParams.get("ccn")?.trim() ?? "";

  if (!ccn) {
    return NextResponse.json(
      { error: "Missing required query parameter: ccn" },
      { status: 400 }
    );
  }

  try {
    const data = await getFacility(ccn);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
    });
  } catch (err) {
    if (err instanceof FacilityNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("CMS fetch failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't reach the CMS data service. Please try again in a moment.",
      },
      { status: 502 }
    );
  }
}
