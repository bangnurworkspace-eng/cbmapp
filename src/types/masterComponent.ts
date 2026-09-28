export interface MasterComponent {
  id: string; // e.g. CMP-001, CMP-002, CMP-003
  componentName: string; // e.g. "Engine", "Hydraulic"
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface ComponentCsvValidationPreview {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  detectedColumn: string;
  duplicates: {
    incomingName: string;
    existingId?: string;
    existingName?: string;
  }[];
  invalidItems: {
    rowNumber: number;
    raw: string;
    reason: string;
  }[];
  validItems: {
    componentName: string;
    status: 'ACTIVE' | 'INACTIVE';
  }[];
}
