const numberFormatter = new Intl.NumberFormat("en");

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return numberFormatter.format(n);
}

export function formatEstimate(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return `≥ ${numberFormatter.format(n)}`;
}

export function formatIncidentDate(
  dateStr: string | null | undefined,
  rawStr?: string | null
): string {
  if (!dateStr) {
    return rawStr?.trim() || "Date unknown";
  }
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const d = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(d.getTime())) return dateStr;
  return dateFormatter.format(d);
}

export function formatDateTime(
  dateStr: string | null | undefined,
  timeStr: string | null | undefined,
  rawStr?: string | null
): string {
  if (!dateStr) {
    return rawStr?.trim() || "Date unknown";
  }
  const formattedDate = formatIncidentDate(dateStr, rawStr);
  if (timeStr && timeStr.trim()) {
    return `${formattedDate} · ${timeStr.trim()}`;
  }
  return formattedDate;
}

export function formatClaimedLabel(val: string | number): string {
  const s = String(val);
  return s === "(none)" ? "Not recorded" : s;
}
