import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { Zap } from 'lucide-react';

interface PPEProps {
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

export const PPE: React.FC<PPEProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="PPE"
      title="Program Elektrik (PPE)"
      description="Electrical harness Condition, Battery Health, Worklamps Condition, & All of Electrical System"
      icon={Zap}
    />
  );
};
export default PPE;
