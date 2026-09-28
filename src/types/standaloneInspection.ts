export type StandaloneInspectionStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type StandaloneInspectionPriority = 'P1' | 'P2' | 'P3';

export interface StandaloneInspectionItem {
  id: string;
  unitId: string;              // UNIT ID
  unitModel?: string;          // Unit Model (Auto-filled from Master Units)
  date: string;                // DATE (Tanggal Inspeksi)
  findings: string;            // Findings (Temuan)
  findingsImage?: string;      // Gambar Temuan (Base64 string or image URL)
  inspector: string;           // Inspector (Nama Inspektor)
  status: StandaloneInspectionStatus; // Status (OPEN, IN_PROGRESS, CLOSED)
  priority: StandaloneInspectionPriority; // Priority (P1, P2, P3)
  notes?: string;              // Catatan Tambahan

  // Action Close Fields (Wajib diisi jika status = CLOSED)
  actionBy?: string;           // ACTION BY
  actionDate?: string;         // TANGGAL ACTION
  actionDetails?: string;      // KEGIATAN YANG DI ACTION
  actionImage?: string;        // GAMBAR YANG DI ACTION (Base64 or URL)

  createdAt: string;
  updatedAt: string;
}

export interface StandaloneInspectionStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
}
