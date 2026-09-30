import { FollowUpItem, FollowUpStats } from '../types/followUp';
import { syncFollowUpToSheets, fetchFollowUpsFromSheets, isScriptUrlConfigured } from './googleSheets';

let currentFollowUpsInMemory: FollowUpItem[] = [];

/**
 * Synchronously returns current follow ups list.
 * Guaranteed to return an array (FollowUpItem[]).
 */
export function getFollowUpItems(): FollowUpItem[] {
  return currentFollowUpsInMemory;
}

/**
 * Asynchronously fetches follow ups directly from Google Sheets API.
 */
export async function fetchFollowUpItems(): Promise<FollowUpItem[]> {
  if (!isScriptUrlConfigured()) return currentFollowUpsInMemory;
  try {
    const data = await fetchFollowUpsFromSheets();
    if (Array.isArray(data)) {
      currentFollowUpsInMemory = data;
    }
  } catch {
    // Silent catch when server connection is unconfigured or unreachable
  }
  return currentFollowUpsInMemory;
}

export async function createFollowUpItem(
  data: Omit<FollowUpItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FollowUpItem | null> {
  const newId = `FLU-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newItem: FollowUpItem = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const success = await syncFollowUpToSheets('createFollowUp', {
    ID: newItem.id,
    UNIT_ID: newItem.unitId,
    UNIT_MODEL: newItem.unitModel || '',
    DATE: newItem.date,
    COMPONENT: newItem.component,
    FOLLOW_UP_ACTION: newItem.followUpAction,
    INSPECTOR: newItem.inspector,
    STATUS: newItem.status,
    PRIORITY: newItem.priority || 'MEDIUM',
    DUE_DATE: newItem.dueDate || '',
    NOTES: newItem.notes || '',
    CREATED_AT: newItem.createdAt,
    UPDATED_AT: newItem.updatedAt,
  });

  if (success) {
    await fetchFollowUpItems();
    return newItem;
  }
  return null;
}

export async function updateFollowUpItem(item: FollowUpItem): Promise<boolean> {
  const now = new Date().toISOString();
  const updatedItem = { ...item, updatedAt: now };

  const success = await syncFollowUpToSheets('updateFollowUp', {
    ID: updatedItem.id,
    UNIT_ID: updatedItem.unitId,
    UNIT_MODEL: updatedItem.unitModel || '',
    DATE: updatedItem.date,
    COMPONENT: updatedItem.component,
    FOLLOW_UP_ACTION: updatedItem.followUpAction,
    INSPECTOR: updatedItem.inspector,
    STATUS: updatedItem.status,
    PRIORITY: updatedItem.priority || 'MEDIUM',
    DUE_DATE: updatedItem.dueDate || '',
    NOTES: updatedItem.notes || '',
    UPDATED_AT: updatedItem.updatedAt,
  });

  if (success) {
    await fetchFollowUpItems();
  }
  return success;
}

export async function deleteFollowUpItem(id: string): Promise<boolean> {
  const success = await syncFollowUpToSheets('deleteFollowUp', { ID: id });
  if (success) {
    await fetchFollowUpItems();
  }
  return success;
}

export function calculateFollowUpStats(items: FollowUpItem[]): FollowUpStats {
  let open = 0;
  let inProgress = 0;
  let closed = 0;
  let highPriority = 0;

  items.forEach((item) => {
    if (item.status === 'CLOSED') {
      closed++;
    } else if (item.status === 'IN_PROGRESS') {
      inProgress++;
    } else {
      open++;
    }

    if (item.priority === 'HIGH') {
      highPriority++;
    }
  });

  return {
    total: items.length,
    open,
    inProgress,
    closed,
    highPriority,
  };
}
