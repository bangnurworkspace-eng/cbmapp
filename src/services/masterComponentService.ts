import { MasterComponent, ComponentCsvValidationPreview } from '../types/masterComponent';
import { Inspection } from '../types/inspection';
import { fetchMasterComponentsFromSheets, syncComponentToSheets, isScriptUrlConfigured } from './googleSheets';

let currentMasterComponentsInMemory: MasterComponent[] = [];

/**
 * Synchronously returns current master components list.
 * Guaranteed to return an array (MasterComponent[]).
 */
export function getMasterComponents(): MasterComponent[] {
  return currentMasterComponentsInMemory;
}

/**
 * Asynchronously fetches master components directly from Google Sheets API.
 */
export async function fetchMasterComponents(): Promise<MasterComponent[]> {
  if (!isScriptUrlConfigured()) return currentMasterComponentsInMemory;
  try {
    const data = await fetchMasterComponentsFromSheets();
    if (Array.isArray(data)) {
      currentMasterComponentsInMemory = data;
    }
  } catch {
    // Silent catch when server connection is unconfigured or unreachable
  }
  return currentMasterComponentsInMemory;
}

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
 * Saves master components array to Google Sheets
 */
export async function saveMasterComponents(list: MasterComponent[]): Promise<boolean> {
  const ok = await syncComponentToSheets('importComponents', { components: list });
  if (ok) currentMasterComponentsInMemory = list;
  return ok;
}

/**
 * Clears all master components from Google Sheets
 */
export async function clearAllComponents(): Promise<boolean> {
  const ok = await syncComponentToSheets('importComponents', { components: [] });
  if (ok) currentMasterComponentsInMemory = [];
  return ok;
}

/**
 * Adds a new component to master data in Google Sheets
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

  const success = await syncComponentToSheets('createComponent', {
    ID: newComponent.id,
    COMPONENT_NAME: newComponent.componentName,
    STATUS: newComponent.status,
    CREATED_AT: newComponent.createdAt,
    UPDATED_AT: newComponent.updatedAt,
  });

  if (success) {
    await fetchMasterComponents();
    return { success: true, component: newComponent, message: 'Component successfully created in Google Sheets.' };
  } else {
    return { success: false, message: 'Unable to connect to database.' };
  }
}

/**
 * Updates an existing component in Google Sheets
 */
export async function updateComponent(
  updated: MasterComponent
): Promise<{ success: boolean; message?: string }> {
  const currentList = getMasterComponents();
  const trimmedName = updated.componentName.trim();

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
  const success = await syncComponentToSheets('updateComponent', {
    ID: updated.id,
    COMPONENT_NAME: trimmedName,
    STATUS: updated.status,
    UPDATED_AT: today,
  });

  if (success) {
    await fetchMasterComponents();
    return { success: true, message: 'Component successfully updated in Google Sheets.' };
  } else {
    return { success: false, message: 'Unable to connect to database.' };
  }
}

/**
 * Deletes or sets inactive a component in Google Sheets
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
    const success = await syncComponentToSheets('updateComponent', {
      ID: componentId,
      STATUS: 'INACTIVE',
      UPDATED_AT: today,
    });
    if (success) await fetchMasterComponents();
    return {
      success,
      message: success ? `Component "${target.componentName}" set to INACTIVE.` : 'Unable to connect to database.',
      actionTaken: 'INACTIVE',
    };
  } else {
    const success = await syncComponentToSheets('deleteComponent', {
      ID: componentId,
    });
    if (success) await fetchMasterComponents();
    return {
      success,
      message: success ? `Component "${target.componentName}" permanently deleted.` : 'Unable to connect to database.',
      actionTaken: 'DELETED',
    };
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
    const existing = existingMap.get(key);
    if (existing) {
      duplicates.push({
        incomingName: compName,
        existingId: existing.id,
        existingName: existing.componentName,
      });
      continue;
    }

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
 * Executes CSV import and sends updated list to Google Sheets
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

  let maxSeq = 0;
  currentComponents.forEach((c) => {
    const m = c.id.match(/^CMP-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

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

  if (duplicateAction === 'update') {
    preview.duplicates.forEach((d) => {
      const key = d.incomingName.toLowerCase().trim();
      const existing = compMap.get(key);
      if (existing) {
        compMap.set(key, {
          ...existing,
          componentName: d.incomingName,
          status: 'ACTIVE',
          updatedAt: today,
        });
        updatedCount++;
      }
    });
  }

  const updatedList = Array.from(compMap.values());
  await saveMasterComponents(updatedList);

  return {
    updatedList,
    importedCount,
    updatedCount,
  };
}
