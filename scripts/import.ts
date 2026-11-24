/**
 * Import the incident workbook into the local SQLite database.
 *
 *   npm run db:import              first-time import (refuses if the table already has rows)
 *   npm run db:reset               wipe incidents + re-import (use after editing the source file)
 *   npx tsx scripts/import.ts --file path/to/other.xlsx --reset
 */
import ExcelJS from "exceljs";
import path from "node:path";
import { DB_PATH, openDb } from "../lib/server/db";
import { seedDistricts } from "../lib/server/districts";
import { placeInDistrict } from "../lib/server/geo";
import {
  estimateCount, monthNameFromDate, normalizeCategory, normalizeClaimed, normalizeDistrict,
  normalizeHead, normalizeTarget, parseDateTime,
} from "../lib/server/normalize";

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const fileArg = args.indexOf("--file");
const FILE = path.resolve(fileArg >= 0 ? args[fileArg + 1] : "data/source.xlsx");

/** Plain text of any ExcelJS cell value (string / number / rich text / formula / date). */
function text(v: ExcelJS.CellValue | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return text(v.result as ExcelJS.CellValue);
    if (v instanceof Date) {
      // genuine Excel date cell -> same dd.mm.yyyy style the rest of the column uses
      const p2 = (n: number) => String(n).padStart(2, "0");
      return `${p2(v.getUTCDate())}.${p2(v.getUTCMonth() + 1)}.${v.getUTCFullYear()}`;
    }
    if ("text" in v) return String(v.text);
  }
  return String(v);
}
const orNull = (s: string) => {
  const t = s.replace(/\r/g, "").trim();
  return t === "" ? null : t;
};

async function main() {
  console.log(`Source : ${FILE}\nDatabase: ${DB_PATH}\n`);
  const db = openDb();
  seedDistricts(db);

  const existing = (db.prepare("SELECT COUNT(*) n FROM incidents").get() as { n: number }).n;
  if (existing > 0 && !reset) {
    console.error(`✖ The database already holds ${existing} incidents. Run "npm run db:reset" to wipe and re-import.`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  // locate the header row (the cell that says "S#"), data starts two rows below (merged header)
  let headerRow = 0;
  for (let r = 1; r <= 15; r++) if (text(ws.getCell(r, 1).value).trim() === "S#") { headerRow = r; break; }
  if (!headerRow) throw new Error('Could not find the header row ("S#") in the first sheet.');
  const headers = Array.from({ length: 15 }, (_, i) => text(ws.getCell(headerRow, i + 1).value).trim());

  const district = db.prepare("SELECT name, latitude, longitude, geo_name FROM districts").all() as
    { name: string; latitude: number; longitude: number; geo_name: string | null }[];
  const dmap = new Map(district.map((d) => [d.name, d]));

  const insert = db.prepare(`
    INSERT INTO incidents (category, source_sno, incident_date, incident_time, date_time_raw, month_raw,
      head_of_crime, target, importance, fir_details, district, district_raw, place, killed_names,
      injured_names, accused, claimed_by, brief_details, killed_count, injured_count,
      latitude, longitude, coord_source, source_raw)
    VALUES (@category, @sno, @date, @time, @dt_raw, @month_raw, @head, @target, @importance, @fir, @district,
      @district_raw, @place, @killed, @injured, @accused, @claimed, @details, @kc, @ic, @lat, @lng, 'district', @raw)`);

  const warnings: string[] = [];
  let n = 0;

  db.transaction(() => {
    if (reset) {
      db.exec("DELETE FROM incidents; DELETE FROM yearly_casualties; DELETE FROM sqlite_sequence WHERE name='incidents';");
    }
    for (let r = headerRow + 2; r <= ws.rowCount; r++) {
      const c = Array.from({ length: 15 }, (_, i) => text(ws.getCell(r, i + 1).value));
      if (c.every((x) => !x.trim())) continue;
      const tag = `row ${r}`;

      const category = normalizeCategory(c[4]);
      if (!category) { warnings.push(`${tag}: skipped – MAJOR/OTHER column is "${c[4]}"`); continue; }

      const { date, time } = parseDateTime(c[6]);
      if (!date) warnings.push(`${tag}: could not read a date from "${c[6].replace(/\n/g, " ")}"`);
      else {
        const m = monthNameFromDate(date)!;
        if (c[1].trim() && !m.toLowerCase().startsWith(c[1].trim().slice(0, 3).toLowerCase()))
          warnings.push(`${tag}: Month column says "${c[1].trim()}" but the date is ${date}`);
      }

      const dName = normalizeDistrict(c[8]);
      if (!dName || !dmap.has(dName)) throw new Error(`${tag}: unrecognised district "${c[8]}" – add a rule in normalizeDistrict()`);
      if (/jacobabad\s+larkana/i.test(c[8])) warnings.push(`${tag}: district "${c[8].trim()}" is ambiguous – stored as Jacobabad`);
      const d = dmap.get(dName)!;
      const pt = placeInDistrict({ lat: d.latitude, lng: d.longitude }, d.geo_name, r);

      const raw: Record<string, string> = {};
      headers.forEach((h, i) => (raw[h] = c[i]));

      insert.run({
        category, sno: Number(c[0]) || null, date, time,
        dt_raw: orNull(c[6]), month_raw: orNull(c[1]),
        head: normalizeHead(c[2]), target: normalizeTarget(c[3]),
        importance: orNull(c[5]), fir: orNull(c[7]),
        district: dName, district_raw: orNull(c[8]),
        place: orNull(c[9]), killed: orNull(c[10]), injured: orNull(c[11]), accused: orNull(c[12]),
        claimed: normalizeClaimed(c[13]), details: orNull(c[14]),
        kc: estimateCount(c[10]), ic: estimateCount(c[11]),
        lat: pt.lat, lng: pt.lng, raw: JSON.stringify(raw),
      });
      n++;
    }

    // sheet 3 -> yearly casualty figures (manually compiled in the workbook)
    const det = wb.worksheets.find((s) => /summary of incident/i.test(s.name));
    if (det) {
      const ins = db.prepare(
        "INSERT OR REPLACE INTO yearly_casualties (year, civilian_martyred, civilian_injured, leas_martyred, leas_injured) VALUES (?,?,?,?,?)");
      const num = (v: ExcelJS.CellValue) => { const t = text(v).trim(); return /^\d+$/.test(t) ? Number(t) : null; };
      for (let r = 1; r <= det.rowCount; r++) {
        const y = num(det.getCell(r, 2).value);
        if (y && y > 1999 && y < 2100)
          ins.run(y, num(det.getCell(r, 6).value), num(det.getCell(r, 7).value), num(det.getCell(r, 8).value), num(det.getCell(r, 9).value));
      }
    }
  })();

  // ------------------------------------------------------------- report ----
  console.log(`✔ Imported ${n} incidents.\n`);

  const perYear = db.prepare(`SELECT year, SUM(category='MAJOR') major, SUM(category='OTHER') other, COUNT(*) total
                              FROM incidents GROUP BY year ORDER BY year`).all() as
    { year: number | null; major: number; other: number; total: number }[];

  // cross-check against the workbook's own "Summary" sheet
  const sumSheet = wb.getWorksheet("Summary");
  const expected = new Map<number, [number, number]>();
  if (sumSheet)
    for (let r = 1; r <= sumSheet.rowCount; r++) {
      const y = Number(text(sumSheet.getCell(r, 1).value));
      if (y > 1999 && y < 2100) expected.set(y, [Number(text(sumSheet.getCell(r, 2).value)), Number(text(sumSheet.getCell(r, 3).value))]);
    }
  console.log("Year   Major  Other  Total   vs workbook Summary sheet");
  let mismatches = 0;
  for (const p of perYear) {
    const e = p.year ? expected.get(p.year) : undefined;
    const ok = e ? e[0] === p.major && e[1] === p.other : undefined;
    if (ok === false) mismatches++;
    console.log(`${String(p.year ?? "none").padEnd(6)} ${String(p.major).padStart(5)} ${String(p.other).padStart(6)} ${String(p.total).padStart(6)}   ${ok === undefined ? "–" : ok ? "✔ matches" : `✖ expected ${e![0]} / ${e![1]}`}`);
  }
  console.log(mismatches ? `\n⚠ ${mismatches} year(s) differ from the Summary sheet – please review.` : "\n✔ Year totals match the workbook's Summary sheet.");

  const q = (s: string) => (db.prepare(s).get() as Record<string, number>);
  const c = q("SELECT COUNT(DISTINCT district) districts, COUNT(DISTINCT head_of_crime) heads, COUNT(DISTINCT target) targets, SUM(killed_count IS NULL) kn, SUM(injured_count IS NULL) inn FROM incidents");
  console.log(`\nDistinct districts: ${c.districts} | heads of crime: ${c.heads} | targets: ${c.targets}`);
  console.log(`Victim counts that could not be estimated from the text (left NULL): killed ${c.kn}, injured ${c.inn}`);

  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} data warning(s):`);
    warnings.forEach((w) => console.log("  - " + w));
  }
  db.close();
}

main().catch((e) => { console.error("✖ Import failed:", e.message ?? e); process.exit(1); });
