export type Rating = 'A' | 'B' | 'C' | 'X';

export type FollowUpStatus = 'OPEN' | 'CLOSED';

export type ProgramType = 
  | 'PPM' // Program Mesin
  | 'PPE' // Program Elektrik
  | 'FC'  // Filter Cutting
  | 'MP'  // Magnetic Plug
  | 'CR'  // Cylinder Rating
  | 'PAP' // Program Analisa Pelumas
  | 'PPA' // Pemeriksaan Attachment
  | 'PPU' // Pemeriksaan Undercarriage
  | (string & {});

export interface Inspection {
  id: string;
  date: string; // DD/MM/YYYY or YYYY-MM-DD
  unitId: string;
  hoursMeter?: number | string; // e.g. 12500 or "12500.5"
  program: ProgramType;
  model: string;
  component: string;
  system?: string;
  findings: string;
  recommendation: string;
  rating: Rating;
  status: string; // e.g. "OPEN"
  inspector: string;
  followUp: string;
  followUpStatus: FollowUpStatus;
  dueDate: string;
  imageUrl?: string; // photo/finding image
  createdAt?: string;
  updatedAt?: string;
}

// Google Sheets Raw Row Representation
export interface GoogleSheetRow {
  ID?: string;
  DATE?: string;
  UNIT_ID?: string;
  HOURS_METER?: string;
  HOUR_METER?: string;
  HM?: string;
  SMR?: string;
  PROGRAM?: string;
  MODEL?: string;
  COMPONENT?: string;
  SYSTEM?: string;
  FINDINGS?: string;
  RECOMMENDATION?: string;
  RATING?: string;
  STATUS?: string;
  INSPECTOR?: string;
  FOLLOW_UP?: string;
  FOLLOW_UP_STATUS?: string;
  DUE_DATE?: string;
  IMAGE_URL?: string;
  IMAGE?: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
  [key: string]: string | undefined;
}

export interface DashboardStats {
  totalUnits: number;
  totalInspections: number;
  normalA: number;
  cautionB: number;
  criticalC: number;
  severeX: number;
  openFollowUp: number;
}

export interface TrendDataPoint {
  period: string; // e.g., "Jan 2026", "25 Sep"
  count: number;
  normal: number;
  caution: number;
  critical: number;
  severe: number;
}

export interface SeverityDistributionItem {
  rating: Rating;
  label: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
