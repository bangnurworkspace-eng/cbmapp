import { FollowUpItem, FollowUpStats, FollowUpTaskStatus } from '../types/followUp';
import { syncFollowUpToSheets, fetchFollowUpsFromSheets } from './googleSheets';

export const FOLLOWUP_STORAGE_KEY = 'cbm_standalone_followup_v2';

export function getFollowUpItems(): FollowUpItem[] {
  try {
    const raw = localStorage.getItem(FOLLOWUP_STORAGE_KEY);
    if (!raw) {
      saveFollowUpItems([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    saveFollowUpItems([]);
    return [];
  } catch (err) {
    console.error('Error loading follow up items:', err);
    return [];
  }
}

export function saveFollowUpItems(items: FollowUpItem[]): void {
  try {
    localStorage.setItem(FOLLOWUP_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving follow up items:', err);
  }
}

export function createFollowUpItem(
  data: Omit<FollowUpItem, 'id' | 'createdAt' | 'updatedAt'>
): FollowUpItem {
  const items = getFollowUpItems();
  const nextNum = items.length + 1001;
  const newId = `FLU-${nextNum}`;
  const now = new Date().toISOString();

  const newItem: FollowUpItem = {
    ...data,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newItem, ...items];
  saveFollowUpItems(updated);

  // Sync create to Google Sheets
  syncFollowUpToSheets('createFollowUp', {
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

  return newItem;
}

export function updateFollowUpItem(item: FollowUpItem): FollowUpItem[] {
  const items = getFollowUpItems();
  const now = new Date().toISOString();
  const updatedItem = { ...item, updatedAt: now };
  const updated = items.map((i) => (i.id === item.id ? updatedItem : i));
  saveFollowUpItems(updated);

  // Sync update to Google Sheets
  syncFollowUpToSheets('updateFollowUp', {
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

  return updated;
}

export function deleteFollowUpItem(id: string): FollowUpItem[] {
  const items = getFollowUpItems();
  const updated = items.filter((i) => i.id !== id);
  saveFollowUpItems(updated);

  // Sync delete to Google Sheets
  syncFollowUpToSheets('deleteFollowUp', { ID: id });

  return updated;
}

export function clearAllFollowUps(): void {
  saveFollowUpItems([]);
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
