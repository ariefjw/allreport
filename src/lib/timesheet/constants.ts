export const MONTHS_INDONESIA: Record<number, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "Mei",
  6: "Jun",
  7: "Jul",
  8: "Agu",
  9: "Sep",
  10: "Okt",
  11: "Nov",
  12: "Des",
};

// Full month names for timesheet filenames and the Excel "Periode" cell.
export const MONTHS_INDONESIA_FULL: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

export type EmployeeData = {
  employeeNo: string;
  fullName: string;
  organization: string;
  position: string;
  client: string;
  project: string;
};

export const TIMESHEET_BUCKET = "timesheet-signatures";
export const MAX_SIGNATURE_BYTES = 1024 * 1024;
export const SIGNATURE_URL_TTL = 60 * 60 * 24;
export const ALLOWED_SIGNATURE_MIME = ["image/png", "image/jpeg"] as const;

// Never persisted per user: every user gets these as the form's starting value.
export const DEFAULT_TIMESHEET_PROFILE = {
  organization: "Professional Services",
  position: "IT Support",
  client: "PT. Bank BTPN Tbk",
  project: "IT Big Data Operations",
} as const;
