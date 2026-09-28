import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { Layers } from 'lucide-react';

interface PPUProps {
  inspections: Inspection[];
  selectedModel: string;
  selectedRating: string;
  searchQuery: string;
  isLoading: boolean;
  onViewDetail: (item: Inspection) => void;
  onEditInspection?: (item: Inspection) => void;
  onDeleteInspection?: (item: Inspection) => void;
  onOpenNewInspection: (program: ProgramType) => void;
}

export const PPU: React.FC<PPUProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="PPU"
      title="Pemeriksaan Undercarriage (PPU)"
      description="Track link pitch elongation, track shoe wear, idler flange, carrier rollers, and sprocket teeth."
      icon={Layers}
    />
  );
};
export default PPU;
