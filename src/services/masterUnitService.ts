import { MasterUnit, MasterModelDerived, CsvValidationPreview } from '../types/masterUnit';
import { RAW_MASTER_UNITS_CSV } from '../data/initialMasterUnitsCsv';
import { fetchMasterUnitsFromSheets, syncUnitToSheets } from './googleSheets';

export const MASTER_UNITS_STORAGE_KEY = 'cbm_master_units_v1';

/**
 * Parses CSV text (semicolon or comma delimited) into MasterUnit objects
 */
export function parseMasterUnitsCsv(csvText: string): MasterUnit[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());

  // Find column indices
  let unitCodeIdx = headers.findIndex((h) => h.includes('unit') && (h.includes('code') || h.includes('id')));
  if (unitCodeIdx === -1) unitCodeIdx = 0;

  let unitModelIdx = headers.findIndex((h) => h.includes('model'));
  if (unitModelIdx === -1) unitModelIdx = 1;

  let manufactureIdx = headers.findIndex((h) => h.includes('manufactur') || h.includes('brand') || h.includes('oem'));
  if (manufactureIdx === -1) manufactureIdx = 2;

  let sectionIdx = headers.findIndex((h) => h.includes('section') || h.includes('dept') || h.includes('area'));
  if (sectionIdx === -1) sectionIdx = 3;

  const result: MasterUnit[] = [];
  const seenCodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const unitCode = cols[unitCodeIdx]?.trim() || '';
    const unitModel = cols[unitModelIdx]?.trim() || '';
    const manufacturer = cols[manufactureIdx]?.trim() || '';
    const section = cols[sectionIdx]?.trim() || '';

    if (!unitCode) continue;

    const normalizedCode = unitCode.toUpperCase();
    if (seenCodes.has(normalizedCode)) continue;
    seenCodes.add(normalizedCode);

    result.push({
      id: `UNIT_${normalizedCode}`,
      unitCode: unitCode,
      unitModel: unitModel,
      manufacturer: manufacturer,
      section: section,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Loads master units from localStorage. Returns empty array if none exist or cleared.
 */
export function getMasterUnits(): MasterUnit[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(MASTER_UNITS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(MASTER_UNITS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch (err) {
    console.error('Error loading master units from storage:', err);
    return [];
  }
}

/**
 * Clears all master units from storage and sheets
 */
export function clearAllUnits(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MASTER_UNITS_STORAGE_KEY, JSON.stringify([]));
  syncUnitToSheets('importUnits', { units: [] });
}

/**
 * Saves master units array to persistent storage and Google Sheets
 */
export function saveMasterUnits(units: MasterUnit[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MASTER_UNITS_STORAGE_KEY, JSON.stringify(units));
    syncUnitToSheets('importUnits', { units });
  } catch (err) {
    console.error('Error saving master units to storage:', err);
  }
}

/**
 * Derives unique Master Models from Master Units (Unit Model + Manufacturer)
 */
export function deriveMasterModels(units: MasterUnit[]): MasterModelDerived[] {
  const modelMap = new Map<string, {
    model: string;
    manufacturer: string;
    unitCodes: Set<string>;
    sections: Set<string>;
    hasActive: boolean;
  }>();

  units.forEach((u) => {
    const model = (u.unitModel || 'Unknown Model').trim();
    const manufacturer = (u.manufacturer || 'Unknown Manufacturer').trim();
    const key = `${manufacturer.toLowerCase()}___${model.toLowerCase()}`;

    let entry = modelMap.get(key);
    if (!entry) {
      entry = {
        model,
        manufacturer,
        unitCodes: new Set<string>(),
        sections: new Set<string>(),
        hasActive: false,
      };
      modelMap.set(key, entry);
    }

    if (u.unitCode) entry.unitCodes.add(u.unitCode.trim());
    if (u.section) entry.sections.add(u.section.trim());
    if (u.status === 'ACTIVE') entry.hasActive = true;
  });

  const list: MasterModelDerived[] = [];
  modelMap.forEach((val, key) => {
    list.push({
      id: `MDL_${key.replace(/\s+/g, '_')}`,
      model: val.model,
      manufacturer: val.manufacturer,
      totalUnits: val.unitCodes.size,
      sections: Array.from(val.sections).sort(),
      unitCodes: Array.from(val.unitCodes).sort(),
      status: val.hasActive ? 'ACTIVE' : 'INACTIVE',
    });
  });

  // Sort by Model name alphabetically
  list.sort((a, b) => a.model.localeCompare(b.model));
  return list;
}

/**
 * Validates a CSV string against the current Master Units
 */
export function validateCsvImport(csvContent: string, currentUnits: MasterUnit[]): CsvValidationPreview {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      invalidRows: 0,
      duplicates: [],
      invalidItems: [],
      validItems: [],
    };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());

  let unitCodeIdx = headers.findIndex((h) => h.includes('unit') && (h.includes('code') || h.includes('id')));
  if (unitCodeIdx === -1) unitCodeIdx = 0;

  let unitModelIdx = headers.findIndex((h) => h.includes('model'));
  if (unitModelIdx === -1) unitModelIdx = 1;

  let manufactureIdx = headers.findIndex((h) => h.includes('manufactur') || h.includes('brand') || h.includes('oem'));
  if (manufactureIdx === -1) manufactureIdx = 2;

  let sectionIdx = headers.findIndex((h) => h.includes('section') || h.includes('dept') || h.includes('area'));
  if (sectionIdx === -1) sectionIdx = 3;

  const existingMap = new Map<string, MasterUnit>();
  currentUnits.forEach((u) => {
    existingMap.set(u.unitCode.trim().toUpperCase(), u);
  });

  const seenInBatch = new Set<string>();
  const duplicates: CsvValidationPreview['duplicates'] = [];
  const invalidItems: CsvValidationPreview['invalidItems'] = [];
  const validItems: CsvValidationPreview['validItems'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const unitCode = cols[unitCodeIdx] || '';
    const unitModel = cols[unitModelIdx] || '';
    const manufacturer = cols[manufactureIdx] || '';
    const section = cols[sectionIdx] || '';

    // Validation: none of the 4 columns can be empty
    const missing: string[] = [];
    if (!unitCode) missing.push('Unit Code');
    if (!unitModel) missing.push('Unit Model');
    if (!manufacturer) missing.push('Manufacturer');
    if (!section) missing.push('Section');

    if (missing.length > 0) {
      invalidItems.push({
        rowNumber: i + 1,
        raw: rawLine,
        reason: `Missing Data: ${missing.join(', ')}`,
      });
      continue;
    }

    const codeKey = unitCode.toUpperCase();

    // Check duplicate within existing database
    const existing = existingMap.get(codeKey);
    const incomingItem = {
      unitCode,
      unitModel,
      manufacturer,
      section,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      duplicates.push({
        unitCode,
        existing,
        incoming: incomingItem,
      });
      continue;
    }

    // Check duplicate within the same batch
    if (seenInBatch.has(codeKey)) {
      duplicates.push({
        unitCode,
        existing: {
          id: `TEMP_${codeKey}`,
          ...incomingItem,
        },
        incoming: incomingItem,
      });
      continue;
    }

    seenInBatch.add(codeKey);
    validItems.push(incomingItem);
  }

  return {
    totalRows: lines.length - 1,
    validRows: validItems.length,
    duplicateRows: duplicates.length,
    invalidRows: invalidItems.length,
    duplicates,
    invalidItems,
    validItems,
  };
}

/**
 * Executes CSV import and updates persistent storage
 */
export function executeCsvImport(
  preview: CsvValidationPreview,
  duplicateAction: 'skip' | 'update',
  currentUnits: MasterUnit[]
): {
  updatedList: MasterUnit[];
  importedCount: number;
  updatedCount: number;
} {
  const unitsMap = new Map<string, MasterUnit>();
  currentUnits.forEach((u) => {
    unitsMap.set(u.unitCode.trim().toUpperCase(), { ...u });
  });

  let importedCount = 0;
  let updatedCount = 0;

  // Add all strictly valid non-duplicate rows
  preview.validItems.forEach((item) => {
    const key = item.unitCode.trim().toUpperCase();
    if (!unitsMap.has(key)) {
      unitsMap.set(key, {
        id: `UNIT_${key}`,
        ...item,
      });
      importedCount++;
    }
  });

  // Handle duplicate rows
  if (duplicateAction === 'update') {
    preview.duplicates.forEach((d) => {
      const key = d.unitCode.trim().toUpperCase();
      const existing = unitsMap.get(key);
      if (existing) {
        unitsMap.set(key, {
          ...existing,
          unitModel: d.incoming.unitModel,
          manufacturer: d.incoming.manufacturer,
          section: d.incoming.section,
          updatedAt: new Date().toISOString(),
        });
        updatedCount++;
      } else {
        unitsMap.set(key, {
          id: `UNIT_${key}`,
          ...d.incoming,
        });
        importedCount++;
      }
    });
  }

  const updatedList = Array.from(unitsMap.values());
  saveMasterUnits(updatedList);

  return {
    updatedList,
    importedCount,
    updatedCount,
  };
}
