import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { FlaskConical } from 'lucide-react';

interface PAPProps {
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

export const PAP: React.FC<PAPProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="PAP"
      title="Program Analisa Pelumas (PAP)"
      description="Oil sampling spectrometry (Fe, Cu, Pb, Si), viscosity, soot content, TAN/TBN, and water dilution."
      icon={FlaskConical}
    />
  );
};
export default PAP;
