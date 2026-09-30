import { Inspection, GoogleSheetRow, ApiResponse, Rating, ProgramType, FollowUpStatus } from '../types/inspection';
import { MasterUnit } from '../types/masterUnit';
import { MasterComponent } from '../types/masterComponent';
import { FollowUpItem } from '../types/followUp';
import { StandaloneInspectionItem } from '../types/standaloneInspection';
import { BrandingSettings, DEFAULT_BRANDING_SETTINGS } from './brandingService';
import { normalizeRating } from '../utils/calculations';

// Single source of truth configuration for Google Apps Script Web App URL
let currentScriptUrl: string =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL) ||
  'https://script.google.com/macros/s/AKfycby_CBM_WEB_APP_OFFICIAL/exec';

export function getGoogleAppsScriptUrl(): string {
  return currentScriptUrl;
}

export function setGoogleAppsScriptUrl(url: string): void {
  currentScriptUrl = url.trim();
}

/**
 * Helper to check if Google Apps Script URL is explicitly configured
 */
export function isScriptUrlConfigured(): boolean {
  const url = getGoogleAppsScriptUrl();
  return Boolean(
    url &&
    url.trim().length > 30 &&
    url.includes('script.google.com/macros/s/') &&
    !url.includes('_OFFICIAL')
  );
}

/**
 * Initial empty dataset - all business data comes directly from Google Sheets.
 */
export const INITIAL_MINING_INSPECTIONS: Inspection[] = [];

/**
 * Maps raw Google Sheet row or object to strongly typed Inspection
 */
export function mapGoogleSheetRowToInspection(row: GoogleSheetRow | Record<string, any>): Inspection {
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
 * Helper to execute POST API calls to Google Apps Script Web App
 */
async function postToAppsScript<T>(payload: any): Promise<ApiResponse<T>> {
  if (!isScriptUrlConfigured()) {
    return {
      success: false,
      error: 'Google Apps Script URL belum dikonfigurasi.',
      message: 'Database belum terhubung. Buka Settings untuk memasukkan Web App URL.',
    };
  }

  const scriptUrl = getGoogleAppsScriptUrl();
  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        success: false,
        error: `HTTP Error ${res.status}`,
        message: 'Koneksi ke database gagal.',
      };
    }

    const json = await res.json();
    if (json && json.success === true) {
      return {
        success: true,
        data: json.data !== undefined ? json.data : (true as unknown as T),
        message: json.message || 'Operation successful',
      };
    } else {
      return {
        success: false,
        error: json?.message || 'Server operation failed',
        message: json?.message || 'Server operation failed',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unable to connect to database.',
      message: 'Unable to connect to database.',
    };
  }
}

/**
 * ----------------------------------------------------------------------
 * 1. INSPECTIONS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchInspections(): Promise<ApiResponse<Inspection[]>> {
  if (!isScriptUrlConfigured()) {
    return {
      success: false,
      data: [],
      error: 'Google Apps Script URL belum dikonfigurasi.',
      message: 'Database belum terhubung. Silakan masukkan Google Apps Script URL di halaman Settings.',
    };
  }

  const scriptUrl = getGoogleAppsScriptUrl();

  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getInspections');
    url.searchParams.set('t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return {
        success: false,
        data: [],
        error: `HTTP Error ${response.status}`,
        message: 'Gagal menghubungkan ke database Google Sheets.',
      };
    }

    const json = await response.json();

    if (json && (json.success === true || Array.isArray(json.data) || Array.isArray(json))) {
      const rawRows: any[] = Array.isArray(json) ? json : (json.data || []);
      const mapped = rawRows.map(mapGoogleSheetRowToInspection);
      
      return {
        success: true,
        data: mapped,
        message: `Loaded ${mapped.length} inspection records from Google Sheets`,
      };
    } else {
      return {
        success: false,
        data: [],
        error: json?.message || 'Respon server tidak valid.',
        message: json?.message || 'Respon server tidak valid.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: 'Database connection failed',
      message: 'Database Google Sheets belum terhubung. Periksa konfigurasi di halaman Settings.',
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

  const res = await postToAppsScript<boolean>(payload);
  if (res.success) {
    return {
      success: true,
      data: fullItem,
      message: 'Inspection successfully created in Google Sheets',
    };
  } else {
    return {
      success: false,
      error: res.error || 'Failed to save inspection to Google Sheets',
      message: res.message || 'Unable to connect to database.',
    };
  }
}

export async function updateInspection(inspection: Inspection): Promise<ApiResponse<Inspection>> {
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

  const res = await postToAppsScript<boolean>(payload);
  if (res.success) {
    return {
      success: true,
      data: inspection,
      message: 'Inspection successfully updated in Google Sheets',
    };
  } else {
    return {
      success: false,
      error: res.error || 'Failed to update inspection in Google Sheets',
      message: res.message || 'Unable to connect to database.',
    };
  }
}

export async function deleteInspection(id: string): Promise<ApiResponse<boolean>> {
  const payload = {
    action: 'deleteInspection',
    ID: id,
  };

  const res = await postToAppsScript<boolean>(payload);
  if (res.success) {
    return {
      success: true,
      data: true,
      message: 'Inspection deleted from Google Sheets',
    };
  } else {
    return {
      success: false,
      data: false,
      error: res.error || 'Failed to delete inspection from Google Sheets',
      message: res.message || 'Unable to connect to database.',
    };
  }
}

/**
 * ----------------------------------------------------------------------
 * 2. MASTER UNITS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchMasterUnitsFromSheets(): Promise<MasterUnit[]> {
  if (!isScriptUrlConfigured()) return [];

  const scriptUrl = getGoogleAppsScriptUrl();
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getUnits');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

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
    return [];
  }
}

export async function syncUnitToSheets(action: 'createUnit' | 'updateUnit' | 'deleteUnit' | 'importUnits', payloadData: any): Promise<boolean> {
  const res = await postToAppsScript<boolean>({ action, ...payloadData });
  return res.success;
}

/**
 * ----------------------------------------------------------------------
 * 3. MASTER COMPONENTS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchMasterComponentsFromSheets(): Promise<MasterComponent[]> {
  if (!isScriptUrlConfigured()) return [];

  const scriptUrl = getGoogleAppsScriptUrl();
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getComponents');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

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
    return [];
  }
}

export async function syncComponentToSheets(action: 'createComponent' | 'updateComponent' | 'deleteComponent' | 'importComponents', payloadData: any): Promise<boolean> {
  const res = await postToAppsScript<boolean>({ action, ...payloadData });
  return res.success;
}

/**
 * ----------------------------------------------------------------------
 * 4. FOLLOW UP GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchFollowUpsFromSheets(): Promise<FollowUpItem[]> {
  if (!isScriptUrlConfigured()) return [];

  const scriptUrl = getGoogleAppsScriptUrl();
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getFollowUps');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

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
    return [];
  }
}

export async function syncFollowUpToSheets(action: 'createFollowUp' | 'updateFollowUp' | 'deleteFollowUp' | 'importFollowUps', payloadData: any): Promise<boolean> {
  const res = await postToAppsScript<boolean>({ action, ...payloadData });
  return res.success;
}

/**
 * ----------------------------------------------------------------------
 * 5. STANDALONE INSPECTION GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchStandaloneInspectionsFromSheets(): Promise<StandaloneInspectionItem[]> {
  if (!isScriptUrlConfigured()) return [];

  const scriptUrl = getGoogleAppsScriptUrl();
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getStandaloneInspections');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

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
    return [];
  }
}

export async function syncStandaloneInspectionToSheets(
  action: 'createStandaloneInspection' | 'updateStandaloneInspection' | 'deleteStandaloneInspection',
  payloadData: any
): Promise<boolean> {
  const res = await postToAppsScript<boolean>({ action, ...payloadData });
  return res.success;
}

/**
 * ----------------------------------------------------------------------
 * 6. BRANDING & SETTINGS GOOGLE SHEETS API
 * ----------------------------------------------------------------------
 */
export async function fetchSettingsFromSheets(): Promise<BrandingSettings | null> {
  if (!isScriptUrlConfigured()) return null;

  const scriptUrl = getGoogleAppsScriptUrl();
  try {
    const url = new URL(scriptUrl);
    url.searchParams.set('action', 'getSettings');
    url.searchParams.set('t', Date.now().toString());

    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const json = await res.json();
    if (!json || !json.data) return null;

    const data = json.data;
    if (typeof data === 'object') {
      return {
        ...DEFAULT_BRANDING_SETTINGS,
        ...data,
        pageTitles: {
          ...DEFAULT_BRANDING_SETTINGS.pageTitles,
          ...(data.pageTitles || {}),
        },
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function saveSettingsToSheets(settings: BrandingSettings): Promise<boolean> {
  const res = await postToAppsScript<boolean>({ action: 'saveSettings', settings });
  return res.success;
}

export async function verifyAppPassword(password: string): Promise<boolean> {
  const res = await postToAppsScript<{ valid: boolean }>({ action: 'verifyPassword', password });
  return res.success && (res.data as any)?.valid === true;
}

export async function updateAppPasswordOnServer(oldPassword: string, newPassword: string): Promise<boolean> {
  const res = await postToAppsScript<boolean>({ action: 'updatePassword', oldPassword, newPassword });
  return res.success;
}

/**
 * Generates ready-to-paste Google Apps Script code for Google Sheets
 * Supports ALL modules: Inspections, Master_Components, Master_Units, Follow_Ups, Standalone_Inspections, Settings
 */
export function getSampleAppsScriptCode(): string {
  return `/**
 * Google Apps Script Web App for CBM WEB APP - Tabang Mining Project
 * Single Source of Truth Cloud Backend for:
 * - Tab 1: "Inspections"
 * - Tab 2: "Master_Components"
 * - Tab 3: "Master_Units"
 * - Tab 4: "Follow_Ups"
 * - Tab 5: "Standalone_Inspections"
 * - Tab 6: "Settings"
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

  if (action === 'getComponents') {
    var compSheet = ss.getSheetByName("Master_Components") || initializeMasterComponentsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(compSheet) });
  }

  if (action === 'getUnits') {
    var unitSheet = ss.getSheetByName("Master_Units") || initializeMasterUnitsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(unitSheet) });
  }

  if (action === 'getFollowUps') {
    var fluSheet = ss.getSheetByName("Follow_Ups") || initializeFollowUpsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(fluSheet) });
  }

  if (action === 'getStandaloneInspections') {
    var stSheet = ss.getSheetByName("Standalone_Inspections") || initializeStandaloneInspectionsSheet();
    return createJsonResponse({ success: true, data: getSheetDataAsJson(stSheet) });
  }

  if (action === 'getSettings') {
    var setSheet = ss.getSheetByName("Settings") || initializeSettingsSheet();
    var settingsObj = getSettingsAsJson(setSheet);
    return createJsonResponse({ success: true, data: settingsObj });
  }

  // Default: getInspections
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

    // 1. SETTINGS & AUTHENTICATION ACTIONS
    if (action === 'saveSettings') {
      var setSheet = ss.getSheetByName("Settings") || initializeSettingsSheet();
      saveSettingsFromJson(setSheet, payload.settings || {});
      return createJsonResponse({ success: true, message: "Settings saved successfully" });
    }

    if (action === 'verifyPassword') {
      var setSheet = ss.getSheetByName("Settings") || initializeSettingsSheet();
      var storedPass = getSettingValue(setSheet, "APP_PASSWORD") || "cbmwebapp";
      var isValid = String(payload.password || "").trim() === String(storedPass).trim();
      return createJsonResponse({ success: true, data: { valid: isValid } });
    }

    if (action === 'updatePassword') {
      var setSheet = ss.getSheetByName("Settings") || initializeSettingsSheet();
      setSettingValue(setSheet, "APP_PASSWORD", String(payload.newPassword || "cbmwebapp").trim());
      return createJsonResponse({ success: true, message: "Password updated successfully" });
    }

    // 2. MASTER COMPONENTS ACTIONS
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

    // 3. MASTER UNITS ACTIONS
    if (action === 'createUnit' || action === 'updateUnit' || action === 'deleteUnit' || action === 'importUnits') {
      var unitSheet = ss.getSheetByName("Master_Units") || initializeMasterUnitsSheet();

      if (action === 'createUnit') {
        unitSheet.appendRow([
          payload.ID || ("UNIT_" + (payload.UNIT_CODE || Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss"))),
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
        return createJsonResponse({ success: false, message: "Unit ID not found" });
      }

      if (action === 'deleteUnit') {
        var uValues = unitSheet.getDataRange().getValues();
        for (var u = 1; u < uValues.length; u++) {
          if (String(uValues[u][0]).trim() === String(payload.ID).trim() || String(uValues[u][1]).trim() === String(payload.UNIT_CODE).trim()) {
            unitSheet.deleteRow(u + 1);
            return createJsonResponse({ success: true, message: "Unit deleted successfully" });
          }
        }
        return createJsonResponse({ success: false, message: "Unit ID not found" });
      }

      if (action === 'importUnits') {
        var uList = payload.units || [];
        unitSheet.clear();
        initializeMasterUnitsSheet();
        unitSheet = ss.getSheetByName("Master_Units");
        for (var m = 0; m < uList.length; m++) {
          var uItem = uList[m];
          unitSheet.appendRow([
            uItem.id || ("UNIT_" + (uItem.unitCode || String(m + 1))),
            uItem.unitCode || "",
            uItem.unitModel || "",
            uItem.manufacturer || "",
            uItem.section || "",
            uItem.status || "ACTIVE",
            uItem.createdAt || todayStr,
            uItem.updatedAt || todayStr
          ]);
        }
        return createJsonResponse({ success: true, message: "Imported " + uList.length + " units" });
      }
    }

    // 4. FOLLOW UPS ACTIONS
    if (action === 'createFollowUp' || action === 'updateFollowUp' || action === 'deleteFollowUp') {
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
          payload.CREATED_AT || todayStr,
          payload.UPDATED_AT || todayStr
        ]);
        return createJsonResponse({ success: true, message: "Follow Up item created" });
      }

      if (action === 'updateFollowUp') {
        var fValues = fluSheet.getDataRange().getValues();
        for (var f = 1; f < fValues.length; f++) {
          if (String(fValues[f][0]).trim() === String(payload.ID).trim()) {
            if (payload.STATUS !== undefined) fluSheet.getRange(f + 1, 8).setValue(payload.STATUS);
            if (payload.NOTES !== undefined) fluSheet.getRange(f + 1, 11).setValue(payload.NOTES);
            if (payload.FOLLOW_UP_ACTION !== undefined) fluSheet.getRange(f + 1, 6).setValue(payload.FOLLOW_UP_ACTION);
            fluSheet.getRange(f + 1, 13).setValue(payload.UPDATED_AT || todayStr);
            return createJsonResponse({ success: true, message: "Follow Up updated" });
          }
        }
        return createJsonResponse({ success: false, message: "Follow Up ID not found" });
      }

      if (action === 'deleteFollowUp') {
        var fValues = fluSheet.getDataRange().getValues();
        for (var f = 1; f < fValues.length; f++) {
          if (String(fValues[f][0]).trim() === String(payload.ID).trim()) {
            fluSheet.deleteRow(f + 1);
            return createJsonResponse({ success: true, message: "Follow Up deleted" });
          }
        }
        return createJsonResponse({ success: false, message: "Follow Up ID not found" });
      }
    }

    // 5. STANDALONE INSPECTION ACTIONS
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
          payload.CREATED_AT || todayStr,
          payload.UPDATED_AT || todayStr
        ]);
        return createJsonResponse({ success: true, message: "Standalone inspection created" });
      }

      if (action === 'updateStandaloneInspection') {
        var stValues = stSheet.getDataRange().getValues();
        for (var s = 1; s < stValues.length; s++) {
          if (String(stValues[s][0]).trim() === String(payload.ID).trim()) {
            if (payload.STATUS !== undefined) stSheet.getRange(s + 1, 8).setValue(payload.STATUS);
            if (payload.ACTION_BY !== undefined) stSheet.getRange(s + 1, 11).setValue(payload.ACTION_BY);
            if (payload.ACTION_DATE !== undefined) stSheet.getRange(s + 1, 12).setValue(payload.ACTION_DATE);
            if (payload.ACTION_DETAILS !== undefined) stSheet.getRange(s + 1, 13).setValue(payload.ACTION_DETAILS);
            if (payload.ACTION_IMAGE !== undefined) stSheet.getRange(s + 1, 14).setValue(payload.ACTION_IMAGE);
            stSheet.getRange(s + 1, 16).setValue(payload.UPDATED_AT || todayStr);
            return createJsonResponse({ success: true, message: "Standalone inspection updated" });
          }
        }
        return createJsonResponse({ success: false, message: "Inspection ID not found" });
      }

      if (action === 'deleteStandaloneInspection') {
        var stValues = stSheet.getDataRange().getValues();
        for (var s = 1; s < stValues.length; s++) {
          if (String(stValues[s][0]).trim() === String(payload.ID).trim()) {
            stSheet.deleteRow(s + 1);
            return createJsonResponse({ success: true, message: "Standalone inspection deleted" });
          }
        }
        return createJsonResponse({ success: false, message: "Inspection ID not found" });
      }
    }

    // 6. INSPECTIONS ACTIONS (DEFAULT)
    var cbmSheet = ss.getSheetByName("Inspections") || initializeCbmSheet();

    if (action === 'createInspection') {
      cbmSheet.appendRow([
        payload.ID || ("INS-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss")),
        payload.DATE || todayStr,
        payload.UNIT_ID || "",
        payload.HOURS_METER || payload.HM || "",
        payload.PROGRAM || "PPM",
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
        payload.DUE_DATE || payload.DATE || todayStr,
        payload.IMAGE_URL || "",
        payload.CREATED_AT || todayStr
      ]);
      return createJsonResponse({ success: true, message: "Inspection created successfully" });
    }

    if (action === 'updateInspection') {
      var cbmValues = cbmSheet.getDataRange().getValues();
      for (var c = 1; c < cbmValues.length; c++) {
        if (String(cbmValues[c][0]).trim() === String(payload.ID).trim()) {
          if (payload.DATE !== undefined) cbmSheet.getRange(c + 1, 2).setValue(payload.DATE);
          if (payload.UNIT_ID !== undefined) cbmSheet.getRange(c + 1, 3).setValue(payload.UNIT_ID);
          if (payload.HOURS_METER !== undefined || payload.HM !== undefined) cbmSheet.getRange(c + 1, 4).setValue(payload.HOURS_METER || payload.HM);
          if (payload.PROGRAM !== undefined) cbmSheet.getRange(c + 1, 5).setValue(payload.PROGRAM);
          if (payload.MODEL !== undefined) cbmSheet.getRange(c + 1, 6).setValue(payload.MODEL);
          if (payload.COMPONENT !== undefined) cbmSheet.getRange(c + 1, 7).setValue(payload.COMPONENT);
          if (payload.SYSTEM !== undefined) cbmSheet.getRange(c + 1, 8).setValue(payload.SYSTEM);
          if (payload.FINDINGS !== undefined) cbmSheet.getRange(c + 1, 9).setValue(payload.FINDINGS);
          if (payload.RECOMMENDATION !== undefined) cbmSheet.getRange(c + 1, 10).setValue(payload.RECOMMENDATION);
          if (payload.RATING !== undefined) cbmSheet.getRange(c + 1, 11).setValue(payload.RATING);
          if (payload.STATUS !== undefined) cbmSheet.getRange(c + 1, 12).setValue(payload.STATUS);
          if (payload.INSPECTOR !== undefined) cbmSheet.getRange(c + 1, 13).setValue(payload.INSPECTOR);
          if (payload.FOLLOW_UP !== undefined) cbmSheet.getRange(c + 1, 14).setValue(payload.FOLLOW_UP);
          if (payload.FOLLOW_UP_STATUS !== undefined) cbmSheet.getRange(c + 1, 15).setValue(payload.FOLLOW_UP_STATUS);
          if (payload.DUE_DATE !== undefined) cbmSheet.getRange(c + 1, 16).setValue(payload.DUE_DATE);
          if (payload.IMAGE_URL !== undefined) cbmSheet.getRange(c + 1, 17).setValue(payload.IMAGE_URL);
          return createJsonResponse({ success: true, message: "Inspection updated successfully" });
        }
      }
      return createJsonResponse({ success: false, message: "Inspection ID not found" });
    }

    if (action === 'deleteInspection') {
      var cbmValues = cbmSheet.getDataRange().getValues();
      for (var c = 1; c < cbmValues.length; c++) {
        if (String(cbmValues[c][0]).trim() === String(payload.ID).trim()) {
          cbmSheet.deleteRow(c + 1);
          return createJsonResponse({ success: true, message: "Inspection deleted successfully" });
        }
      }
      return createJsonResponse({ success: false, message: "Inspection ID not found" });
    }

    return createJsonResponse({ success: false, message: "Unknown action: " + action });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

// HELPER FUNCTIONS FOR GOOGLE SHEETS
function getSheetDataAsJson(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = String(headers[j]).trim();
      obj[key] = row[j] !== undefined ? row[j] : "";
    }
    result.push(obj);
  }
  return result;
}

function initializeCbmSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet("Inspections");
  sheet.appendRow([
    "ID", "DATE", "UNIT_ID", "HOURS_METER", "PROGRAM", "MODEL", "COMPONENT",
    "SYSTEM", "FINDINGS", "RECOMMENDATION", "RATING", "STATUS", "INSPECTOR",
    "FOLLOW_UP", "FOLLOW_UP_STATUS", "DUE_DATE", "IMAGE_URL", "CREATED_AT"
  ]);
  return sheet;
}

function initializeMasterComponentsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet("Master_Components");
  sheet.appendRow(["ID", "COMPONENT_NAME", "STATUS", "CREATED_AT", "UPDATED_AT"]);
  return sheet;
}

function initializeMasterUnitsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet("Master_Units");
  sheet.appendRow(["ID", "UNIT_CODE", "UNIT_MODEL", "MANUFACTURER", "SECTION", "STATUS", "CREATED_AT", "UPDATED_AT"]);
  return sheet;
}

function initializeFollowUpsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet("Follow_Ups");
  sheet.appendRow(["ID", "UNIT_ID", "UNIT_MODEL", "DATE", "COMPONENT", "FOLLOW_UP_ACTION", "INSPECTOR", "STATUS", "PRIORITY", "DUE_DATE", "NOTES", "CREATED_AT", "UPDATED_AT"]);
  return sheet;
}

function initializeStandaloneInspectionsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet("Standalone_Inspections");
  sheet.appendRow(["ID", "UNIT_ID", "UNIT_MODEL", "DATE", "FINDINGS", "FINDINGS_IMAGE", "INSPECTOR", "STATUS", "PRIORITY", "NOTES", "ACTION_BY", "ACTION_DATE", "ACTION_DETAILS", "ACTION_IMAGE", "CREATED_AT", "UPDATED_AT"]);
  return sheet;
}

function initializeSettingsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.insertSheet("Settings");
  sheet.appendRow(["KEY", "VALUE"]);
  sheet.appendRow(["APP_NAME", "CBM WEB APP"]);
  sheet.appendRow(["APP_SUBTITLE", "Condition-Based Monitoring"]);
  sheet.appendRow(["APP_PASSWORD", "cbmwebapp"]);
  return sheet;
}

function getSettingsAsJson(sheet) {
  var data = sheet.getDataRange().getValues();
  var obj = { pageTitles: {} };
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0] || "").trim();
    var val = String(data[i][1] || "").trim();
    if (!key) continue;
    if (key === "APP_NAME") obj.appName = val;
    else if (key === "APP_SUBTITLE") obj.appSubtitle = val;
    else if (key === "APP_LOGO_URL") obj.appLogoUrl = val;
    else if (key === "SPLASH_LOGO_URL") obj.splashLogoUrl = val;
    else if (key === "FAVICON_URL") obj.faviconUrl = val;
    else if (key === "HEADER_BADGE_TEXT") obj.headerBadgeText = val;
    else if (key === "CREDIT_TEXT") obj.creditText = val;
    else if (key.indexOf("TITLE_") === 0) {
      var pKey = key.replace("TITLE_", "").toLowerCase();
      obj.pageTitles[pKey] = val;
    }
  }
  return obj;
}

function saveSettingsFromJson(sheet, settings) {
  if (settings.appName) setSettingValue(sheet, "APP_NAME", settings.appName);
  if (settings.appSubtitle) setSettingValue(sheet, "APP_SUBTITLE", settings.appSubtitle);
  if (settings.appLogoUrl !== undefined) setSettingValue(sheet, "APP_LOGO_URL", settings.appLogoUrl);
  if (settings.splashLogoUrl !== undefined) setSettingValue(sheet, "SPLASH_LOGO_URL", settings.splashLogoUrl);
  if (settings.faviconUrl !== undefined) setSettingValue(sheet, "FAVICON_URL", settings.faviconUrl);
  if (settings.headerBadgeText) setSettingValue(sheet, "HEADER_BADGE_TEXT", settings.headerBadgeText);
  if (settings.creditText) setSettingValue(sheet, "CREDIT_TEXT", settings.creditText);
  if (settings.pageTitles) {
    for (var k in settings.pageTitles) {
      setSettingValue(sheet, "TITLE_" + k.toUpperCase(), settings.pageTitles[k]);
    }
  }
}

function getSettingValue(sheet, keyName) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === keyName) {
      return data[i][1];
    }
  }
  return "";
}

function setSettingValue(sheet, keyName, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === keyName) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([keyName, value]);
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
