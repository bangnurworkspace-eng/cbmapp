import { Inspection, GoogleSheetRow, ApiResponse, Rating, ProgramType, FollowUpStatus } from '../types/inspection';
import { MasterUnit } from '../types/masterUnit';
import { MasterComponent } from '../types/masterComponent';
import { FollowUpItem } from '../types/followUp';
import { StandaloneInspectionItem } from '../types/standaloneInspection';
import { normalizeRating } from '../utils/calculations';

const SCRIPT_URL_STORAGE_KEY = 'cbm_google_apps_script_url';
const LOCAL_CACHE_KEY = 'cbm_inspections_cache';
const MOCK_STORAGE_KEY = 'cbm_inspections_mock_data';

// Helper to get active script URL from local storage or environment
export function getGoogleAppsScriptUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SCRIPT_URL_STORAGE_KEY) || '';
}

export function setGoogleAppsScriptUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCRIPT_URL_STORAGE_KEY, url.trim());
}

/**
 * Initial Inspection dataset. Empty by default - only stores authentic records created by users or synced from Google Sheets.
 */
export const INITIAL_MINING_INSPECTIONS: Inspection[] = [];

/**
 * Maps raw Google Sheet row or object to strongly typed Inspection
 */
export function mapGoogleSheetRowToInspection(row: GoogleSheetRow | Record<string, any>): Inspection {
  // Case-insensitive key lookup
  const getVal = (keys: string[]): string => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return String(row[k]).trim();
      const lower = k.toLowerCase();
      for (const prop in row) {
        if (prop.toLowerCase() === lower && row[prop] !== undefined && row[prop] !== null) {
          return String(row[prop]).trim();
        }
      }
    }
    return '';
  };

  const id = getVal(['ID', 'Id', 'id']) || `INS-${Math.floor(100 + Math.random() * 900)}`;
  const date = getVal(['DATE', 'Date', 'date']) || new Date().toLocaleDateString('en-GB');
  const unitId = getVal(['UNIT_ID', 'UNIT ID', 'UnitId', 'Unit_Id', 'unit_id', 'unitId']) || 'EX-UNKNOWN';
  const hoursMeter = getVal(['HOURS_METER', 'HOUR_METER', 'HoursMeter', 'HourMeter', 'hours_meter', 'hour_meter', 'HM', 'hm', 'SMR', 'smr']) || undefined;
  
  const rawProg = getVal(['PROGRAM', 'Program', 'program']).toUpperCase();
  const validPrograms: ProgramType[] = ['PPM', 'PPE', 'FC', 'MP', 'CR', 'PAP', 'PPA', 'PPU'];
  const program: ProgramType = (validPrograms.includes(rawProg as ProgramType) ? rawProg : 'PPM') as ProgramType;

  const model = getVal(['MODEL', 'Model', 'model']) || 'Mining Equipment';
  const component = getVal(['COMPONENT', 'Component', 'component']) || 'General Component';
  const system = getVal(['SYSTEM', 'System', 'system']) || 'General System';
  const findings = getVal(['FINDINGS', 'Findings', 'Finding', 'findings']) || 'No findings recorded';
  const recommendation = getVal(['RECOMMENDATION', 'Recommendation', 'recommendation']) || 'Monitor regular operation';
  
  const rawRating = getVal(['RATING', 'Rating', 'rating']);
  const rating: Rating = normalizeRating(rawRating);

  const status = getVal(['STATUS', 'Status', 'status']) || 'OPEN';
  const inspector = getVal(['INSPECTOR', 'Inspector', 'inspector']) || 'Plant Inspector';
  const followUp = getVal(['FOLLOW_UP', 'FollowUp', 'Follow Up', 'follow_up']) || '';
  
  const rawFollowStatus = getVal(['FOLLOW_UP_STATUS', 'FollowUpStatus', 'Follow Up Status', 'follow_up_status']).toUpperCase();
  let followUpStatus: FollowUpStatus = 'OPEN';
  if (rawFollowStatus.includes('CLOSE') || rawFollowStatus.includes('SELESAI') || rawFollowStatus.includes('DONE')) {
    followUpStatus = 'CLOSED';
  } else {
    followUpStatus = 'OPEN';
  }

  const dueDate = getVal(['DUE_DATE', 'DueDate', 'Due Date', 'due_date']) || date;

  return {
    id,
    date,
    unitId,
    hoursMeter,
    program,
    model,
    component,
    system,
    findings,
    recommendation,
    rating,
    status,
    inspector,
    followUp,
    followUpStatus,
    dueDate,
    imageUrl: getVal(['IMAGE_URL', 'IMAGE', 'imageUrl', 'image', 'photo', 'PHOTO']) || undefined,
    createdAt: getVal(['CREATED_AT', 'CreatedAt']) || new Date().toISOString(),
  };
}

/**
 * ----------------------------------------------------------------------
 * 1. INSPECTIONS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchInspections(): Promise<ApiResponse<Inspection[]>> {
  const scriptUrl = getGoogleAppsScriptUrl();

  if (!scriptUrl) {
    const localData = getLocalMockInspections();
    return {
      success: true,
      data: localData,
      message: 'Loaded from local database',
    };
  }

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getInspections');
    url.searchParams.set('t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Web App HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json && (json.success === true || Array.isArray(json.data) || Array.isArray(json))) {
      const rawRows: any[] = Array.isArray(json) ? json : (json.data || []);
      const mapped = rawRows.map(mapGoogleSheetRowToInspection);
      
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(mapped));
      } catch (e) {}

      return {
        success: true,
        data: mapped,
        message: `Loaded ${mapped.length} inspection records from Google Sheets`,
      };
    } else {
      throw new Error(json.message || 'API returned unsuccessful response');
    }
  } catch (err: any) {
    console.warn('Database fetch failed, checking cache or local fallback:', err);
    
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            success: false,
            data: parsed,
            message: `Unable to reach Google Sheets (${err.message}). Showing cached records.`,
            error: err.message,
          };
        }
      } catch (e) {}
    }

    const localData = getLocalMockInspections();
    return {
      success: false,
      data: localData,
      message: `Sync warning: ${err.message}. Using offline backup records.`,
      error: err.message,
    };
  }
}

export async function createInspection(inspection: Omit<Inspection, 'id' | 'createdAt'>): Promise<ApiResponse<Inspection>> {
  const newId = `INS-${Date.now().toString().slice(-4)}`;
  const fullItem: Inspection = {
    ...inspection,
    id: newId,
    createdAt: new Date().toISOString(),
  };

  const scriptUrl = getGoogleAppsScriptUrl();
  saveToLocalMock(fullItem);

  if (!scriptUrl) {
    return {
      success: true,
      data: fullItem,
      message: 'Inspection saved locally',
    };
  }

  try {
    const payload = {
      action: 'createInspection',
      ID: fullItem.id,
      DATE: fullItem.date,
      UNIT_ID: fullItem.unitId,
      HOURS_METER: fullItem.hoursMeter !== undefined && fullItem.hoursMeter !== '' ? String(fullItem.hoursMeter) : '',
      HM: fullItem.hoursMeter !== undefined && fullItem.hoursMeter !== '' ? String(fullItem.hoursMeter) : '',
      PROGRAM: fullItem.program,
      MODEL: fullItem.model,
      COMPONENT: fullItem.component,
      SYSTEM: fullItem.system,
      FINDINGS: fullItem.findings,
      RECOMMENDATION: fullItem.recommendation,
      RATING: fullItem.rating,
      STATUS: fullItem.status,
      INSPECTOR: fullItem.inspector,
      FOLLOW_UP: fullItem.followUp,
      FOLLOW_UP_STATUS: fullItem.followUpStatus,
      DUE_DATE: fullItem.dueDate,
      IMAGE_URL: fullItem.imageUrl || '',
      CREATED_AT: fullItem.createdAt,
    };

    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      data: fullItem,
      message: 'Successfully written to Google Sheets',
    };
  } catch (err: any) {
    return {
      success: true,
      data: fullItem,
      message: 'Saved locally. Remote Google Sheets sync pending.',
    };
  }
}

export async function updateInspection(inspection: Inspection): Promise<ApiResponse<Inspection>> {
  const scriptUrl = getGoogleAppsScriptUrl();
  updateInLocalMock(inspection);

  if (!scriptUrl) {
    return {
      success: true,
      data: inspection,
      message: 'Inspection updated locally',
    };
  }

  try {
    const payload = {
      action: 'updateInspection',
      ID: inspection.id,
      DATE: inspection.date,
      UNIT_ID: inspection.unitId,
      HOURS_METER: inspection.hoursMeter !== undefined && inspection.hoursMeter !== '' ? String(inspection.hoursMeter) : '',
      HM: inspection.hoursMeter !== undefined && inspection.hoursMeter !== '' ? String(inspection.hoursMeter) : '',
      PROGRAM: inspection.program,
      MODEL: inspection.model,
      COMPONENT: inspection.component,
      SYSTEM: inspection.system,
      FINDINGS: inspection.findings,
      RECOMMENDATION: inspection.recommendation,
      RATING: inspection.rating,
      STATUS: inspection.status,
      INSPECTOR: inspection.inspector,
      FOLLOW_UP: inspection.followUp,
      FOLLOW_UP_STATUS: inspection.followUpStatus,
      DUE_DATE: inspection.dueDate,
      UPDATED_AT: new Date().toISOString(),
    };

    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      data: inspection,
      message: 'Successfully updated in Google Sheets',
    };
  } catch (err: any) {
    return {
      success: true,
      data: inspection,
      message: 'Updated locally. Remote sync pending.',
    };
  }
}

export async function deleteInspection(id: string): Promise<ApiResponse<boolean>> {
  const scriptUrl = getGoogleAppsScriptUrl();
  deleteFromLocalMock(id);

  if (!scriptUrl) {
    return {
      success: true,
      data: true,
      message: 'Inspection deleted locally',
    };
  }

  try {
    const payload = {
      action: 'deleteInspection',
      ID: id,
    };

    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      data: true,
      message: 'Successfully deleted from Google Sheets',
    };
  } catch (err: any) {
    return {
      success: true,
      data: true,
      message: 'Deleted locally. Remote sync pending.',
    };
  }
}

/**
 * ----------------------------------------------------------------------
 * 2. MASTER UNITS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchMasterUnitsFromSheets(): Promise<MasterUnit[] | null> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return null;

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getUnits');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = await res.json();
    const rows: any[] = json.data || (Array.isArray(json) ? json : []);
    
    return rows.map((r) => ({
      id: r.ID || r.id || `UNIT_${r.UNIT_CODE || r.unitCode}`,
      unitCode: r.UNIT_CODE || r.unitCode || '',
      unitModel: r.UNIT_MODEL || r.unitModel || '',
      manufacturer: r.MANUFACTURER || r.manufacturer || '',
      section: r.SECTION || r.section || '',
      status: r.STATUS || r.status || 'ACTIVE',
      createdAt: r.CREATED_AT || r.createdAt || new Date().toISOString(),
      updatedAt: r.UPDATED_AT || r.updatedAt || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Failed to fetch Master Units from Google Sheets:', e);
    return null;
  }
}

export async function syncUnitToSheets(action: 'createUnit' | 'updateUnit' | 'deleteUnit' | 'importUnits', payloadData: any): Promise<boolean> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return false;

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payloadData }),
    });
    return true;
  } catch (e) {
    console.warn(`Sync unit action ${action} failed:`, e);
    return false;
  }
}

/**
 * ----------------------------------------------------------------------
 * 3. MASTER COMPONENTS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchMasterComponentsFromSheets(): Promise<MasterComponent[] | null> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return null;

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getComponents');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = await res.json();
    const rows: any[] = json.data || (Array.isArray(json) ? json : []);

    return rows.map((r) => ({
      id: r.ID || r.id || `CMP-${Math.random()}`,
      componentName: r.COMPONENT_NAME || r.componentName || '',
      status: r.STATUS || r.status || 'ACTIVE',
      createdAt: r.CREATED_AT || r.createdAt || new Date().toISOString(),
      updatedAt: r.UPDATED_AT || r.updatedAt || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Failed to fetch Master Components from Google Sheets:', e);
    return null;
  }
}

export async function syncComponentToSheets(action: 'createComponent' | 'updateComponent' | 'deleteComponent' | 'importComponents', payloadData: any): Promise<boolean> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return false;

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payloadData }),
    });
    return true;
  } catch (e) {
    console.warn(`Sync component action ${action} failed:`, e);
    return false;
  }
}

/**
 * ----------------------------------------------------------------------
 * 4. FOLLOW UP GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchFollowUpsFromSheets(): Promise<FollowUpItem[] | null> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return null;

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getFollowUps');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = await res.json();
    const rows: any[] = json.data || (Array.isArray(json) ? json : []);

    return rows.map((r) => ({
      id: r.ID || r.id || `FLU-${Math.random()}`,
      unitId: r.UNIT_ID || r.unitId || '',
      unitModel: r.UNIT_MODEL || r.unitModel || '',
      date: r.DATE || r.date || '',
      component: r.COMPONENT || r.component || '',
      followUpAction: r.FOLLOW_UP_ACTION || r.followUpAction || '',
      inspector: r.INSPECTOR || r.inspector || '',
      status: r.STATUS || r.status || 'OPEN',
      priority: r.PRIORITY || r.priority || 'MEDIUM',
      dueDate: r.DUE_DATE || r.dueDate || '',
      notes: r.NOTES || r.notes || '',
      createdAt: r.CREATED_AT || r.createdAt || new Date().toISOString(),
      updatedAt: r.UPDATED_AT || r.updatedAt || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Failed to fetch Follow Ups from Google Sheets:', e);
    return null;
  }
}

export async function syncFollowUpToSheets(action: 'createFollowUp' | 'updateFollowUp' | 'deleteFollowUp' | 'importFollowUps', payloadData: any): Promise<boolean> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return false;

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payloadData }),
    });
    return true;
  } catch (e) {
    console.warn(`Sync follow up action ${action} failed:`, e);
    return false;
  }
}

/**
 * ----------------------------------------------------------------------
 * 5. STANDALONE INSPECTION GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchStandaloneInspectionsFromSheets(): Promise<StandaloneInspectionItem[] | null> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return null;

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getStandaloneInspections');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = await res.json();
    const rows: any[] = json.data || (Array.isArray(json) ? json : []);

    return rows.map((r) => ({
      id: r.ID || r.id || `INSP-${Math.random()}`,
      unitId: r.UNIT_ID || r.unitId || '',
      unitModel: r.UNIT_MODEL || r.unitModel || '',
      date: r.DATE || r.date || '',
      findings: r.FINDINGS || r.findings || '',
      findingsImage: r.FINDINGS_IMAGE || r.findingsImage || '',
      inspector: r.INSPECTOR || r.inspector || '',
      status: r.STATUS || r.status || 'OPEN',
      priority: r.PRIORITY || r.priority || 'P2',
      notes: r.NOTES || r.notes || '',
      actionBy: r.ACTION_BY || r.actionBy || '',
      actionDate: r.ACTION_DATE || r.actionDate || '',
      actionDetails: r.ACTION_DETAILS || r.actionDetails || '',
      actionImage: r.ACTION_IMAGE || r.actionImage || '',
      createdAt: r.CREATED_AT || r.createdAt || new Date().toISOString(),
      updatedAt: r.UPDATED_AT || r.updatedAt || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Failed to fetch Standalone Inspections from Google Sheets:', e);
    return null;
  }
}

export async function syncStandaloneInspectionToSheets(
  action: 'createStandaloneInspection' | 'updateStandaloneInspection' | 'deleteStandaloneInspection',
  payloadData: any
): Promise<boolean> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) return false;

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payloadData }),
    });
    return true;
  } catch (e) {
    console.warn(`Sync standalone inspection action ${action} failed:`, e);
    return false;
  }
}

/**
 * Local storage mock persistence helpers
 */
function getLocalMockInspections(): Inspection[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const dummyIds = new Set([
        'INS-001', 'INS-002', 'INS-003', 'INS-004', 'INS-005', 'INS-006',
        'INS-007', 'INS-008', 'INS-009', 'INS-010', 'INS-011', 'INS-012'
      ]);
      const cleaned = parsed.filter((item: any) => !dummyIds.has(item.id));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return [];
  } catch (e) {
    return [];
  }
}

function saveToLocalMock(item: Inspection): void {
  if (typeof window === 'undefined') return;
  const current = getLocalMockInspections();
  const updated = [item, ...current.filter(i => i.id !== item.id)];
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
}

function updateInLocalMock(item: Inspection): void {
  if (typeof window === 'undefined') return;
  const current = getLocalMockInspections();
  const index = current.findIndex(i => i.id === item.id);
  if (index >= 0) {
    current[index] = item;
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(current));
  }
}

function deleteFromLocalMock(id: string): void {
  if (typeof window === 'undefined') return;
  const current = getLocalMockInspections();
  const filtered = current.filter(i => i.id !== id);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(filtered));
}

export function resetToDemoData(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_MINING_INSPECTIONS));
  localStorage.removeItem(LOCAL_CACHE_KEY);
}

/**
 * Generates ready-to-paste Google Apps Script code for Google Sheets
 * Supports ALL 4 modules: Inspections, Master_Components, Master_Units, Follow_Ups
 */
export function getSampleAppsScriptCode(): string {
  return `/**
 * Google Apps Script Web App for CBM WEB APP - Tabang Mining Project
 * Multi-Sheet API backend for:
 * - Tab 1: "Inspections"
 * - Tab 2: "Master_Components"
 * - Tab 3: "Master_Units"
 * - Tab 4: "Follow_Ups"
 *
 * Target Spreadsheet ID: 1Xdhei2rVDYYsWhLh8YahZj1G8qgvjM4_Zbw-H51wTvw
 * Paste this into Google Sheets (Extensions -> Apps Script)
 * Deploy as Web App (Execute as: Me, Who has access: Anyone)
 */

var TARGET_SPREADSHEET_ID = "1Xdhei2rVDYYsWhLh8YahZj1G8qgvjM4_Zbw-H51wTvw";

function getSpreadsheet() {
  if (TARGET_SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
    } catch(e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getInspections';
  var ss = getSpreadsheet();

  // 1. Master Components API
  if (action === 'getComponents') {
    var compSheet = ss.getSheetByName("Master_Components") || initializeMasterComponentsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(compSheet) });
  }

  // 2. Master Units API
  if (action === 'getUnits') {
    var unitSheet = ss.getSheetByName("Master_Units") || initializeMasterUnitsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(unitSheet) });
  }

  // 3. Follow Ups API
  if (action === 'getFollowUps') {
    var fluSheet = ss.getSheetByName("Follow_Ups") || initializeFollowUpsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(fluSheet) });
  }

  // 4. Standalone Inspections API
  if (action === 'getStandaloneInspections') {
    var stSheet = ss.getSheetByName("Standalone_Inspections") || initializeStandaloneInspectionsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(stSheet) });
  }

  // 5. Inspections API (Default)
  var sheet = ss.getSheetByName("Inspections") || initializeCbmSheet();
  return createJsonResponse({ success: true, data: getSheetDataAsJson(sheet) });
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : "";
    var payload = JSON.parse(contents);
    var action = payload.action || 'createInspection';
    var ss = getSpreadsheet();
    var todayStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var todayIso = new Date().toISOString();

    // A. MASTER COMPONENTS ACTIONS
    if (action === 'createComponent' || action === 'updateComponent' || action === 'deleteComponent' || action === 'importComponents') {
      var compSheet = ss.getSheetByName("Master_Components") || initializeMasterComponentsSheet();

      if (action === 'createComponent') {
        compSheet.appendRow([
          payload.ID || ("CMP-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss")),
          payload.COMPONENT_NAME || "",
          payload.STATUS || "ACTIVE",
          payload.CREATED_AT || todayStr,
          payload.UPDATED_AT || todayStr
        ]);
        return createJsonResponse({ success: true, message: "Component created successfully" });
      }

      if (action === 'updateComponent') {
        var values = compSheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][0]).trim() === String(payload.ID).trim()) {
            if (payload.COMPONENT_NAME !== undefined) compSheet.getRange(i + 1, 2).setValue(payload.COMPONENT_NAME);
            if (payload.STATUS !== undefined) compSheet.getRange(i + 1, 3).setValue(payload.STATUS);
            compSheet.getRange(i + 1, 5).setValue(payload.UPDATED_AT || todayStr);
            return createJsonResponse({ success: true, message: "Component updated successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Component ID not found" });
      }

      if (action === 'deleteComponent') {
        var values = compSheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][0]).trim() === String(payload.ID).trim()) {
            compSheet.deleteRow(i + 1);
            return createJsonResponse({ success: true, message: "Component deleted successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Component ID not found" });
      }

      if (action === 'importComponents') {
        var list = payload.components || [];
        compSheet.clear();
        initializeMasterComponentsSheet();
        compSheet = ss.getSheetByName("Master_Components");
        for (var k = 0; k < list.length; k++) {
          var item = list[k];
          compSheet.appendRow([
            item.id || ("CMP-" + String(k + 1)),
            item.componentName || "",
            item.status || "ACTIVE",
            item.createdAt || todayStr,
            item.updatedAt || todayStr
          ]);
        }
        return createJsonResponse({ success: true, message: "Imported " + list.length + " components" });
      }
    }

    // B. MASTER UNITS ACTIONS
    if (action === 'createUnit' || action === 'updateUnit' || action === 'deleteUnit' || action === 'importUnits') {
      var unitSheet = ss.getSheetByName("Master_Units") || initializeMasterUnitsSheet();

      if (action === 'createUnit') {
        unitSheet.appendRow([
          payload.ID || ("UNIT_" + String(payload.UNIT_CODE || '').toUpperCase()),
          payload.UNIT_CODE || "",
          payload.UNIT_MODEL || "",
          payload.MANUFACTURER || "",
          payload.SECTION || "",
          payload.STATUS || "ACTIVE",
          payload.CREATED_AT || todayStr,
          payload.UPDATED_AT || todayStr
        ]);
        return createJsonResponse({ success: true, message: "Unit created successfully" });
      }

      if (action === 'updateUnit') {
        var uValues = unitSheet.getDataRange().getValues();
        for (var u = 1; u < uValues.length; u++) {
          if (String(uValues[u][0]).trim() === String(payload.ID).trim() || String(uValues[u][1]).trim() === String(payload.UNIT_CODE).trim()) {
            if (payload.UNIT_CODE !== undefined) unitSheet.getRange(u + 1, 2).setValue(payload.UNIT_CODE);
            if (payload.UNIT_MODEL !== undefined) unitSheet.getRange(u + 1, 3).setValue(payload.UNIT_MODEL);
            if (payload.MANUFACTURER !== undefined) unitSheet.getRange(u + 1, 4).setValue(payload.MANUFACTURER);
            if (payload.SECTION !== undefined) unitSheet.getRange(u + 1, 5).setValue(payload.SECTION);
            if (payload.STATUS !== undefined) unitSheet.getRange(u + 1, 6).setValue(payload.STATUS);
            unitSheet.getRange(u + 1, 8).setValue(payload.UPDATED_AT || todayStr);
            return createJsonResponse({ success: true, message: "Unit updated successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Unit not found" });
      }

      if (action === 'deleteUnit') {
        var uValues = unitSheet.getDataRange().getValues();
        for (var u = 1; u < uValues.length; u++) {
          if (String(uValues[u][0]).trim() === String(payload.ID).trim()) {
            unitSheet.deleteRow(u + 1);
            return createJsonResponse({ success: true, message: "Unit deleted successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Unit not found" });
      }

      if (action === 'importUnits') {
        var uList = payload.units || [];
        unitSheet.clear();
        initializeMasterUnitsSheet();
        unitSheet = ss.getSheetByName("Master_Units");
        for (var m = 0; m < uList.length; m++) {
          var un = uList[m];
          unitSheet.appendRow([
            un.id || ("UNIT_" + String(un.unitCode || '').toUpperCase()),
            un.unitCode || "",
            un.unitModel || "",
            un.manufacturer || "",
            un.section || "",
            un.status || "ACTIVE",
            un.createdAt || todayStr,
            un.updatedAt || todayStr
          ]);
        }
        return createJsonResponse({ success: true, message: "Imported " + uList.length + " units" });
      }
    }

    // C. FOLLOW UP ACTIONS
    if (action === 'createFollowUp' || action === 'updateFollowUp' || action === 'deleteFollowUp' || action === 'importFollowUps') {
      var fluSheet = ss.getSheetByName("Follow_Ups") || initializeFollowUpsSheet();

      if (action === 'createFollowUp') {
        fluSheet.appendRow([
          payload.ID || ("FLU-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss")),
          payload.UNIT_ID || "",
          payload.UNIT_MODEL || "",
          payload.DATE || todayStr,
          payload.COMPONENT || "",
          payload.FOLLOW_UP_ACTION || "",
          payload.INSPECTOR || "",
          payload.STATUS || "OPEN",
          payload.PRIORITY || "MEDIUM",
          payload.DUE_DATE || "",
          payload.NOTES || "",
          payload.CREATED_AT || todayIso,
          payload.UPDATED_AT || todayIso
        ]);
        return createJsonResponse({ success: true, message: "Follow up created successfully" });
      }

      if (action === 'updateFollowUp') {
        var fValues = fluSheet.getDataRange().getValues();
        for (var f = 1; f < fValues.length; f++) {
          if (String(fValues[f][0]).trim() === String(payload.ID).trim()) {
            if (payload.UNIT_ID !== undefined) fluSheet.getRange(f + 1, 2).setValue(payload.UNIT_ID);
            if (payload.UNIT_MODEL !== undefined) fluSheet.getRange(f + 1, 3).setValue(payload.UNIT_MODEL);
            if (payload.DATE !== undefined) fluSheet.getRange(f + 1, 4).setValue(payload.DATE);
            if (payload.COMPONENT !== undefined) fluSheet.getRange(f + 1, 5).setValue(payload.COMPONENT);
            if (payload.FOLLOW_UP_ACTION !== undefined) fluSheet.getRange(f + 1, 6).setValue(payload.FOLLOW_UP_ACTION);
            if (payload.INSPECTOR !== undefined) fluSheet.getRange(f + 1, 7).setValue(payload.INSPECTOR);
            if (payload.STATUS !== undefined) fluSheet.getRange(f + 1, 8).setValue(payload.STATUS);
            if (payload.PRIORITY !== undefined) fluSheet.getRange(f + 1, 9).setValue(payload.PRIORITY);
            if (payload.DUE_DATE !== undefined) fluSheet.getRange(f + 1, 10).setValue(payload.DUE_DATE);
            if (payload.NOTES !== undefined) fluSheet.getRange(f + 1, 11).setValue(payload.NOTES);
            fluSheet.getRange(f + 1, 13).setValue(payload.UPDATED_AT || todayIso);
            return createJsonResponse({ success: true, message: "Follow up updated successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Follow Up ID not found" });
      }

      if (action === 'deleteFollowUp') {
        var fValues = fluSheet.getDataRange().getValues();
        for (var f = 1; f < fValues.length; f++) {
          if (String(fValues[f][0]).trim() === String(payload.ID).trim()) {
            fluSheet.deleteRow(f + 1);
            return createJsonResponse({ success: true, message: "Follow Up deleted successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Follow Up ID not found" });
      }
    }

    // E. STANDALONE INSPECTIONS ACTIONS
    if (action === 'createStandaloneInspection' || action === 'updateStandaloneInspection' || action === 'deleteStandaloneInspection') {
      var stSheet = ss.getSheetByName("Standalone_Inspections") || initializeStandaloneInspectionsSheet();

      if (action === 'createStandaloneInspection') {
        stSheet.appendRow([
          payload.ID || ("INSP-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss")),
          payload.UNIT_ID || "",
          payload.UNIT_MODEL || "",
          payload.DATE || todayStr,
          payload.FINDINGS || "",
          payload.FINDINGS_IMAGE || "",
          payload.INSPECTOR || "",
          payload.STATUS || "OPEN",
          payload.PRIORITY || "P2",
          payload.NOTES || "",
          payload.ACTION_BY || "",
          payload.ACTION_DATE || "",
          payload.ACTION_DETAILS || "",
          payload.ACTION_IMAGE || "",
          payload.CREATED_AT || todayIso,
          payload.UPDATED_AT || todayIso
        ]);
        return createJsonResponse({ success: true, message: "Standalone inspection created successfully" });
      }

      if (action === 'updateStandaloneInspection') {
        var sValues = stSheet.getDataRange().getValues();
        for (var s = 1; s < sValues.length; s++) {
          if (String(sValues[s][0]).trim() === String(payload.ID).trim()) {
            if (payload.UNIT_ID !== undefined) stSheet.getRange(s + 1, 2).setValue(payload.UNIT_ID);
            if (payload.UNIT_MODEL !== undefined) stSheet.getRange(s + 1, 3).setValue(payload.UNIT_MODEL);
            if (payload.DATE !== undefined) stSheet.getRange(s + 1, 4).setValue(payload.DATE);
            if (payload.FINDINGS !== undefined) stSheet.getRange(s + 1, 5).setValue(payload.FINDINGS);
            if (payload.FINDINGS_IMAGE !== undefined) stSheet.getRange(s + 1, 6).setValue(payload.FINDINGS_IMAGE);
            if (payload.INSPECTOR !== undefined) stSheet.getRange(s + 1, 7).setValue(payload.INSPECTOR);
            if (payload.STATUS !== undefined) stSheet.getRange(s + 1, 8).setValue(payload.STATUS);
            if (payload.PRIORITY !== undefined) stSheet.getRange(s + 1, 9).setValue(payload.PRIORITY);
            if (payload.NOTES !== undefined) stSheet.getRange(s + 1, 10).setValue(payload.NOTES);
            if (payload.ACTION_BY !== undefined) stSheet.getRange(s + 1, 11).setValue(payload.ACTION_BY);
            if (payload.ACTION_DATE !== undefined) stSheet.getRange(s + 1, 12).setValue(payload.ACTION_DATE);
            if (payload.ACTION_DETAILS !== undefined) stSheet.getRange(s + 1, 13).setValue(payload.ACTION_DETAILS);
            if (payload.ACTION_IMAGE !== undefined) stSheet.getRange(s + 1, 14).setValue(payload.ACTION_IMAGE);
            stSheet.getRange(s + 1, 16).setValue(payload.UPDATED_AT || todayIso);
            return createJsonResponse({ success: true, message: "Standalone inspection updated successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Standalone inspection ID not found" });
      }

      if (action === 'deleteStandaloneInspection') {
        var sValues = stSheet.getDataRange().getValues();
        for (var s = 1; s < sValues.length; s++) {
          if (String(sValues[s][0]).trim() === String(payload.ID).trim()) {
            stSheet.deleteRow(s + 1);
            return createJsonResponse({ success: true, message: "Standalone inspection deleted successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Standalone inspection ID not found" });
      }
    }

    // D. INSPECTIONS ACTIONS (Default)
    var sheet = ss.getSheetByName("Inspections") || initializeCbmSheet();

    if (action === 'createInspection') {
      var newRow = [
        payload.ID || ("INS-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss")),
        payload.DATE || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"),
        payload.UNIT_ID || "",
        payload.HOURS_METER || payload.HM || "",
        payload.PROGRAM || "",
        payload.MODEL || "",
        payload.COMPONENT || "",
        payload.SYSTEM || "",
        payload.FINDINGS || "",
        payload.RECOMMENDATION || "",
        payload.RATING || "A",
        payload.STATUS || "OPEN",
        payload.INSPECTOR || "",
        payload.FOLLOW_UP || "",
        payload.FOLLOW_UP_STATUS || "OPEN",
        payload.DUE_DATE || "",
        payload.COMPLETED_DATE || "",
        payload.CREATED_AT || todayIso,
        payload.UPDATED_AT || todayIso
      ];
      sheet.appendRow(newRow);
      return createJsonResponse({ success: true, message: "Inspection created successfully" });
    }

    if (action === 'updateInspection') {
      var values = sheet.getDataRange().getValues();
      for (var j = 1; j < values.length; j++) {
        if (String(values[j][0]).trim() === String(payload.ID).trim()) {
          if (payload.DATE !== undefined) sheet.getRange(j + 1, 2).setValue(payload.DATE);
          if (payload.UNIT_ID !== undefined) sheet.getRange(j + 1, 3).setValue(payload.UNIT_ID);
          if (payload.HOURS_METER !== undefined) sheet.getRange(j + 1, 4).setValue(payload.HOURS_METER);
          if (payload.PROGRAM !== undefined) sheet.getRange(j + 1, 5).setValue(payload.PROGRAM);
          if (payload.MODEL !== undefined) sheet.getRange(j + 1, 6).setValue(payload.MODEL);
          if (payload.COMPONENT !== undefined) sheet.getRange(j + 1, 7).setValue(payload.COMPONENT);
          if (payload.SYSTEM !== undefined) sheet.getRange(j + 1, 8).setValue(payload.SYSTEM);
          if (payload.FINDINGS !== undefined) sheet.getRange(j + 1, 9).setValue(payload.FINDINGS);
          if (payload.RECOMMENDATION !== undefined) sheet.getRange(j + 1, 10).setValue(payload.RECOMMENDATION);
          if (payload.RATING !== undefined) sheet.getRange(j + 1, 11).setValue(payload.RATING);
          if (payload.STATUS !== undefined) sheet.getRange(j + 1, 12).setValue(payload.STATUS);
          if (payload.INSPECTOR !== undefined) sheet.getRange(j + 1, 13).setValue(payload.INSPECTOR);
          if (payload.FOLLOW_UP !== undefined) sheet.getRange(j + 1, 14).setValue(payload.FOLLOW_UP);
          if (payload.FOLLOW_UP_STATUS !== undefined) sheet.getRange(j + 1, 15).setValue(payload.FOLLOW_UP_STATUS);
          if (payload.DUE_DATE !== undefined) sheet.getRange(j + 1, 16).setValue(payload.DUE_DATE);
          sheet.getRange(j + 1, 19).setValue(payload.UPDATED_AT || todayIso);
          return createJsonResponse({ success: true, message: "Inspection updated successfully" });
        }
      }
      return createJsonResponse({ success: false, message: "Inspection ID not found" });
    }

    if (action === 'deleteInspection') {
      var values = sheet.getDataRange().getValues();
      for (var d = 1; d < values.length; d++) {
        if (String(values[d][0]).trim() === String(payload.ID).trim()) {
          sheet.deleteRow(d + 1);
          return createJsonResponse({ success: true, message: "Inspection deleted successfully" });
        }
      }
      return createJsonResponse({ success: false, message: "Inspection ID not found" });
    }

    return createJsonResponse({ success: false, message: "Action not supported: " + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function getSheetDataAsJson(sheet) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = String(headers[j]).trim();
      var cellVal = row[j];
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, "GMT+7", "dd/MM/yyyy");
      }
      item[headerKey] = cellVal !== undefined ? cellVal : "";
    }
    result.push(item);
  }
  return result;
}

function initializeCbmSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Inspections");
  if (!sheet) {
    sheet = ss.insertSheet("Inspections");
  }
  var headers = [
    "ID", "DATE", "UNIT_ID", "HOURS_METER", "PROGRAM", "MODEL", "COMPONENT", "SYSTEM",
    "FINDINGS", "RECOMMENDATION", "RATING", "STATUS", "INSPECTOR",
    "FOLLOW_UP", "FOLLOW_UP_STATUS", "DUE_DATE", "COMPLETED_DATE",
    "CREATED_AT", "UPDATED_AT"
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  return sheet;
}

function initializeMasterComponentsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Master_Components");
  if (!sheet) {
    sheet = ss.insertSheet("Master_Components");
  }
  var headers = ["ID", "COMPONENT_NAME", "STATUS", "CREATED_AT", "UPDATED_AT"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  return sheet;
}

function initializeMasterUnitsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Master_Units");
  if (!sheet) {
    sheet = ss.insertSheet("Master_Units");
  }
  var headers = ["ID", "UNIT_CODE", "UNIT_MODEL", "MANUFACTURER", "SECTION", "STATUS", "CREATED_AT", "UPDATED_AT"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  return sheet;
}

function initializeFollowUpsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Follow_Ups");
  if (!sheet) {
    sheet = ss.insertSheet("Follow_Ups");
  }
  var headers = ["ID", "UNIT_ID", "UNIT_MODEL", "DATE", "COMPONENT", "FOLLOW_UP_ACTION", "INSPECTOR", "STATUS", "PRIORITY", "DUE_DATE", "NOTES", "CREATED_AT", "UPDATED_AT"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  return sheet;
}

function initializeStandaloneInspectionsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Standalone_Inspections");
  if (!sheet) {
    sheet = ss.insertSheet("Standalone_Inspections");
  }
  var headers = ["ID", "UNIT_ID", "UNIT_MODEL", "DATE", "FINDINGS", "FINDINGS_IMAGE", "INSPECTOR", "STATUS", "PRIORITY", "NOTES", "ACTION_BY", "ACTION_DATE", "ACTION_DETAILS", "ACTION_IMAGE", "CREATED_AT", "UPDATED_AT"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#E2E8F0");
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
