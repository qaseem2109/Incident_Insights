# Sindh Incidents – Backend (Next.js API + SQLite)

Offline, single-file database + REST API. The Gemini-generated frontend plugs into this.

## Why SQLite
| Need | SQLite | Postgres / Mongo |
|---|---|---|
| Works fully offline, no server to install | ✔ one file (`db/incidents.sqlite`) | ✖ needs a running service |
| ~170 rows, filter by year/month/district… | ✔ instant (indexed) | overkill |
| Backup / move to another PC | copy one file | dump / restore |
| Same language as the app (Node) | ✔ `better-sqlite3` | extra drivers/services |

## Setup (Node 20+)
```bash
npm install
npm run db:import      # creates db/incidents.sqlite and loads data/source.xlsx
npm run dev            # http://localhost:3000  (API under /api/*)
```
* `npm run db:reset` wipes the incidents table and re-imports (use after replacing `data/source.xlsx`).
* `npm run db:check` prints a health summary.
* Different workbook: `npx tsx scripts/import.ts --file "C:\path\other.xlsx" --reset`
* The import prints a **verification table** comparing its year/major/other counts with the workbook's own *Summary* sheet.

## Schema (see `lib/server/schema.sql`)
* `incidents` – one row per incident. `year` / `month` are generated columns derived from `incident_date` (ISO), so year/month filters are indexed. Cleaned values for `head_of_crime`, `target`, `district`, `claimed_by`; original text kept in `date_time_raw`, `district_raw`, `month_raw` and the whole original row in `source_raw` (JSON).
* `districts` – 30 Sindh districts with region (Karachi / Interior Sindh) and the point used on the map.
* `yearly_casualties` – the manually compiled civilian/LEA figures from sheet 3 (not derivable from free text).

## API
Filters (all optional, combine freely; multiple values separated by `|`, e.g. `year=2021|2022`):
`year`, `month` (1-12), `category` (MAJOR|OTHER), `region` (Karachi|Interior Sindh), `district`, `head`, `target`, `claimed` (use `(none)` for no claim), `from`/`to` (YYYY-MM-DD), `q` (free-text search).

| Method & path | Purpose |
|---|---|
| `GET /api/incidents` | list. Extra params: `page`, `pageSize` (≤500), `sort` (date,id,district,head,target,category,killed,injured), `order`, `all=1` (everything, for the map) |
| `POST /api/incidents` | add incident (JSON). Required: `category`, `incident_date`, `head_of_crime`, `target`, `district`. Returns 201 + row, or 422 `{error, fields}` |
| `GET/PUT/DELETE /api/incidents/:id` | read / partial update / delete |
| `GET /api/filters` | every dropdown option with counts |
| `GET /api/stats` | totals + breakdowns for the current filters (+ official yearly casualties) |
| `GET /api/export` | **.xlsx download** of the current filters, same 3-sheet layout as the source workbook |

## Things worth knowing (data notes)
1. **Map positions are approximate.** The workbook has no coordinates, so each incident is placed *inside its district* (`coord_source = 'district'`). An exact position can be saved with `PUT /api/incidents/:id {latitude, longitude}` → `coord_source = 'manual'`.
2. **`killed_count` / `injured_count` are estimates** counted from the names text (lower bound; `NULL` = unknown). Your manually compiled yearly figures are in `yearly_casualties` and are the official numbers.
3. Cleaning rules: spelling variants merged (e.g. *Hand grenade / Hand Grenad / Hand Grenade attack* → **Hand Grenade**; *Ranger/Rangers* → **Rangers**; *Oct/October* → full month name on export; *SBA / Shaheed Benazeer abad* → **Shaheed Benazirabad**). Rules live in `lib/server/normalize.ts`.
4. Items to review in the source file: row 108 (Month says *July* but date is 08.06.2024); row 141 district "Jacobabad Larkana" is stored as Jacobabad; "City, Karachi" is stored as Karachi South; "NS" in *Claimed by* is kept as-is; six cells containing "None" are treated as "no claim recorded".
5. Export orders incidents by date (MAJOR first, then Other, S# restarts), so it is not row-for-row identical to the source order, but contents are identical (verified 173/173).
6. Boundary file `public/geo/sindh_districts.geojson` comes from WFP 2022 admin boundaries (via github.com/AhmadAmmar/shared-geodata). Check WFP's terms before redistributing outside your organisation.

## Plugging in the frontend
Put the Gemini output into `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/`, `hooks/`, `lib/client/`. Do not overwrite `app/api/`, `lib/server/`, `scripts/`, `db/`, `data/`, `next.config.ts`. Install the extra packages Gemini lists, then `npm run dev`.
