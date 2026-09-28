import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { Cog } from 'lucide-react';

interface PPMProps {
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

export const PPM: React.FC<PPMProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="PPM"
      title="Program Mesin (PPM)"
      description="Engine condition monitoring, cooling systems, oil leaks, and combustion performance."
      icon={Cog}
    />
  );
};
export default PPM;
