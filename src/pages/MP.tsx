import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { Magnet } from 'lucide-react';

interface MPProps {
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

export const MP: React.FC<MPProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="MP"
      title="Magnetic Plug (MP)"
      description="Magnetic particle inspection on differential, final drive, and wheel hub drain plugs."
      icon={Magnet}
    />
  );
};
export default MP;
