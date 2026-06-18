# Facility Assessment Report Generator

A lightweight web app for the **MedElite** technical case study. Enter a nursing
home's **CCN** (CMS Certification Number) → the app pulls that facility's public
data from the **CMS Provider Data Catalog**, lets you add internal operational
inputs, and exports a polished, print-ready **Facility Assessment Snapshot** as a
**PDF** (and, as a bonus, an editable **Word .docx**).

Built to match the reference `Facility Assessment Snapshot` layout, validated
against the sample target facility **CCN 686123 — Kendall Lakes Healthcare and
Rehab Center, FL**.

---

## Live demo & repo

- **Live app:** https://facility-assessment-app-psi.vercel.app
- **Repository:** https://github.com/JATAN2703/facility-assessment-report-generator

Try it with the sample target facility — CCN **686123** (Kendall Lakes Healthcare and Rehab Center, FL).

---

## Features

### Core MVP (all implemented)
- **Dynamic CCN lookup** — enter any valid CCN to fetch that facility live.
- **Data engine** — queries the public CMS Provider Data Catalog API for legal
  name, full address/location, number of certified beds, and the four CMS
  Five-Star ratings (Overall, Health Inspection, Staffing, Quality of Resident
  Care).
- **Facility name override** — optional field; if filled it overrides the CMS
  legal name on the output, otherwise the official name is used.
- **Manual operational inputs** — EMR, Current Census, Type of Patient,
  Previous Coverage from Medelite (Yes/No), Previous Provider Performance,
  Medical Coverage.
- **One-click PDF export** — triggers a direct browser download of a clean,
  print-ready document that mirrors the reference snapshot.
- **Clickable Medicare source hyperlink** — the PDF embeds a real, clickable
  link to the Care Compare profile, built from the dynamic CCN:
  `https://www.medicare.gov/care-compare/details/nursing-home/{CCN}/view-all?state={STATE}`
- **Branding banner** on both the web UI and the export top page:
  `INFINITE — Managed by MEDELITE` → `FACILITY ASSESSMENT SNAPSHOT` → dynamic
  state code.

### Bonus features (also implemented)
- **All 12 STR/LT hospitalization & ED metrics** with state + national averages
  (see mapping below).
- **Word (.docx) export** — editable document with the same layout and a live
  hyperlink.
- **Data cards** — responsive cards for the star ratings and a
  facility-vs-state-vs-national view of the claims metrics.
- **Error handling** — invalid/malformed CCN, facility-not-found, upstream CMS
  failures, and gracefully degrades when claims data is footnoted/suppressed
  (the MVP still renders; a non-blocking notice is shown).

---

## ⚠️ Branding guardrail (read carefully)

The platform name **`INFINITE`** is a **static internal brand**. It is **never**
overwritten with the facility name from the CMS API or the user's override. The
facility name appears **only** in the report body under **"Name of Facility."**
This is enforced in [`components/BrandBanner.tsx`](components/BrandBanner.tsx)
and [`lib/pdf.ts`](lib/pdf.ts) / [`lib/docxExport.ts`](lib/docxExport.ts), which
render the banner from a hardcoded constant independent of any facility data.

---

## Tech stack & key engineering decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 14 (App Router) + TypeScript** | One deploy gives both the UI **and** a server-side API route — needed because of the CORS issue below. |
| Styling | **Tailwind CSS** | Fast, consistent, readable in a walkthrough. |
| PDF | **jsPDF + jspdf-autotable** | Native client-side download with a **real clickable link** via `textWithLink` (not a flattened screenshot). |
| Word | **docx** | Generates a true editable `.docx` with a live `ExternalHyperlink`. |
| Hosting | **Vercel** | Zero-config Next.js deploy from the repo; API route runs as a serverless function. |

### Why a backend proxy (the one real architecture decision)

The natural choice for this task is a pure frontend. I validated that
assumption first and it **failed**: the CMS Provider Data Catalog API does
**not** return `Access-Control-Allow-Origin` headers, so a direct browser
`fetch` is blocked by CORS.

The fix is a thin server-side proxy: the browser calls
[`/api/facility?ccn=...`](app/api/facility/route.ts), which runs server-side
(no CORS), queries CMS, normalizes the payload, and returns clean JSON. Next.js
gives us this in the same project and the same Vercel deploy — no separate
backend to host. PDF/DOCX generation still happens entirely **client-side**, so
the "direct browser download" requirement is met.

### Why values differ from the reference PDF

CMS refreshes these datasets monthly. The static reference
`Kendall Lakes...pdf` was generated from an older snapshot (e.g. it shows Overall
rating 1 and 18.7% short-stay hospitalization). The **live** API currently
returns different numbers (Overall 5, 25.6%, etc.). The app intentionally shows
**current live data** and stamps the CMS processing date in the export footer.

---

## Data sources & field mapping

All data comes from the CMS Provider Data Catalog
(`https://data.cms.gov/provider-data/api/1/datastore/query/{datasetId}/0`),
which is public, **keyless**, and has no documented rate limit.

| Dataset | ID | Used for |
| --- | --- | --- |
| Provider Information | `4pq5-n9py` | Name, address, certified beds, star ratings |
| Medicare Claims Quality Measures | `ijh5-nb2v` | Facility STR/LT hospitalization & ED scores |
| State US Averages | `xcdc-v8bm` | National + per-state averages |

### Report field mapping (MVP)

| Report field | Source | API field |
| --- | --- | --- |
| Name of Facility | CMS + manual override | `provider_name` |
| Location | CMS | `provider_address`, `citytown`, `state`, `zip_code` |
| Census Capacity | CMS | `number_of_certified_beds` |
| Overall Star Rating | CMS | `overall_rating` |
| Health Inspection | CMS | `health_inspection_rating` |
| Staffing | CMS | `staffing_rating` |
| Quality of Resident Care | CMS | `qm_rating` |
| EMR, Current Census, Type of Patient, Previous Coverage, Previous Provider Performance, Medical Coverage | Manual | — |

### STR/LT claims metric mapping (bonus)

Per the brief: **STR → Short-Stay**, **LT → Long-Stay**. Facility values use the
risk-adjusted score (`adjusted_score`) that CMS displays on Care Compare;
averages come from the matching columns in the State US Averages dataset.

| Snapshot label | Measure code | Avg column (State US Averages) | Unit |
| --- | --- | --- | --- |
| Short Term Hospitalization | `521` | `percentage_of_short_stay_residents_who_were_rehospitalized__1d02` | % |
| STR ED Visit | `522` | `percentage_of_short_stay_residents_who_had_an_outpatient_em_d911` | % |
| LT Hospitalization | `551` | `number_of_hospitalizations_per_1000_longstay_resident_days` | per 1000 days |
| ED Visit (LT) | `552` | `number_of_outpatient_emergency_department_visits_per_1000_l_de9d` | per 1000 days |

Each metric expands to 3 lines (facility / national avg / state avg) = **12
lines total**, matching the reference layout exactly.

---

## Project structure

```
app/
  api/facility/route.ts   # serverless proxy → CMS (solves CORS)
  page.tsx                # main UI (lookup, manual inputs, preview, exports)
  layout.tsx, globals.css
components/
  BrandBanner.tsx         # hardcoded INFINITE banner (guardrail)
  RatingCards.tsx         # bonus data cards
lib/
  cms.ts                  # data engine: datasets, fetch, field mapping
  report.ts               # single source of truth for the snapshot row layout
  pdf.ts                  # jsPDF export + clickable Medicare link
  docxExport.ts           # bonus .docx export
reference/                # case-study source materials (brief, snapshot, dict)
```

The on-screen table, the PDF, and the DOCX all build from
[`lib/report.ts`](lib/report.ts), so the layout stays in sync across outputs.

---

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
# then enter CCN 686123 and click "Fetch Facility"
```

Production build:

```bash
npm run build && npm run start
```

---

## Deploy to Vercel

1. Push this folder to a public GitHub repo.
2. Import the repo at [vercel.com/new](https://vercel.com/new) — Vercel
   auto-detects Next.js; **no env vars or config needed** (the CMS API is
   keyless).
3. Deploy → copy the live URL into the top of this README.

---

## Assumptions & notes

- **CCN format:** validated as a 5–6 digit number before hitting CMS.
- **Current Census** is a manual input (the brief lists it as manual); the CMS
  `average_number_of_residents_per_day` field is available but intentionally not
  used here to follow the brief.
- **Suppressed claims data:** when CMS footnotes a measure, the value shows `—`
  and the MVP still renders fully.
- **Security advisories:** `npm audit` reports two Next.js advisories that only
  affect self-hosted image-optimization / SSR edge cases (patched at the Vercel
  platform level) and require a major-version bump to silence; the jsPDF
  `dompurify` chain was already removed by upgrading to jsPDF 4 + autotable 5.
  None are reachable in this app's usage.
```
