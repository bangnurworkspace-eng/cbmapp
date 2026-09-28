import React from 'react';
import { ProgramPageTemplate } from '../components/ProgramPageTemplate';
import { Inspection, ProgramType } from '../types/inspection';
import { GitBranch } from 'lucide-react';

interface CRProps {
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

export const CR: React.FC<CRProps> = (props) => {
  return (
    <ProgramPageTemplate
      {...props}
      program="CR"
      title="Cylinder Rating (CR)"
      description="Hydraulic cylinder rod pitting, seal leakage, wiper wear, and drift tests on boom, arm, and bucket."
      icon={GitBranch}
    />
  );
};
export default CR;
