-- =====================================================================
--  Sindh Incidents – SQLite schema (offline, single-file database)
-- =====================================================================
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Lookup: canonical districts + the point used to place incidents on the map.
CREATE TABLE IF NOT EXISTS districts (
  name       TEXT PRIMARY KEY,              -- canonical name, e.g. 'Karachi East'
  region     TEXT NOT NULL,                 -- 'Karachi' | 'Interior Sindh'
  latitude   REAL NOT NULL,                 -- centroid (computed from boundary file)
  longitude  REAL NOT NULL,
  geo_name   TEXT                           -- matching name in sindh_districts.geojson
);

-- One row per incident (the main sheet "2020 to 2026").
CREATE TABLE IF NOT EXISTS incidents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category       TEXT NOT NULL CHECK (category IN ('MAJOR','OTHER')),   -- "MAJOR/OTHER"
  source_sno     INTEGER,                   -- S# in the original sheet (restarts per category)

  incident_date  TEXT,                      -- ISO 'YYYY-MM-DD' (parsed from "Date/ Time of incident")
  incident_time  TEXT,                      -- 'HH:MM' (first time found) or NULL
  date_time_raw  TEXT,                      -- exact original text, used for export fidelity
  year           INTEGER GENERATED ALWAYS AS (CAST(substr(incident_date, 1, 4) AS INTEGER)) VIRTUAL,
  month          INTEGER GENERATED ALWAYS AS (CAST(substr(incident_date, 6, 2) AS INTEGER)) VIRTUAL,
  month_raw      TEXT,                      -- "Month" column as typed in the sheet

  head_of_crime  TEXT NOT NULL,             -- normalised ("Hand grenade" -> "Hand Grenade")
  target         TEXT NOT NULL,             -- normalised
  importance     TEXT,                      -- "Importance of the Case"
  fir_details    TEXT,
  district       TEXT NOT NULL REFERENCES districts(name) ON UPDATE CASCADE,
  district_raw   TEXT,                      -- original text e.g. 'Central, Karachi'
  place          TEXT,                      -- "Place of incident"
  killed_names   TEXT,                      -- "Name of Killed/Shaheed" (free text)
  injured_names  TEXT,                      -- "Name of injured"        (free text)
  accused        TEXT,                      -- "Accused involved"
  claimed_by     TEXT,                      -- normalised ("Unclaimed", "BLA", ...) or NULL
  brief_details  TEXT,

  killed_count   INTEGER,                   -- ESTIMATED from the names text; NULL = unknown
  injured_count  INTEGER,

  latitude       REAL,                      -- map position
  longitude      REAL,
  coord_source   TEXT NOT NULL DEFAULT 'district'
                 CHECK (coord_source IN ('district','manual')),         -- 'district' = approximate

  source_raw     TEXT,                      -- JSON of the original spreadsheet row (audit trail)
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inc_year      ON incidents(year);
CREATE INDEX IF NOT EXISTS idx_inc_month     ON incidents(year, month);
CREATE INDEX IF NOT EXISTS idx_inc_district  ON incidents(district);
CREATE INDEX IF NOT EXISTS idx_inc_head      ON incidents(head_of_crime);
CREATE INDEX IF NOT EXISTS idx_inc_target    ON incidents(target);
CREATE INDEX IF NOT EXISTS idx_inc_category  ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_inc_claimed   ON incidents(claimed_by);

-- Sheet "2020-2026 Summary of Incident": casualty figures per year that are
-- compiled manually in the workbook (civilian vs LEA split is not derivable
-- from the free-text names). NULL means "-" in the sheet.
CREATE TABLE IF NOT EXISTS yearly_casualties (
  year               INTEGER PRIMARY KEY,
  civilian_martyred  INTEGER,
  civilian_injured   INTEGER,
  leas_martyred      INTEGER,
  leas_injured       INTEGER
);
