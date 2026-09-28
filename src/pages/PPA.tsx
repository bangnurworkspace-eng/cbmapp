import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { Boxes } from 'lucide-react';

interface PPAProps {
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

export const PPA: React.FC<PPAProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="PPA"
      title="Pemeriksaan Attachment (PPA)"
      description="Ground Engaging Tools (GET), bucket lip wear, pin and bushing clearance, cracks, and structural welds."
      icon={Boxes}
    />
  );
};
export default PPA;
