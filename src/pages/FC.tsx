import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { Filter } from 'lucide-react';

interface FCProps {
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

export const FC: React.FC<FCProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="FC"
      title="Filter Cutting (FC)"
      description="Microscopic and physical debris dissection on engine, transmission, and hydraulic filters."
      icon={Filter}
    />
  );
};
export default FC;
