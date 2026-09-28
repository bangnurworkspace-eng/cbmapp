import * as XLSX from 'xlsx';
import { Inspection } from '../types/inspection';
import { MasterUnit } from '../services/masterUnitService';
import { MasterComponent } from '../services/masterComponentService';
import { FollowUpItem } from '../types/followUp';
import { StandaloneInspectionItem } from '../types/standaloneInspection';

/**
 * Downloads a sheet as an .xlsx file with formatted column widths
 */
function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports Inspection records to an Excel file (.xlsx)
 */
export function exportInspectionsToExcel(
  inspections: Inspection[],
  pageTitle: string = 'Inspections'
) {
  const rows = inspections.map((item, index) => ({
    'No': index + 1,
    'Inspection ID': item.id || '-',
    'Date': item.date || '-',
    'Unit ID / Code': item.unitId || '-',
    'Hours Meter (HM)': item.hoursMeter || '-',
    'Program': item.program || '-',
    'Model': item.model || '-',
    'Component': item.component || '-',
    'System': item.system || '-',
    'Condition Rating': item.rating || '-',
    'Findings': item.findings || '-',
    'Recommendation': item.recommendation || '-',
    'Status': item.status || '-',
    'Inspector': item.inspector || '-',
    'Follow Up': item.followUp || '-',
    'Follow Up Status': item.followUpStatus || '-',
    'Due Date': item.dueDate || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 16 }, // Inspection ID
    { wch: 12 }, // Date
    { wch: 16 }, // Unit ID
    { wch: 14 }, // HM
    { wch: 10 }, // Program
    { wch: 18 }, // Model
    { wch: 22 }, // Component
    { wch: 25 }, // System
    { wch: 16 }, // Rating
    { wch: 35 }, // Findings
    { wch: 35 }, // Recommendation
    { wch: 12 }, // Status
    { wch: 18 }, // Inspector
    { wch: 25 }, // Follow Up
    { wch: 16 }, // Follow Up Status
    { wch: 12 }, // Due Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Inspections');

  const timestamp = new Date().toISOString().slice(0, 10);
  const cleanTitle = pageTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
  downloadWorkbook(workbook, `CBM_${cleanTitle}_${timestamp}.xlsx`);
}

/**
 * Exports Master Units to Excel
 */
export function exportMasterUnitsToExcel(units: MasterUnit[]) {
  const rows = units.map((u, index) => ({
    'No': index + 1,
    'Unit Code': u.unitCode || '-',
    'Unit Model': u.unitModel || '-',
    'Manufacturer': u.manufacturer || '-',
    'Section / Area': u.section || '-',
    'Status': u.status || 'ACTIVE',
    'Created At': u.createdAt || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 16 }, // Unit Code
    { wch: 18 }, // Model
    { wch: 18 }, // Manufacturer
    { wch: 20 }, // Section
    { wch: 12 }, // Status
    { wch: 14 }, // Created At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Units');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(workbook, `CBM_Master_Units_${timestamp}.xlsx`);
}

/**
 * Exports Master Components to Excel
 */
export function exportMasterComponentsToExcel(components: MasterComponent[]) {
  const rows = components.map((c, index) => ({
    'No': index + 1,
    'Component ID': c.id || '-',
    'Component Name': c.componentName || '-',
    'Status': c.status || 'ACTIVE',
    'Created At': c.createdAt || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 16 }, // Component ID
    { wch: 30 }, // Name
    { wch: 12 }, // Status
    { wch: 14 }, // Created At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Components');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(workbook, `CBM_Master_Components_${timestamp}.xlsx`);
}

/**
 * Exports Follow Up Tasks to Excel
 */
export function exportFollowUpsToExcel(items: FollowUpItem[]) {
  const rows = items.map((item, index) => ({
    'No': index + 1,
    'Follow Up ID': item.id || '-',
    'UNIT ID': item.unitId || '-',
    'Unit Model': item.unitModel || '-',
    'DATE': item.date || '-',
    'Component': item.component || '-',
    'Follow Up Action': item.followUpAction || '-',
    'Inspector': item.inspector || '-',
    'Status': item.status || 'OPEN',
    'Priority': item.priority || 'MEDIUM',
    'Due Date': item.dueDate || '-',
    'Notes': item.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // Follow Up ID
    { wch: 16 }, // UNIT ID
    { wch: 14 }, // DATE
    { wch: 22 }, // Component
    { wch: 40 }, // Follow Up Action
    { wch: 20 }, // Inspector
    { wch: 14 }, // Status
    { wch: 12 }, // Priority
    { wch: 14 }, // Due Date
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Follow Up Tasks');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(workbook, `FollowUp_Tasks_${timestamp}.xlsx`);
}

/**
 * Exports Standalone Inspection records to Excel
 */
export function exportStandaloneInspectionsToExcel(items: StandaloneInspectionItem[]) {
  const rows = items.map((item, index) => ({
    'No': index + 1,
    'Inspection ID': item.id || '-',
    'UNIT ID': item.unitId || '-',
    'Unit Model': item.unitModel || '-',
    'DATE': item.date || '-',
    'Findings (Temuan)': item.findings || '-',
    'Inspector': item.inspector || '-',
    'Priority': item.priority || 'P2',
    'Status': item.status || 'OPEN',
    'Notes': item.notes || '-',
    'Action By': item.actionBy || '-',
    'Action Date': item.actionDate || '-',
    'Action Details': item.actionDetails || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // Inspection ID
    { wch: 16 }, // UNIT ID
    { wch: 18 }, // Unit Model
    { wch: 14 }, // DATE
    { wch: 40 }, // Findings
    { wch: 20 }, // Inspector
    { wch: 10 }, // Priority
    { wch: 14 }, // Status
    { wch: 25 }, // Notes
    { wch: 20 }, // Action By
    { wch: 14 }, // Action Date
    { wch: 35 }, // Action Details
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspections');

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadWorkbook(workbook, `Inspection_Records_${timestamp}.xlsx`);
}
