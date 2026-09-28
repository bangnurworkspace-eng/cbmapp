import { Inspection, DashboardStats, Rating, TrendDataPoint, SeverityDistributionItem } from '../types/inspection';

/**
 * Normalizes input rating string to strictly 'A' | 'B' | 'C' | 'X'
 */
export function normalizeRating(raw: string | undefined | null): Rating {
  if (!raw) return 'A';
  const clean = raw.trim().toUpperCase();
  if (clean.startsWith('X') || clean.includes('SEVERE')) return 'X';
  if (clean.startsWith('C') || clean.includes('CRITICAL')) return 'C';
  if (clean.startsWith('B') || clean.includes('CAUTION')) return 'B';
  return 'A'; // Defaults to Normal
}

/**
 * Display label according to exact specification:
 * A - Normal
 * B - Caution
 * C - Critical
 * X - Severe
 */
export function getRatingDisplayLabel(rating: Rating): string {
  switch (rating) {
    case 'A': return 'A - Normal';
    case 'B': return 'B - Caution';
    case 'C': return 'C - Critical';
    case 'X': return 'X - Severe';
    default: return 'A - Normal';
  }
}

/**
 * Normalizes Date string to a standard YYYY-MM-DD for comparison and parsing
 */
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-') return null;

  // DD/MM/YYYY or DD-MM-YYYY format
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[\/\-]/).map(Number);
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    return new Date(year, month - 1, day);
  }

  // YYYY-MM-DD format
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return new Date(year, month - 1, day);
  }

  // Fallback native
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Checks if a given inspection date string falls within [startDateStr, endDateStr]
 */
export function isDateInRange(
  dateStr: string | undefined | null,
  startDateStr: string,
  endDateStr: string
): boolean {
  if (!startDateStr && !endDateStr) return true;
  const targetDate = parseDate(dateStr);
  if (!targetDate) return true; // Keep if no parseable date

  const targetTime = targetDate.getTime();

  if (startDateStr) {
    const parts = startDateStr.split('-').map(Number);
    const start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (targetTime < start.getTime()) return false;
  }

  if (endDateStr) {
    const parts = endDateStr.split('-').map(Number);
    const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    if (targetTime > end.getTime()) return false;
  }

  return true;
}

/**
 * Calculates core dashboard statistics dynamically
 */
export function calculateDashboardStats(inspections: Inspection[]): DashboardStats {
  if (!inspections || inspections.length === 0) {
    return {
      totalUnits: 0,
      totalInspections: 0,
      normalA: 0,
      cautionB: 0,
      criticalC: 0,
      severeX: 0,
      openFollowUp: 0,
    };
  }

  const uniqueUnits = new Set<string>();
  let normalA = 0;
  let cautionB = 0;
  let criticalC = 0;
  let severeX = 0;
  let openFollowUp = 0;

  for (const item of inspections) {
    if (item.unitId && item.unitId.trim()) {
      uniqueUnits.add(item.unitId.trim().toUpperCase());
    }

    const normRating = normalizeRating(item.rating);
    if (normRating === 'A') normalA++;
    else if (normRating === 'B') cautionB++;
    else if (normRating === 'C') criticalC++;
    else if (normRating === 'X') severeX++;

    const followStatus = (item.followUpStatus || '').trim().toUpperCase();
    const hasFollowUp = (item.followUp && item.followUp.trim().length > 0) || followStatus.length > 0;

    if (hasFollowUp && followStatus !== 'CLOSED') {
      openFollowUp++;
    }
  }

  return {
    totalUnits: uniqueUnits.size,
    totalInspections: inspections.length,
    normalA,
    cautionB,
    criticalC,
    severeX,
    openFollowUp,
  };
}

/**
 * Groups inspections by period for the Trend Analysis chart
 */
export function calculateTrendData(inspections: Inspection[]): TrendDataPoint[] {
  if (!inspections || inspections.length === 0) return [];

  // Group by Month or Date
  const monthMap = new Map<string, { count: number; normal: number; caution: number; critical: number; severe: number; sortKey: number }>();

  for (const item of inspections) {
    const d = parseDate(item.date);
    let label = 'Unknown';
    let sortKey = 0;

    if (d) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      sortKey = d.getFullYear() * 100 + (d.getMonth() + 1);
    }

    const current = monthMap.get(label) || { count: 0, normal: 0, caution: 0, critical: 0, severe: 0, sortKey };
    current.count++;
    
    const r = normalizeRating(item.rating);
    if (r === 'A') current.normal++;
    else if (r === 'B') current.caution++;
    else if (r === 'C') current.critical++;
    else if (r === 'X') current.severe++;

    monthMap.set(label, current);
  }

  const sorted = Array.from(monthMap.entries()).sort((a, b) => a[1].sortKey - b[1].sortKey);

  return sorted.map(([period, data]) => ({
    period,
    count: data.count,
    normal: data.normal,
    caution: data.caution,
    critical: data.critical,
    severe: data.severe,
  }));
}

/**
 * Severity distribution for donut chart
 */
export function calculateSeverityDistribution(inspections: Inspection[]): SeverityDistributionItem[] {
  if (!inspections || inspections.length === 0) return [];

  let countA = 0;
  let countB = 0;
  let countC = 0;
  let countX = 0;

  for (const item of inspections) {
    const r = normalizeRating(item.rating);
    if (r === 'A') countA++;
    else if (r === 'B') countB++;
    else if (r === 'C') countC++;
    else if (r === 'X') countX++;
  }

  const total = inspections.length;
  if (total === 0) return [];

  return [
    {
      rating: 'A',
      name: 'A - Normal',
      label: 'Normal',
      count: countA,
      percentage: Math.round((countA / total) * 100),
      color: '#10B981', // soft emerald
    },
    {
      rating: 'B',
      name: 'B - Caution',
      label: 'Caution',
      count: countB,
      percentage: Math.round((countB / total) * 100),
      color: '#F59E0B', // soft amber
    },
    {
      rating: 'C',
      name: 'C - Critical',
      label: 'Critical',
      count: countC,
      percentage: Math.round((countC / total) * 100),
      color: '#EF4444', // Red / Merah
    },
    {
      rating: 'X',
      name: 'X - Severe',
      label: 'Severe',
      count: countX,
      percentage: Math.round((countX / total) * 100),
      color: '#09090B', // Black / Hitam
    },
  ];
}
