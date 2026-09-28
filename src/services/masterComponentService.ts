import { MasterComponent, ComponentCsvValidationPreview } from '../types/masterComponent';
import { Inspection } from '../types/inspection';
import { RAW_MASTER_COMPONENTS_CSV } from '../data/initialMasterComponentsCsv';
import { getGoogleAppsScriptUrl, syncComponentToSheets } from './googleSheets';

export const MASTER_COMPONENTS_STORAGE_KEY = 'cbm_master_components_v2';

/**
 * Format sequential ID: CMP-001, CMP-002, ...
 */
export function formatComponentId(seq: number): string {
  return `CMP-${String(seq).padStart(3, '0')}`;
}

/**
 * Calculate the next sequential CMP ID
 */
export function getNextComponentId(existing: MasterComponent[]): string {
  let maxNum = 0;
  existing.forEach((item) => {
    const match = item.id.match(/^CMP-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  return formatComponentId(maxNum + 1);
}

/**
 * Format date in standard DD/MM/YYYY
 */
export function formatStandardDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses raw CSV string into MasterComponent list
 */
export function parseMasterComponentsCsv(csvText: string): MasterComponent[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Determine header index
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());

  let colIdx = headers.findIndex((h) => h.includes('component') || h.includes('nama') || h.includes('system'));
  if (colIdx === -1) colIdx = 0;

  const result: MasterComponent[] = [];
  const seenNames = new Set<string>();
  const today = formatStandardDate();

  let seq = 1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const rawName = cols[colIdx]?.trim();
    if (!rawName) continue;

    const normalizedKey = rawName.toLowerCase();
    if (seenNames.has(normalizedKey)) continue;
    seenNames.add(normalizedKey);

    result.push({
      id: formatComponentId(seq++),
      componentName: rawName,
      status: 'ACTIVE',
      createdAt: today,
      updatedAt: today,
    });
  }

  return result;
}

/**
 * Loads master components from storage. Returns empty array if none exist or cleared.
 */
export function getMasterComponents(): MasterComponent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(MASTER_COMPONENTS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(MASTER_COMPONENTS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (err) {
    console.error('Error loading master components from storage:', err);
    return [];
  }
}

/**
 * Saves master components array to storage and Google Sheets
 */
export function saveMasterComponents(list: MasterComponent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MASTER_COMPONENTS_STORAGE_KEY, JSON.stringify(list));
    syncComponentToSheets('importComponents', { components: list });
  } catch (err) {
    console.error('Error saving master components to storage:', err);
  }
}

/**
 * Clears all master components from storage and Google Sheets
 */
export function clearAllComponents(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MASTER_COMPONENTS_STORAGE_KEY, JSON.stringify([]));
  syncComponentToSheets('importComponents', { components: [] });
}

/**
 * Adds a new component to master data
 */
export async function createComponent(
  name: string,
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'
): Promise<{ success: boolean; component?: MasterComponent; message?: string }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, message: 'Component Name cannot be empty.' };
  }

  const currentList = getMasterComponents();
  const isDuplicate = currentList.some(
    (c) => c.componentName.toLowerCase().trim() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return {
      success: false,
      message: `Component "${trimmedName}" already exists in Master Components.`,
    };
  }

  const newId = getNextComponentId(currentList);
  const today = formatStandardDate();
  const newComponent: MasterComponent = {
    id: newId,
    componentName: trimmedName,
    status,
    createdAt: today,
    updatedAt: today,
  };

  const updatedList = [...currentList, newComponent];
  saveMasterComponents(updatedList);

  // Sync to Google Apps Script if URL is configured
  const scriptUrl = getGoogleAppsScriptUrl();
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'createComponent',
          ID: newComponent.id,
          COMPONENT_NAME: newComponent.componentName,
          STATUS: newComponent.status,
          CREATED_AT: newComponent.createdAt,
          UPDATED_AT: newComponent.updatedAt,
        }),
      });
    } catch (e) {
      console.warn('Remote Google Apps Script sync warning for createComponent:', e);
    }
  }

  return { success: true, component: newComponent, message: 'Component successfully created.' };
}

/**
 * Updates an existing component
 */
export async function updateComponent(
  updated: MasterComponent
): Promise<{ success: boolean; message?: string }> {
  const currentList = getMasterComponents();
  const trimmedName = updated.componentName.trim();

  // Check duplicate name on other items
  const duplicate = currentList.find(
    (c) => c.id !== updated.id && c.componentName.toLowerCase().trim() === trimmedName.toLowerCase()
  );

  if (duplicate) {
    return {
      success: false,
      message: `Another component already uses the name "${trimmedName}".`,
    };
  }

  const today = formatStandardDate();
  const finalList = currentList.map((item) =>
    item.id === updated.id
      ? {
          ...item,
          componentName: trimmedName,
          status: updated.status,
          updatedAt: today,
        }
      : item
  );

  saveMasterComponents(finalList);

  // Sync to Google Apps Script
  const scriptUrl = getGoogleAppsScriptUrl();
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateComponent',
          ID: updated.id,
          COMPONENT_NAME: trimmedName,
          STATUS: updated.status,
          UPDATED_AT: today,
        }),
      });
    } catch (e) {
      console.warn('Remote Google Apps Script sync warning for updateComponent:', e);
    }
  }

  return { success: true, message: 'Component successfully updated.' };
}

/**
 * Deletes or sets inactive a component
 */
export async function deleteOrDeactivateComponent(
  componentId: string,
  forceDeactivate: boolean = false
): Promise<{ success: boolean; message?: string; actionTaken: 'DELETED' | 'INACTIVE' }> {
  const currentList = getMasterComponents();
  const target = currentList.find((c) => c.id === componentId);
  if (!target) {
    return { success: false, message: 'Component not found.', actionTaken: 'DELETED' };
  }

  const today = formatStandardDate();

  if (forceDeactivate) {
    // Mark as INACTIVE
    const updatedList = currentList.map((c) =>
      c.id === componentId ? { ...c, status: 'INACTIVE' as const, updatedAt: today } : c
    );
    saveMasterComponents(updatedList);

    const scriptUrl = getGoogleAppsScriptUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateComponent',
            ID: componentId,
            STATUS: 'INACTIVE',
            UPDATED_AT: today,
          }),
        });
      } catch (e) {}
    }

    return { success: true, message: `Component "${target.componentName}" has been set to INACTIVE for data integrity.`, actionTaken: 'INACTIVE' };
  } else {
    // Permanent deletion
    const updatedList = currentList.filter((c) => c.id !== componentId);
    saveMasterComponents(updatedList);

    const scriptUrl = getGoogleAppsScriptUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteComponent',
            ID: componentId,
          }),
        });
      } catch (e) {}
    }

    return { success: true, message: `Component "${target.componentName}" has been permanently deleted.`, actionTaken: 'DELETED' };
  }
}

/**
 * Calculates how many inspections use this component
 */
export function getComponentInspectionCount(
  componentName: string,
  componentId?: string,
  inspections: Inspection[] = []
): number {
  if (!componentName && !componentId) return 0;
  const nameLower = (componentName || '').toLowerCase().trim();
  const idLower = (componentId || '').toLowerCase().trim();

  let count = 0;
  inspections.forEach((insp) => {
    const inspComp = (insp.component || '').toLowerCase().trim();
    const inspSys = (insp.system || '').toLowerCase().trim();

    if (
      inspComp === nameLower ||
      inspSys === nameLower ||
      (idLower && inspComp === idLower) ||
      (nameLower && (inspComp.includes(nameLower) || inspSys.includes(nameLower)))
    ) {
      count++;
    }
  });

  return count;
}

/**
 * Validates a CSV upload for Master Components
 */
export function validateComponentCsvImport(
  csvContent: string,
  currentComponents: MasterComponent[]
): ComponentCsvValidationPreview {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      invalidRows: 0,
      detectedColumn: 'Component',
      duplicates: [],
      invalidItems: [],
      validItems: [],
    };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const headersLower = headers.map((h) => h.toLowerCase());

  let colIdx = headersLower.findIndex(
    (h) => h.includes('component') || h.includes('nama') || h.includes('system')
  );
  if (colIdx === -1) colIdx = 0;
  const detectedHeaderName = headers[colIdx] || 'Component';

  const existingMap = new Map<string, MasterComponent>();
  currentComponents.forEach((c) => {
    existingMap.set(c.componentName.toLowerCase().trim(), c);
  });

  const seenInBatch = new Set<string>();
  const duplicates: ComponentCsvValidationPreview['duplicates'] = [];
  const invalidItems: ComponentCsvValidationPreview['invalidItems'] = [];
  const validItems: ComponentCsvValidationPreview['validItems'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const compName = cols[colIdx]?.trim();

    if (!compName) {
      invalidItems.push({
        rowNumber: i + 1,
        raw: rawLine,
        reason: 'Empty Component Name',
      });
      continue;
    }

    const key = compName.toLowerCase();

    // Check duplicate in existing database
    const existing = existingMap.get(key);
    if (existing) {
      duplicates.push({
        incomingName: compName,
        existingId: existing.id,
        existingName: existing.componentName,
      });
      continue;
    }

    // Check duplicate in same batch
    if (seenInBatch.has(key)) {
      duplicates.push({
        incomingName: compName,
        existingName: compName,
      });
      continue;
    }

    seenInBatch.add(key);
    validItems.push({
      componentName: compName,
      status: 'ACTIVE',
    });
  }

  return {
    totalRows: lines.length - 1,
    validRows: validItems.length,
    duplicateRows: duplicates.length,
    invalidRows: invalidItems.length,
    detectedColumn: detectedHeaderName,
    duplicates,
    invalidItems,
    validItems,
  };
}

/**
 * Executes CSV import and updates persistent storage
 */
export async function executeComponentCsvImport(
  preview: ComponentCsvValidationPreview,
  duplicateAction: 'skip' | 'update',
  currentComponents: MasterComponent[]
): Promise<{
  updatedList: MasterComponent[];
  importedCount: number;
  updatedCount: number;
}> {
  const compMap = new Map<string, MasterComponent>();
  currentComponents.forEach((c) => {
    compMap.set(c.componentName.toLowerCase().trim(), { ...c });
  });

  let importedCount = 0;
  let updatedCount = 0;
  const today = formatStandardDate();

  // Find start seq
  let maxSeq = 0;
  currentComponents.forEach((c) => {
    const m = c.id.match(/^CMP-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

  // Add all valid rows
  preview.validItems.forEach((item) => {
    const key = item.componentName.toLowerCase().trim();
    if (!compMap.has(key)) {
      maxSeq++;
      const newComp: MasterComponent = {
        id: formatComponentId(maxSeq),
        componentName: item.componentName,
        status: item.status,
        createdAt: today,
        updatedAt: today,
      };
      compMap.set(key, newComp);
      importedCount++;
    }
  });

  // Handle duplicates if update requested
  if (duplicateAction === 'update') {
    preview.duplicates.forEach((d) => {
      const key = d.incomingName.toLowerCase().trim();
      const existing = compMap.get(key);
      if (existing) {
        compMap.set(key, {
          ...existing,
          componentName: d.incomingName, // maintain capitalization from incoming CSV
          status: 'ACTIVE',
          updatedAt: today,
        });
        updatedCount++;
      }
    });
  }

  const updatedList = Array.from(compMap.values());
  saveMasterComponents(updatedList);

  // Sync import to Google Apps Script if URL configured
  const scriptUrl = getGoogleAppsScriptUrl();
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'importComponents',
          components: updatedList,
        }),
      });
    } catch (e) {
      console.warn('Google Apps Script importComponents warning:', e);
    }
  }

  return {
    updatedList,
    importedCount,
    updatedCount,
  };
}

/**
 * Fetches components from Google Apps Script Web App
 */
export async function fetchComponentsFromGoogleSheets(): Promise<{
  success: boolean;
  data: MasterComponent[];
  message?: string;
}> {
  const scriptUrl = getGoogleAppsScriptUrl();
  if (!scriptUrl) {
    return {
      success: true,
      data: getMasterComponents(),
    };
  }

  try {
    const url = `${scriptUrl}?action=getComponents`;
    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();

    if (result && result.success && Array.isArray(result.data)) {
      const mapped: MasterComponent[] = result.data.map((row: any, idx: number) => ({
        id: String(row.ID || row.id || formatComponentId(idx + 1)),
        componentName: String(row.COMPONENT_NAME || row.componentName || row.name || '').trim(),
        status: (String(row.STATUS || row.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
        createdAt: String(row.CREATED_AT || row.createdAt || formatStandardDate()),
        updatedAt: String(row.UPDATED_AT || row.updatedAt || formatStandardDate()),
      })).filter((c: MasterComponent) => c.componentName.length > 0);

      if (mapped.length > 0) {
        saveMasterComponents(mapped);
        return { success: true, data: mapped, message: `Loaded ${mapped.length} components from database` };
      }
    }
    return { success: true, data: getMasterComponents() };
  } catch (err: any) {
    console.warn('Failed to fetch components from database:', err);
    return { success: false, data: getMasterComponents(), message: err.message };
  }
}
