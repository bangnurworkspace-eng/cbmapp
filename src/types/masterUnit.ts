export interface MasterUnit {
  id: string; // Unique Identifier
  unitCode: string; // e.g. "EXLB003" (Unique Key)
  unitModel: string; // e.g. "R9300"
  manufacturer: string; // e.g. "LIEBHERR"
  section: string; // e.g. "BIG DIGGER"
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterModelDerived {
  id: string; // Key: `${manufacturer}___${model}`
  model: string; // e.g. "R9300"
  manufacturer: string; // e.g. "LIEBHERR"
  totalUnits: number; // Count of units belonging to this model
  sections: string[]; // Array of unique sections where units operate
  unitCodes: string[]; // Array of Unit Codes
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CsvValidationPreview {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  duplicates: {
    unitCode: string;
    existing: MasterUnit;
    incoming: Omit<MasterUnit, 'id'>;
  }[];
  invalidItems: {
    rowNumber: number;
    raw: string;
    reason: string;
  }[];
  validItems: Omit<MasterUnit, 'id'>[];
}
