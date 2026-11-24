import ExcelJS from "exceljs";
import type Database from "better-sqlite3";
import { getDb } from "./db";
import { Incident, Filters } from "./incidents";
import { monthNameFromDate } from "./normalize";

/**
 * Builds an .xlsx with the SAME 3-sheet layout as the original workbook:
 *   1. "2020 to 2026"                  – incident register (MAJOR first, then OTHER, S# restarts)
 *   2. "Summary"                       – Year | Major | Other | Total
 *   3. "2020-2026 Summary of Incident" – per-year incidents + casualty figures
 */
const THIN = { style: "thin" as const };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const HEADERS = [
  "S#", "Month", "Head of crime", "Target", "MAJOR/OTHER", "Importance of the Case",
  "Date/ Time of incident", "FIR details", "District", "Place of incident",
  "Name of Killed/Shaheed", "Name of injured", "Accused involved", "Claimed by", "Brief details",
];
const WIDTHS = [4.7, 11.3, 15.7, 12.9, 11.7, 27.9, 13.6, 19, 13.1, 20.1, 29.1, 35.7, 52.9, 13.7, 55.6];
const LEFT_COLS = new Set([8, 9, 10, 11, 12, 13, 15]); // H..M and O are left aligned in the source

const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function isWholeYearScope(f: Filters): boolean {
  return !f.month.length && !f.district.length && !f.region.length && !f.head.length && !f.target.length &&
    !f.claimed.length && !f.category.length && !f.q && !f.from && !f.to;
}

export function describeFilters(f: Filters): string {
  const parts: string[] = [];
  if (f.year.length) parts.push(`Year: ${f.year.join(", ")}`);
  if (f.month.length) parts.push(`Month: ${f.month.map((m) => monthNameFromDate(`2000-${String(m).padStart(2, "0")}-01`)).join(", ")}`);
  if (f.category.length) parts.push(`Category: ${f.category.join(", ")}`);
  if (f.region.length) parts.push(`Region: ${f.region.join(", ")}`);
  if (f.district.length) parts.push(`District: ${f.district.join(", ")}`);
  if (f.head.length) parts.push(`Head of crime: ${f.head.join(", ")}`);
  if (f.target.length) parts.push(`Target: ${f.target.join(", ")}`);
  if (f.claimed.length) parts.push(`Claimed by: ${f.claimed.join(", ")}`);
  if (f.from || f.to) parts.push(`Dates: ${f.from || "…"} to ${f.to || "…"}`);
  if (f.q) parts.push(`Search: "${f.q}"`);
  return parts.join(" | ");
}

export async function buildWorkbook(rows: Incident[], f: Filters, db: Database.Database = getDb()): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sindh Incidents System";
  wb.created = new Date();

  const years = [...new Set(rows.map((r) => r.year).filter((y): y is number => y !== null))].sort();
  const label = years.length === 0 ? "No data" : years.length === 1 ? String(years[0]) : `${years[0]} to ${years[years.length - 1]}`;

  // ------------------------------------------------------------ sheet 1 ----
  const ws = wb.addWorksheet(label.length > 31 ? label.slice(0, 31) : label);
  WIDTHS.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const major = rows.filter((r) => r.category === "MAJOR");
  const other = rows.filter((r) => r.category === "OTHER");

  ws.mergeCells("A1:O1");
  const filterText = describeFilters(f);
  ws.getCell("A1").value = filterText ? `Terrorism Incidents in Sindh – ${filterText}` : "Terrorism Incidents in Sindh";
  ws.getCell("A1").font = { name: "Calibri", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getRow(1).height = 22;

  const first = 7;
  const last = Math.max(first, first + rows.length - 1);
  const label2: [string, string][] = [["A2", "Major cases"], ["A3", "Other cases"]];
  label2.forEach(([addr, text], i) => {
    const r = i + 2;
    ws.mergeCells(`A${r}:B${r}`);
    ws.getCell(addr).value = text;
    ws.getCell(`C${r}`).value = {
      formula: `COUNTIF($E$${first}:$E$${last},"${i === 0 ? "MAJOR" : "Other"}")`,
      result: i === 0 ? major.length : other.length,
    };
    for (const c of ["A", "B", "C"]) {
      const cell = ws.getCell(`${c}${r}`);
      cell.font = { name: "Calibri", size: 14, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = BORDER;
    }
  });

  HEADERS.forEach((h, i) => {
    ws.mergeCells(5, i + 1, 6, i + 1);
    const c = ws.getCell(5, i + 1);
    c.value = h;
    c.font = { name: "Calibri", size: 14, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDER;
    ws.getCell(6, i + 1).border = BORDER;
  });
  ws.getRow(5).height = 25.5;
  ws.getRow(6).height = 29.25;

  let r = first;
  const writeGroup = (group: Incident[]) => {
    group.forEach((inc, idx) => {
      const month = monthNameFromDate(inc.incident_date) ?? inc.month_raw ?? "";
      const dt = inc.date_time_raw ?? [inc.incident_date, inc.incident_time].filter(Boolean).join(" ");
      const vals = [
        idx + 1, month, inc.head_of_crime, inc.target, inc.category === "MAJOR" ? "MAJOR" : "Other",
        inc.importance ?? "-", dt, inc.fir_details ?? "", inc.district, inc.place ?? "",
        inc.killed_names ?? "-", inc.injured_names ?? "-", inc.accused ?? "-", inc.claimed_by ?? "-", inc.brief_details ?? "",
      ];
      vals.forEach((v, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = v as ExcelJS.CellValue;
        c.font = { name: "Calibri", size: 12 };
        c.alignment = { horizontal: LEFT_COLS.has(i + 1) ? "left" : "center", vertical: "middle", wrapText: true };
        c.border = BORDER;
      });
      r++;
    });
  };
  writeGroup(major);
  writeGroup(other);
  ws.views = [{ state: "frozen", ySplit: 6, xSplit: 0 }];

  // ------------------------------------------------------------ sheet 2 ----
  const sum = wb.addWorksheet("Summary");
  [9.57, 20, 21.57, 13].forEach((w, i) => (sum.getColumn(i + 1).width = w));
  ["Year", "Major Incident", "Other Incident", "Total"].forEach((h, i) => {
    const c = sum.getCell(3, i + 1);
    c.value = h;
    c.font = { name: "Verdana", size: 12, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDER;
  });
  sum.getRow(3).height = 24;
  const perYear = years.map((y) => ({
    y,
    major: rows.filter((x) => x.year === y && x.category === "MAJOR").length,
    other: rows.filter((x) => x.year === y && x.category === "OTHER").length,
  }));
  perYear.forEach((p, i) => {
    const rr = 4 + i;
    const vals: ExcelJS.CellValue[] = [p.y, p.major, p.other, { formula: `B${rr}+C${rr}`, result: p.major + p.other }];
    vals.forEach((v, k) => {
      const c = sum.getCell(rr, k + 1);
      c.value = v;
      c.font = { name: "Verdana", size: 12, bold: k === 0 };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = BORDER;
    });
    sum.getRow(rr).height = 18;
  });
  const tr = 4 + perYear.length;
  const lastY = Math.max(4, tr - 1);
  const totals = [
    "Total",
    { formula: `SUM(B4:B${lastY})`, result: perYear.reduce((a, p) => a + p.major, 0) },
    { formula: `SUM(C4:C${lastY})`, result: perYear.reduce((a, p) => a + p.other, 0) },
    { formula: `SUM(D4:D${lastY})`, result: perYear.reduce((a, p) => a + p.major + p.other, 0) },
  ];
  totals.forEach((v, k) => {
    const c = sum.getCell(tr, k + 1);
    c.value = v as ExcelJS.CellValue;
    c.font = { name: "Verdana", size: 12, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDER;
  });
  sum.getRow(tr).height = 37.5;

  // ------------------------------------------------------------ sheet 3 ----
  const det = wb.addWorksheet("2020-2026 Summary of Incident");
  [4.57, 8, 12.43, 11.43, 13.29, 12.86, 10.71, 12.86, 10.71, 12.86].forEach((w, i) => (det.getColumn(i + 1).width = w));
  det.mergeCells("A1:J1");
  const t = det.getCell("A1");
  t.value = `Incident Detail ${label}`;
  t.font = { name: "Verdana", size: 18 };
  t.fill = solid("FFFFC000");
  t.alignment = { horizontal: "center", vertical: "middle" };
  for (let c = 1; c <= 10; c++) det.getCell(1, c).border = BORDER;
  det.getRow(1).height = 37.5;

  const H3 = ["S#", "Year", "Major Incident", "Other Incident", "Total Incidents", "Civilian Martyred",
    "Civilian Injured", "LEAs Martyred", "LEAs Injured", "Total Martyred\nInjured"];
  H3.forEach((h, i) => {
    const c = det.getCell(3, i + 1);
    c.value = h;
    c.font = { name: "Verdana", size: 12, bold: true };
    c.fill = solid("FFFBE5D6");
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = BORDER;
  });
  det.getRow(3).height = 45;

  const wholeYears = isWholeYearScope(f);
  const cas = new Map(
    (db.prepare("SELECT * FROM yearly_casualties").all() as Record<string, number | null>[]).map((x) => [x.year as number, x]),
  );
  const FILL = ["FFFBE5D6", "FFFBE5D6", "FFFFF2CC", "FFFFF2CC", "FFFBE5D6", "FFDEEBF7", "FFD9E2F3", "FFDEEBF7", "FFD9E2F3", "FFFBE5D6"];
  perYear.forEach((p, i) => {
    const rr = 4 + i;
    const c = cas.get(p.y);
    const dash = (v: number | null | undefined) => (wholeYears ? (v ?? "-") : "n/a");
    const casVals = [dash(c?.civilian_martyred), dash(c?.civilian_injured), dash(c?.leas_martyred), dash(c?.leas_injured)];
    const numeric = casVals.reduce<number>((a, v) => a + (typeof v === "number" ? v : 0), 0);
    const vals: ExcelJS.CellValue[] = [
      i + 1, p.y, p.major, p.other,
      { formula: `C${rr}+D${rr}`, result: p.major + p.other },
      ...(casVals as ExcelJS.CellValue[]),
      wholeYears ? { formula: `SUM(F${rr}:I${rr})`, result: numeric } : "n/a",
    ];
    vals.forEach((v, k) => {
      const cell = det.getCell(rr, k + 1);
      cell.value = v;
      cell.font = { name: "Verdana", size: 11 };
      cell.fill = solid(FILL[k]);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = BORDER;
    });
    det.getRow(rr).height = 20.25;
  });
  const dt = 4 + perYear.length;
  const lastD = Math.max(4, dt - 1);
  det.mergeCells(`A${dt}:B${dt}`);
  det.getCell(`A${dt}`).value = "Total";
  const colSum = (col: string, result: number) => ({ formula: `SUM(${col}4:${col}${lastD})`, result });
  const sums = perYear.reduce(
    (a, p) => {
      const c = cas.get(p.y);
      a.maj += p.major; a.oth += p.other; a.tot += p.major + p.other;
      a.f += c?.civilian_martyred ?? 0; a.g += c?.civilian_injured ?? 0; a.h += c?.leas_martyred ?? 0; a.i += c?.leas_injured ?? 0;
      return a;
    },
    { maj: 0, oth: 0, tot: 0, f: 0, g: 0, h: 0, i: 0 },
  );
  const tvals: [string, ExcelJS.CellValue][] = [
    ["C", colSum("C", sums.maj)], ["D", colSum("D", sums.oth)], ["E", colSum("E", sums.tot)],
    ["F", wholeYears ? colSum("F", sums.f) : "n/a"], ["G", wholeYears ? colSum("G", sums.g) : "n/a"],
    ["H", wholeYears ? colSum("H", sums.h) : "n/a"], ["I", wholeYears ? colSum("I", sums.i) : "n/a"],
    ["J", wholeYears ? colSum("J", sums.f + sums.g + sums.h + sums.i) : "n/a"],
  ];
  for (let c = 1; c <= 10; c++) {
    const cell = det.getCell(dt, c);
    cell.font = { name: "Verdana", size: 12, bold: true };
    cell.fill = solid("FFFBE5D6");
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDER;
  }
  tvals.forEach(([col, v]) => (det.getCell(`${col}${dt}`).value = v));
  det.getRow(dt).height = 31.5;
  if (!wholeYears) {
    det.mergeCells(`A${dt + 2}:J${dt + 2}`);
    const n = det.getCell(`A${dt + 2}`);
    n.value = "Casualty columns (civilian / LEA) are compiled per full year, so they are shown as n/a when other filters are applied.";
    n.font = { name: "Verdana", size: 10, italic: true };
    n.alignment = { wrapText: true, vertical: "top" };
    det.getRow(dt + 2).height = 30;
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
