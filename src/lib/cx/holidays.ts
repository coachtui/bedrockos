export interface GcaHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const GCA_HOLIDAYS_2026: GcaHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-19", name: "Martin Luther King Jr. Day" },
  { date: "2026-02-16", name: "President's Day" },
  { date: "2026-03-26", name: "Prince Jonah Kuhio Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-25", name: "Memorial Day" },
  { date: "2026-06-11", name: "King Kamehameha I Day" },
  { date: "2026-06-19", name: "Juneteenth" },
  { date: "2026-07-03", name: "Independence Day (observed)" },
  { date: "2026-08-21", name: "Statehood Day" },
  { date: "2026-09-07", name: "Labor Day" },
  { date: "2026-10-12", name: "Columbus Day" },
  { date: "2026-11-03", name: "General Election Day" },
  { date: "2026-11-11", name: "Veterans' Day" },
  { date: "2026-11-26", name: "Thanksgiving Day" },
  { date: "2026-12-25", name: "Christmas Day" },
];

const HOLIDAY_SET = new Set(GCA_HOLIDAYS_2026.map((h) => h.date));

export function isNonWorkingDay(date: string, workingOverrides: string[]): boolean {
  const d = new Date(date + "T12:00:00");
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return true;
  if (!HOLIDAY_SET.has(date)) return false;
  return !workingOverrides.includes(date);
}
