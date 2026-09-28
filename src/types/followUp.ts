export type FollowUpTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type FollowUpPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FollowUpItem {
  id: string;
  unitId: string;        // UNIT ID
  unitModel?: string;    // Unit Model (Auto-populated from Master Units)
  date: string;          // DATE
  component: string;     // Component
  followUpAction: string;// Follow Up Action
  inspector: string;     // Inspector
  status: FollowUpTaskStatus; // Inspector Status / Task Status
  dueDate?: string;
  priority?: FollowUpPriority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  highPriority: number;
}
