import { ProgramType, Rating } from './inspection';

export type ComponentCategory =
  | 'Engine'
  | 'Hydraulic'
  | 'Powertrain'
  | 'Electrical'
  | 'Undercarriage'
  | 'Attachment'
  | 'Cooling'
  | 'Structure';

export type CriticalityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MasterComponent {
  id: string; // e.g. "CMP-ENG-001"
  name: string; // e.g. "Engine Turbocharger"
  category: ComponentCategory;
  imageUrl?: string; // photo or illustration of component
  applicablePrograms?: ProgramType[];
  applicableModels?: string[];
  standardIntervalHours?: number; // e.g. 250, 500, 1000
  targetLifeHours?: number; // e.g. 12000
  criticalityLevel?: CriticalityLevel;
  description?: string;
  createdAt?: string;
}

export type EquipmentType =
  | 'Dump Truck'
  | 'Hydraulic Excavator'
  | 'Track Dozer'
  | 'Wheel Loader'
  | 'Motor Grader'
  | 'Support Truck'
  | 'Drill Rig';

export interface MasterModel {
  id: string; // e.g. "MDL-001"
  unitId?: string; // e.g. "DT-777" (Unit ID*)
  modelName: string; // e.g. "CAT 777D" (Nama Model Unit)
  brand: string; // e.g. "Caterpillar" (Manufactur)
  section?: string; // e.g. "Hauling", "Loading", "Pit Support" (Section)
  equipmentType?: EquipmentType;
  imageUrl?: string;
  unitIds?: string[]; // e.g. ["DT-777"]
  ratedPayloadOrCapacity?: string;
  engineSpec?: string;
  operatingWeight?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}
