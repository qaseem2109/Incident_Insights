# Prompt for Gemini (copy everything below this line)

You are a senior front-end engineer and UI designer. Build the complete **front-end** of an offline incident-analysis dashboard in **Next.js (App Router) + TypeScript + Tailwind CSS**. The backend already exists (Next.js route handlers + SQLite) and you must **only consume its REST API** described below. Deliver production-quality, copy-paste-ready files, with polished visuals and smooth animation.

## 1. What the product is
"Sindh Incidents" – an internal tool for browsing 173 terrorism incidents recorded in Sindh, Pakistan between 2020 and 2026 (data keeps growing as users add incidents). Users need to (a) browse incidents as cards or a table, (b) narrow them down instantly with filters (e.g. just click year 2021), (c) see them on an **offline map**, (d) **export the filtered data to .xlsx**, (e) **add** new incidents through a dialog, and (f) see a small analytics view. The tone is serious and professional (the subject is sensitive: deaths of civilians and security personnel) – no playful wording, no emoji, no gore.

## 2. HARD constraints
1. **Must work with no internet at runtime.** No CDN links, no Google Fonts, no remote images/tiles/icons. Fonts: use `@fontsource-variable/inter` (npm) or the system font stack. Icons: `lucide-react`. All assets come from npm packages or `/public`.
2. **Only create/modify these paths:** `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/**`, `hooks/**`, `lib/client/**`. **Never touch** `app/api/**`, `lib/server/**`, `scripts/**`, `db/**`, `data/**`, `public/geo/**`, `next.config.ts`, `package.json`. If you need more npm packages, list them in one final `npm install ...` command (do not output package.json).
3. Allowed libraries: `framer-motion`, `lucide-react`, `leaflet` + `react-leaflet` (+ `leaflet.markercluster` / `react-leaflet-cluster` if you like), `recharts`, `clsx`, `@fontsource-variable/inter`. No UI-kit that needs a network, no auth, no next-auth.
4. Leaflet must be loaded client-side only (`next/dynamic` with `ssr: false`). Import `leaflet/dist/leaflet.css`. Don't use Leaflet's default PNG marker icons (they break in bundlers) – use `L.divIcon` / `CircleMarker`.
5. Be responsive (desktop first, usable on a 390 px phone) and keyboard accessible (focus rings, `aria-label`s, Esc closes dialogs). Respect `prefers-reduced-motion`.
6. No `alert()`/`confirm()` – use your own toast and confirm dialog components.
7. TypeScript strict, no `any`. Put the shared types in `lib/client/types.ts` and a small typed API client in `lib/client/api.ts`.

## 2b. Frontend ↔ backend contract
Base URL is same-origin (`/api/...`). Everything is JSON except export.

### Filter query parameters (used by `/api/incidents`, `/api/stats`, `/api/export`)
All optional and combinable. **Multiple values are separated by `|`** (a pipe) – NOT a comma, because names contain commas. Always build the query with `URLSearchParams` (it encodes `|` correctly), e.g. `year=2021|2022`.

| param | values |
|---|---|
| `year` | 2020…2026 (integers) |
| `month` | 1–12 |
| `category` | `MAJOR` or `OTHER` |
| `region` | `Karachi` or `Interior Sindh` |
| `district` | canonical district names from `/api/filters` |
| `head` | head-of-crime values from `/api/filters` |
| `target` | target values from `/api/filters` |
| `claimed` | claimed-by values; the special value `(none)` = no claim recorded |
| `from`, `to` | `YYYY-MM-DD` inclusive date range |
| `q` | free-text search (place, details, names, FIR, accused…) – debounce 300 ms |

### Endpoints
```ts
// lib/client/types.ts  (create exactly this)
export interface Incident {
  id: number;
  category: "MAJOR" | "OTHER";
  source_sno: number | null;
  incident_date: string | null;      // "2021-03-23"
  incident_time: string | null;      // "10:50"
  date_time_raw: string | null;      // original text e.g. "19.06.2020 at 1020 hrs"
  year: number | null;
  month: number | null;              // 1-12
  month_raw: string | null;
  head_of_crime: string;             // e.g. "Target Killing", "IED Blast", "Hand Grenade"
  target: string;                    // e.g. "Police", "Civilian", "Rangers"
  importance: string | null;         // "Importance of the Case"
  fir_details: string | null;
  district: string;                  // canonical, e.g. "Karachi East", "Larkana"
  district_raw: string | null;
  place: string | null;
  killed_names: string | null;       // multi-line free text ("1. Name\n2. Name")
  injured_names: string | null;
  accused: string | null;
  claimed_by: string | null;         // "SRA", "BLA", "Unclaimed", null …
  brief_details: string | null;
  killed_count: number | null;       // ESTIMATE (lower bound) – null = unknown
  injured_count: number | null;      // ESTIMATE
  latitude: number | null;
  longitude: number | null;
  coord_source: "district" | "manual"; // "district" = approximate position inside the district
  created_at: string;
  updated_at: string;
}
export interface Option { value: string | number; count: number }
export interface DistrictOption extends Option { region: "Karachi" | "Interior Sindh"; latitude: number; longitude: number }
export interface FilterOptions {
  years: Option[]; months: Option[]; categories: Option[]; districts: DistrictOption[];
  heads: Option[]; targets: Option[]; claimed: Option[]; dateRange: { min: string; max: string };
}
export interface ListResponse { data: Incident[]; total: number; page: number; pageSize: number; pages: number }
export interface Stats {
  totals: { incidents: number; major: number; other: number; killed_est: number; injured_est: number; unknown_counts: number };
  byYear: { value: number; count: number; major: number }[];
  byMonth: Option[]; byHead: Option[]; byTarget: Option[]; byDistrict: Option[]; byClaimed: Option[];
  yearlyCasualties: { year: number; civilian_martyred: number | null; civilian_injured: number | null; leas_martyred: number | null; leas_injured: number | null }[];
}
```
* `GET /api/incidents?<filters>&page=1&pageSize=24&sort=date&order=desc` → `ListResponse`. `sort` ∈ `date,id,district,head,target,category,killed,injured`. Add **`all=1`** to receive every matching row in one response (use this for the map; ignore paging).
* `GET /api/filters` → `FilterOptions` (call once on load; counts are global, not filtered). Month numbers map to names January…December.
* `GET /api/stats?<filters>` → `Stats` (totals + breakdowns for the current filters; refetch when filters change).
* `POST /api/incidents` (JSON body) → `201` + the created `Incident`. Errors: `422 { error, fields: { fieldName: "message" } }` – show each message under its field.
  * Required: `category`, `incident_date` (`YYYY-MM-DD`), `head_of_crime`, `target`, `district`.
  * Optional: `incident_time` (`HH:MM`), `importance`, `fir_details`, `place`, `killed_names`, `injured_names`, `accused`, `claimed_by`, `brief_details`, `killed_count`, `injured_count` (leave empty = auto-count from names), `latitude` + `longitude` (both or none; if omitted the server places the marker inside the district).
* `PUT /api/incidents/:id` – send only changed fields (same validation). `DELETE /api/incidents/:id` → `{ ok: true }`.
* `GET /api/export?<filters>` → returns an `.xlsx` file (header `Content-Disposition`). Trigger the download by navigating to the URL (`window.location.href = url` or a hidden `<a download>`), and show a toast. Header `X-Row-Count` holds the number of rows (optional).

## 3. Screens & behaviour

### 3.1 Shell
* Top bar: product name, global search box (`q`), **Add incident** (primary button), **Export** button, light/dark toggle (persist in `localStorage`, default = system).
* Left **filter panel** (sticky; becomes a slide-over drawer with a "Filters" button on mobile).
* Main area with a segmented **view switcher**: **Cards · Table · Map · Insights**. Remember the last view and keep the same filters across views. Animate view changes (cross-fade + slight slide).
* Above the results: a live **active-filters bar** – a removable chip for every active filter, a "Clear all" button, and an animated counter "**19** incidents".
* **Sync all filters + view + sort to the URL query string** (`?view=map&year=2021&month=3|4`) so reload/back/forward and sharing links work (use `useSearchParams` + `router.replace`, no full reload).

### 3.2 Filters (left panel) – every change refetches immediately (abort the previous request)
* **Year** – chips (2020…2026, each with its count). Multi-select. Clicking "2021" alone must show only 2021 incidents.
* **Month** – 12 compact chips (Jan–Dec), multi-select.
* **Category** – segmented control: All / Major / Other.
* **Region** – All / Karachi / Interior Sindh.
* **District** – searchable multi-select grouped by region, with counts.
* **Head of crime**, **Target**, **Claimed by** – searchable multi-select lists with counts (claimed list includes "(none)" – display it as "Not recorded").
* **Date range** – from/to date inputs (min/max from `dateRange`).
* A "Reset filters" link. Filter groups are collapsible with a smooth height animation. Options with 0 count under the current filters may be dimmed but stay clickable.

### 3.3 Cards view (home default)
* Responsive grid (1/2/3/4 columns). Each **incident card**: coloured left stripe by head-of-crime colour (see §4), badge **MAJOR** (strong accent) or OTHER (muted), date + time (format "23 Mar 2021 · 10:50", fall back to `date_time_raw` if the date is null), head of crime, target, district, place (2 lines clamp), `brief_details` (3 lines clamp), and small stat chips: killed / injured shown as **"≥ n"** (tooltip: "Estimated from the names listed; may be higher") – show "–" when null; `claimed_by` tag.
* Click a card → **detail drawer** (right side) with ALL fields in clearly labelled sections (Overview, Location, Casualties with the names lists rendered with `whitespace-pre-line`, FIR, Accused, Claimed by, Full details, plus "Approximate location (district level)" note when `coord_source === "district"`), a mini-map showing the position, and **Edit** / **Delete** actions (delete asks for confirmation).
* Animation: staggered fade/slide-in on first load; when filters change use `AnimatePresence` + `layout` so cards smoothly re-flow (cards leaving shrink-fade, entering pop in); hover lifts the card with a soft shadow. Show shimmer **skeleton cards** while loading. Friendly empty state when nothing matches ("No incidents match these filters" + Clear filters button).
* Pagination: 24 per page, "Load more" button or numbered pager (your choice, keep it elegant).

### 3.4 Table view
* Compact, sticky-header data grid: S#, Date, Time, Category, Head of crime, Target, District, Place, Killed≥, Injured≥, Claimed by. Click a header to sort (uses `sort`/`order` params, shows an arrow). Zebra rows, row hover highlight, click row → detail drawer. Page size 50 with pager. Horizontal scroll on small screens.

### 3.5 Map view (OFFLINE – critical)
* Use Leaflet via `react-leaflet`. **Do not add any online tile layer.** Instead:
  * Load `/geo/sindh_districts.geojson` (already in `/public/geo`, 30-ish Sindh district polygons; each feature has `properties.name`) and draw it as the base map: soft fill, thin borders, slightly darker on hover, a tooltip with the district name + incident count for the current filters. Set the map background colour (CSS) so it looks like a clean "water/land" cartographic style in both light and dark mode. Initial view: fit to the Sindh bounds (~ lat 23.5–28.6, lng 66.6–71.1) with `maxBounds` and sensible min/max zoom (6–13).
  * Optional offline raster tiles: if `process.env.NEXT_PUBLIC_OFFLINE_TILES === "1"`, additionally add `L.tileLayer("/tiles/{z}/{x}/{y}.png", { errorTileUrl: transparentPixel })` under the polygons (users may drop pre-downloaded tiles into `/public/tiles`). Default is OFF.
  * The GeoJSON `name` values differ slightly from the database district names. Use this mapping (GeoJSON name → DB district): "Central Karachi"→"Karachi Central", "East Karachi"→"Karachi East", "South Karachi"→"Karachi South", "West Karachi"→"Karachi West", "Malir Karachi"→"Karachi Malir", "Korangi Karachi"→"Karachi Korangi", "Kambar Shahdad Kot"→"Kambar Shahdadkot", "Shaheed Benazir Abad"→"Shaheed Benazirabad", "Umer Kot"→"Umerkot"; every other name is identical. (The DB also has "Karachi Keamari", which has no polygon of its own – count it under "West Karachi" for the polygon tooltip only.)
* Data: `GET /api/incidents?<current filters>&all=1`. Markers are **colour-coded by head of crime** (palette in §4); **MAJOR** incidents get a larger marker with a pulsing ring. Use clustering (offline `leaflet.markercluster` / `react-leaflet-cluster`) so Karachi stays readable, with animated cluster bubbles showing counts. Markers fade/scale in when the data changes; when filters change, animate `fitBounds` to the results.
* Popup on click: date, head of crime, target, place, district, "Open details" button (opens the same detail drawer). If `coord_source === "district"`, add a small note: "Approximate location (district level)".
* Floating **legend** (head-of-crime colours with counts, click an entry to toggle that type on the map only) and a small control to toggle clustering and polygon labels. Clicking a district polygon toggles that district in the global filter (nice-to-have).
* The map must show a clear "No incidents for these filters" overlay when empty.

### 3.6 Insights view
Driven by `/api/stats` (respects filters): animated count-up **stat tiles** (Incidents, Major, Other, Killed ≥, Injured ≥ – label the last two "estimated from names listed"), then recharts charts: incidents by year (bar, major vs other stacked), by month (bar), by head of crime (horizontal bars using the §4 colours), top districts (horizontal bars), top targets, claimed-by (donut). Below: a **Yearly casualty summary** table from `yearlyCasualties` (Year, Civilian Martyred, Civilian Injured, LEAs Martyred, LEAs Injured; null → "–") with a note that these are the officially compiled figures. Clicking a bar (year / head / district) applies that filter. Smooth chart animations.

### 3.7 Export dialog (button in top bar)
* Modal titled "Export to Excel". It starts pre-filled with the current filters, but lets the user change **Year, Month, Category, Region, District, Head of crime, Target, Claimed by, date range** independently (reuse the same multi-select components).
* Shows a **live preview count** ("19 incidents will be exported") by calling `/api/incidents?<filters>&pageSize=1` (debounced) and reading `total`. Disable the download button when 0.
* **Download .xlsx** button → `/api/export?<filters>`; show a loading state and a success toast. Explain in one line: "The file keeps the same layout as the original workbook (3 sheets)."

### 3.8 Add / Edit incident dialog
* Opens from **Add incident**. Large modal (full-screen sheet on mobile) with grouped sections and a sticky footer (Cancel / **Save incident**):
  1. *Classification* – Category (segmented MAJOR/OTHER), Head of crime (combobox: pick an existing value or type a new one), Target (combobox, same), Claimed by (combobox, optional).
  2. *When & where* – Date (required, `<input type="date">`), Time (optional), District (required select grouped by region), Place of incident.
  3. *Case details* – Importance of the case, FIR details, Brief details (textarea).
  4. *People* – Name of killed/Shaheed (textarea, hint: "one per line, e.g. 1. Name"), Name of injured (textarea), Accused involved (textarea), Killed count / Injured count (optional numbers; hint "leave empty to count automatically from the names").
  5. *Map position (optional)* – small offline map (same GeoJSON base) where the user can click to drop a pin; show the lat/lng; a "Clear" button. Hint: "If you skip this, the incident is placed automatically inside the selected district."
* Client-side validation for required fields, plus display of server `422` `fields` messages under the matching inputs. On success: close, toast "Incident added", refetch lists + filters + stats, and **highlight the new card/marker** with a short glow animation (scroll it into view if possible).
* The same dialog in **edit mode** (prefilled) uses `PUT` with only the changed fields.

## 4. Visual design direction
* Feel: a refined, calm **analyst workstation** – think modern ops/intelligence dashboard: generous spacing, crisp typography (Inter), subtle borders, soft layered shadows, rounded-xl corners, restrained accent colour (deep indigo/teal) with a red reserved for MAJOR / critical emphasis. Full light **and** dark themes via CSS variables / Tailwind `dark:` class. Avoid generic template look and avoid heavy gradients.
* Motion language: 150–300 ms ease-out, spring for cards and drawers, count-up numbers, skeleton shimmer, animated filter chips (pop in/out), pulsing ring for MAJOR markers. Nothing flashy; everything purposeful.
* **Head-of-crime colour palette (use everywhere: card stripe, marker, legend, charts):**
  Target Killing `#E5484D` · IED Blast `#F76B15` · Hand Grenade `#D6409F` · Firing `#3E63DD` · Target Shooting `#8E4EC6` · Cracker Blast `#F5D90A` · Suicide Attack `#6B0F1A` · Sectarian Target Killing `#12A594` · Sectarian Target Shooting `#0D74CE` · Attack `#7D8590` · Bottle Bomb `#AB6400` · MBIED `#C2410C` · Chemical Arson Attack `#30A46C` · Political Target Killing `#5B5BD6` · any other/new value → deterministic colour derived from a hash of the string.
  Make sure colours keep sufficient contrast in both themes and never rely on colour alone (legend + text labels).
* Number formatting with `Intl.NumberFormat("en")`; dates with `Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })`.

## 5. Suggested structure (adapt if you have better ideas)
```
app/layout.tsx  app/page.tsx  app/globals.css
components/ shell/(TopBar, ViewSwitcher, ThemeToggle) filters/(FilterPanel, MultiSelect, YearChips, MonthChips, ActiveFilters)
            incidents/(IncidentCard, CardGrid, IncidentTable, DetailDrawer, Skeletons)
            map/(IncidentMap, MapLegend, LocationPicker)  insights/(StatTiles, Charts, CasualtyTable)
            dialogs/(ExportDialog, IncidentFormDialog, ConfirmDialog)  ui/(Button, Dialog, Drawer, Toast, Badge, Combobox …)
hooks/ useFilters.ts (URL-synced state) useIncidents.ts useStats.ts useFilterOptions.ts
lib/client/ types.ts api.ts colors.ts format.ts
```
`app/page.tsx` must be a client-friendly entry (wrap URL-state code in `<Suspense>` as Next requires for `useSearchParams`).

## 6. Output format
1. Short architecture overview (≤ 10 lines).
2. **Every file in full**, each preceded by its path as a heading, in a fenced code block. No placeholders, no "…rest of code", no TODOs.
3. The single `npm install …` command for extra packages.
4. A 5-line "how it behaves" checklist I can use to verify: filter by year 2021 → 19 incidents; map shows markers; export 2021 downloads an .xlsx; Add dialog creates an incident that appears immediately.
