import {
  StandaloneInspectionItem,
  StandaloneInspectionStats,
} from '../types/standaloneInspection';
import { syncStandaloneInspectionToSheets, fetchStandaloneInspectionsFromSheets, isScriptUrlConfigured } from './googleSheets';

let currentStandaloneInspectionsInMemory: StandaloneInspectionItem[] = [];

/**
 * Synchronously returns current standalone inspections list.
 * Guaranteed to return an array (StandaloneInspectionItem[]).
 */
export function getStandaloneInspections(): StandaloneInspectionItem[] {
  return currentStandaloneInspectionsInMemory;
}

/**
 * Asynchronously fetches standalone inspections directly from Google Sheets API.
 */
export async function fetchStandaloneInspections(): Promise<StandaloneInspectionItem[]> {
  if (!isScriptUrlConfigured()) return currentStandaloneInspectionsInMemory;
  try {
    const data = await fetchStandaloneInspectionsFromSheets();
    if (Array.isArray(data)) {
      currentStandaloneInspectionsInMemory = data;
    }
  } catch {
    // Silent catch when server connection is unconfigured or unreachable
  }
  return currentStandaloneInspectionsInMemory;
}

export async function createStandaloneInspection(
  data: Omit<StandaloneInspectionItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StandaloneInspectionItem | null> {
  const newId = `INSP-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newItem: StandaloneInspectionItem = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const success = await syncStandaloneInspectionToSheets('createStandaloneInspection', {
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

  if (success) {
    await fetchStandaloneInspections();
    return newItem;
  }
  return null;
}

export async function updateStandaloneInspection(
  item: StandaloneInspectionItem
): Promise<boolean> {
  const now = new Date().toISOString();
  const updatedItem = { ...item, updatedAt: now };

  const success = await syncStandaloneInspectionToSheets('updateStandaloneInspection', {
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

  if (success) {
    await fetchStandaloneInspections();
  }
  return success;
}

export async function deleteStandaloneInspection(id: string): Promise<boolean> {
  const success = await syncStandaloneInspectionToSheets('deleteStandaloneInspection', { ID: id });
  if (success) {
    await fetchStandaloneInspections();
  }
  return success;
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
