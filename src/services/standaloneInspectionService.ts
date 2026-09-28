import {
  StandaloneInspectionItem,
  StandaloneInspectionStats,
  StandaloneInspectionStatus,
  StandaloneInspectionPriority,
} from '../types/standaloneInspection';
import { syncStandaloneInspectionToSheets } from './googleSheets';

export const STANDALONE_INSPECTION_STORAGE_KEY = 'cbm_standalone_inspection_page_v1';

export function getStandaloneInspections(): StandaloneInspectionItem[] {
  try {
    const raw = localStorage.getItem(STANDALONE_INSPECTION_STORAGE_KEY);
    if (!raw) {
      saveStandaloneInspections([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    saveStandaloneInspections([]);
    return [];
  } catch (err) {
    console.error('Error loading standalone inspections:', err);
    return [];
  }
}

export function saveStandaloneInspections(items: StandaloneInspectionItem[]): void {
  try {
    localStorage.setItem(STANDALONE_INSPECTION_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('LocalStorage quota exceeded when saving standalone inspections. Applying image truncation fallback:', err);
    try {
      // Fallback: truncate heavy base64 strings from older items so localStorage does not crash
      const sanitized = items.map((item, idx) => {
        if (idx > 3) {
          return {
            ...item,
            findingsImage: item.findingsImage && item.findingsImage.length > 500 ? '' : item.findingsImage,
            actionImage: item.actionImage && item.actionImage.length > 500 ? '' : item.actionImage,
          };
        }
        return item;
      });
      localStorage.setItem(STANDALONE_INSPECTION_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (fallbackErr) {
      console.error('Failed to save even with fallback:', fallbackErr);
    }
  }
}

export function createStandaloneInspection(
  data: Omit<StandaloneInspectionItem, 'id' | 'createdAt' | 'updatedAt'>
): StandaloneInspectionItem {
  const items = getStandaloneInspections();
  const nextNum = items.length + 1001;
  const newId = `INSP-${nextNum}`;
  const now = new Date().toISOString();

  const newItem: StandaloneInspectionItem = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newItem, ...items];
  saveStandaloneInspections(updated);

  // Sync to Google Sheets
  syncStandaloneInspectionToSheets('createStandaloneInspection', {
    ID: newItem.id,
    UNIT_ID: newItem.unitId,
    UNIT_MODEL: newItem.unitModel || '',
    DATE: newItem.date,
    FINDINGS: newItem.findings,
    FINDINGS_IMAGE: newItem.findingsImage || '',
    INSPECTOR: newItem.inspector,
    STATUS: newItem.status,
    PRIORITY: newItem.priority || 'P2',
    NOTES: newItem.notes || '',
    ACTION_BY: newItem.actionBy || '',
    ACTION_DATE: newItem.actionDate || '',
    ACTION_DETAILS: newItem.actionDetails || '',
    ACTION_IMAGE: newItem.actionImage || '',
    CREATED_AT: newItem.createdAt,
    UPDATED_AT: newItem.updatedAt,
  });

  return newItem;
}

export function updateStandaloneInspection(
  item: StandaloneInspectionItem
): StandaloneInspectionItem[] {
  const items = getStandaloneInspections();
  const now = new Date().toISOString();
  const updatedItem = { ...item, updatedAt: now };
  const updated = items.map((i) => (i.id === item.id ? updatedItem : i));
  saveStandaloneInspections(updated);

  // Sync to Google Sheets
  syncStandaloneInspectionToSheets('updateStandaloneInspection', {
    ID: updatedItem.id,
    UNIT_ID: updatedItem.unitId,
    UNIT_MODEL: updatedItem.unitModel || '',
    DATE: updatedItem.date,
    FINDINGS: updatedItem.findings,
    FINDINGS_IMAGE: updatedItem.findingsImage || '',
    INSPECTOR: updatedItem.inspector,
    STATUS: updatedItem.status,
    PRIORITY: updatedItem.priority || 'P2',
    NOTES: updatedItem.notes || '',
    ACTION_BY: updatedItem.actionBy || '',
    ACTION_DATE: updatedItem.actionDate || '',
    ACTION_DETAILS: updatedItem.actionDetails || '',
    ACTION_IMAGE: updatedItem.actionImage || '',
    UPDATED_AT: updatedItem.updatedAt,
  });

  return updated;
}

export function deleteStandaloneInspection(id: string): StandaloneInspectionItem[] {
  const items = getStandaloneInspections();
  const updated = items.filter((i) => i.id !== id);
  saveStandaloneInspections(updated);

  // Sync delete to Google Sheets
  syncStandaloneInspectionToSheets('deleteStandaloneInspection', { ID: id });

  return updated;
}

export function calculateStandaloneInspectionStats(
  items: StandaloneInspectionItem[]
): StandaloneInspectionStats {
  let open = 0;
  let inProgress = 0;
  let closed = 0;
  let p1Count = 0;
  let p2Count = 0;
  let p3Count = 0;

  items.forEach((item) => {
    if (item.status === 'CLOSED') {
      closed++;
    } else if (item.status === 'IN_PROGRESS') {
      inProgress++;
    } else {
      open++;
    }

    if (item.priority === 'P1') {
      p1Count++;
    } else if (item.priority === 'P3') {
      p3Count++;
    } else {
      p2Count++;
    }
  });

  return {
    total: items.length,
    open,
    inProgress,
    closed,
    p1Count,
    p2Count,
    p3Count,
  };
}
