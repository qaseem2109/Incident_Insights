/**
 * Cleaning / normalisation helpers.
 * Used by the importer (messy spreadsheet text) AND by the API (new incidents).
 */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const clean = (s: unknown): string =>
  String(s ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

const oneLine = (s: unknown): string => clean(s).replace(/\s*\n\s*/g, " ").trim();

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

// ---------------------------------------------------------------- dates ----

export interface ParsedDateTime {
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
}

const MONTH_LOOKUP: Record<string, number> = {};
MONTH_NAMES.forEach((m, i) => {
  MONTH_LOOKUP[m.toLowerCase()] = i + 1;
  MONTH_LOOKUP[m.slice(0, 3).toLowerCase()] = i + 1;
});
MONTH_LOOKUP["sept"] = 9;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function validDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Handles '19.06.2020 0935', '17.02.23\n1900 to 2355 hrs', '02-08-2021 2245',
 *  '18 August 2026, at about 0855 hours', '15.03.21', '19.06.2020 at 910 hrs' … */
export function parseDateTime(raw: unknown): ParsedDateTime {
  const s = clean(raw).replace(/\n/g, " ");
  if (!s) return { date: null, time: null };

  let date: string | null = null;
  let rest = s;

  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/); // ISO yyyy-mm-dd
  if (m) {
    date = validDate(Number(m[1]), Number(m[2]), Number(m[3]));
    rest = s.replace(m[0], " ");
  } else if ((m = s.match(/(\d{1,2})\s*[.\-\/]\s*(\d{1,2})\s*[.\-\/]\s*(\d{2,4})/))) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    date = validDate(y, Number(m[2]), Number(m[1]));
    rest = s.replace(m[0], " ");
  } else {
    m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
    if (m && MONTH_LOOKUP[m[2].toLowerCase()]) {
      date = validDate(Number(m[3]), MONTH_LOOKUP[m[2].toLowerCase()], Number(m[1]));
      rest = s.replace(m[0], " ");
    }
  }

  let time: string | null = null;
  const t = rest.match(/\b(\d{3,4})\b/);
  if (t) {
    const v = t[1].padStart(4, "0");
    const hh = Number(v.slice(0, 2));
    const mm = Number(v.slice(2));
    if (hh < 24 && mm < 60) time = `${pad(hh)}:${pad(mm)}`;
  }
  return { date, time };
}

/** 'DD.MM.YYYY at HHMM hrs' – used when a new incident is added through the UI. */
export function formatDateTimeRaw(date: string | null, time: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}` + (time ? ` at ${time.replace(":", "")} hrs` : "");
}

export const monthNameFromDate = (date: string | null): string | null =>
  date ? MONTH_NAMES[Number(date.slice(5, 7)) - 1] ?? null : null;

// ------------------------------------------------------------ categories ----

export function normalizeCategory(v: unknown): "MAJOR" | "OTHER" | null {
  const s = clean(v).toUpperCase();
  return s === "MAJOR" ? "MAJOR" : s === "OTHER" ? "OTHER" : null;
}

// --------------------------------------------------------------- head -------

export function normalizeHead(raw: unknown): string {
  const s = oneLine(raw);
  const l = s.toLowerCase();
  if (!l) return "Unknown";
  if (l.includes("sectarian") && l.includes("shoot")) return "Sectarian Target Shooting";
  if (l.includes("sectarian")) return "Sectarian Target Killing";
  if (l.includes("political")) return "Political Target Killing";
  if (l.startsWith("target killing")) return "Target Killing";
  if (l.startsWith("target shooting")) return "Target Shooting";
  if (l.includes("grenad")) return "Hand Grenade";
  if (l.includes("suicide")) return "Suicide Attack";
  if (l.includes("mbied")) return "MBIED";
  if (/^ied\b/.test(l)) return "IED Blast";
  if (l.includes("cracker")) return "Cracker Blast";
  if (l.includes("bottle bomb")) return "Bottle Bomb";
  if (l.includes("chemical")) return "Chemical Arson Attack";
  if (l.startsWith("firing")) return "Firing";
  if (l.startsWith("attack")) return "Attack";
  return titleCase(s);
}

// ------------------------------------------------------------- target -------

export function normalizeTarget(raw: unknown): string {
  const s = oneLine(raw);
  const l = s.toLowerCase();
  if (!l) return "Unknown";
  if (l.includes("aswj")) return "ASWJ Sect";
  if (l.startsWith("civilian")) return "Civilian";
  if (l.includes("ranger")) return "Rangers";
  if (l.includes("chinese")) return "Chinese Nationals";
  if (l.includes("japanese")) return "Japanese Nationals";
  if (l.includes("govt") || l.includes("government")) return "Govt. Installation";
  if (l.includes("shia")) return "Shia Sect";
  if (l === "police") return "Police";
  return s;
}

// ------------------------------------------------------------ claimed by ----

export function normalizeClaimed(raw: unknown): string | null {
  const s = oneLine(raw);
  const l = s.toLowerCase();
  if (!l || l === "-" || l === "none") return null;
  if (l === "unclaimed") return "Unclaimed";
  if (l === "ns") return "NS";
  if (l.includes("jamaat-ul-ahrar")) return "FaK / Jamaat-ul-Ahrar";
  if (l === "fak" || l === "ttp (fak)") return "TTP (FaK)";
  if (l.startsWith("zainab") || l.startsWith("zainbi")) return "Zainabiyoun Brigade";
  if (l.startsWith("brg")) return "BRG";
  return s;
}

// ------------------------------------------------------------ districts -----

/** Returns the canonical district name, or null if it cannot be recognised. */
export function normalizeDistrict(raw: unknown): string | null {
  const l = oneLine(raw).toLowerCase().replace(/[.,@]/g, " ").replace(/\s+/g, " ").trim();
  if (!l) return null;
  // Karachi sub-districts (the sheet sometimes omits the word "Karachi")
  if (l.includes("central")) return "Karachi Central";
  if (l.includes("keamari")) return "Karachi Keamari";
  if (l.includes("korangi")) return "Karachi Korangi";
  if (l.includes("malir")) return "Karachi Malir";
  if (l.includes("east")) return "Karachi East";
  if (l.includes("west")) return "Karachi West";
  if (l.includes("south")) return "Karachi South";
  if (l.includes("city")) return "Karachi South"; // "City, Karachi" (Saddar/Kharadar side) – see README
  // Interior Sindh
  if (l.includes("jacobabad")) return "Jacobabad";
  if (l.includes("kambar") || l.includes("qambar") || l.includes("shahdadkot")) return "Kambar Shahdadkot";
  if (l === "sba" || l.includes("benazir") || l.includes("benazeer")) return "Shaheed Benazirabad";
  if (l.includes("feroz")) return "Naushahro Feroze";
  if (l.includes("kashmore") || l.includes("kandhkot")) return "Kashmore";
  if (l.includes("mitiari") || l.includes("matiari")) return "Matiari";
  if (l.includes("sangher") || l.includes("sanghar")) return "Sanghar";
  if (l.includes("tando allah")) return "Tando Allahyar";
  if (l.includes("tando muhammad") || l.includes("tando m")) return "Tando Muhammad Khan";
  if (l.includes("mirpur")) return "Mirpur Khas";
  if (l.includes("umer") || l.includes("umar")) return "Umerkot";
  const known = [
    "Badin", "Dadu", "Ghotki", "Hyderabad", "Jamshoro", "Khairpur", "Larkana",
    "Shikarpur", "Sujawal", "Sukkur", "Tharparkar", "Thatta",
  ];
  return known.find((k) => l.includes(k.toLowerCase())) ?? null;
}

// ---------------------------------------------------- victim count (est.) ---

/**
 * Best-effort estimate of the number of people in a "Name of Killed / injured"
 * cell. Returns NULL when it can't be told (never guesses wildly).
 *   'Nil' / '-'                    -> 0
 *   '1. A\n2. B'                   -> 2
 *   '05 Shaheed:\n01. ...'         -> max(header number, numbered lines)
 *   'Muhammad Rafique (civilian)'  -> 1  (single line, no digits)
 */
export function estimateCount(raw: unknown): number | null {
  const s = clean(raw);
  if (!s) return null;
  const l = s.toLowerCase().replace(/[.\s]+$/g, "");
  if (/^(nil|nill|-|--|none|no|n\/a|na|not any|no one|no casualty|no injured|no loss)$/.test(l)) return 0;
  if (/^(nil|no)\b/.test(l) && s.length < 40) return 0;

  const lines = s.split("\n").map((x) => x.trim()).filter(Boolean);
  const numbered = lines.filter((x) => /^\(?\d{1,3}\s*[\.\)\-:]\s*\S/.test(x)).length;
  const head = s.match(/^\s*0*(\d{1,3})\s*(?:\(\d+\))?\s*(?:persons?|killed|shaheed|martyred|injured|civilians?|police|policemen|rangers?|people|passers?|terrorists?)/i);
  const headNum = head ? Number(head[1]) : 0;
  // "30/32 persons (names not mentioned)" -> 32
  const persons = [...s.matchAll(/(\d{1,3})(?:\s*\/\s*(\d{1,3}))?\s*(?:persons|people)\b/gi)]
    .map((m) => Math.max(Number(m[1]), Number(m[2] ?? 0)));
  const n = Math.max(numbered, headNum, ...persons, 0);
  if (n > 0) return n;
  // one short line that is just a name (digits allowed: ages, badge numbers)
  if (lines.length === 1 && lines[0].length < 150) return 1;
  return null;
}
