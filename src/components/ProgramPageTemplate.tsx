import React, { useMemo } from 'react';
import { Inspection, ProgramType, DashboardStats } from '../types/inspection';
import { StatCard } from './StatCard';
import { InspectionTrendChart } from './InspectionTrendChart';
import { SeverityDistributionChart } from './SeverityDistributionChart';
import { InspectionTable } from './InspectionTable';
import {
  calculateDashboardStats,
  calculateTrendData,
  calculateSeverityDistribution,
  normalizeRating,
} from '../utils/calculations';
import {
  Truck,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Flame,
  Clock,
  Plus,
} from 'lucide-react';

interface ProgramPageTemplateProps {
  program: ProgramType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
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

export const ProgramPageTemplate: React.FC<ProgramPageTemplateProps> = ({
  program,
  title,
  description,
  icon: Icon,
  inspections,
  selectedModel,
  selectedRating,
  searchQuery,
  isLoading,
  onViewDetail,
  onEditInspection,
  onDeleteInspection,
  onOpenNewInspection,
}) => {
  // Automatically filter to this program first
  const programInspections = useMemo(() => {
    return inspections.filter((i) => i.program === program);
  }, [inspections, program]);

  // Apply user filters
  const filteredInspections = useMemo(() => {
    return programInspections.filter((item) => {
      if (selectedModel !== 'ALL') {
        const sLower = selectedModel.toLowerCase().trim();
        const itemLower = (item.model || '').toLowerCase().trim();
        if (itemLower !== sLower && !itemLower.includes(sLower) && !sLower.includes(itemLower)) {
          return false;
        }
      }
      if (selectedRating !== 'ALL') {
        if (normalizeRating(item.rating) !== selectedRating) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchableText = `${item.unitId} ${item.model} ${item.component} ${item.system} ${item.findings} ${item.recommendation} ${item.inspector}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [programInspections, selectedModel, selectedRating, searchQuery]);

  // Program-specific statistics
  const stats: DashboardStats = useMemo(() => {
    return calculateDashboardStats(filteredInspections);
  }, [filteredInspections]);

  const trendData = useMemo(() => {
    return calculateTrendData(filteredInspections);
  }, [filteredInspections]);

  const severityData = useMemo(() => {
    return calculateSeverityDistribution(filteredInspections);
  }, [filteredInspections]);

  return (
    <div className="space-y-6">
      {/* Program Summary Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 shrink-0 font-bold">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {program}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>

        <button
          onClick={() => onOpenNewInspection(program)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-black text-slate-950 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-lg shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>New {program} Inspection</span>
        </button>
      </div>

      {/* Program Statistics Row - 7 Key Cards */}
      <section aria-label="Program Key Performance Indicators" className="w-full min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5 w-full min-w-0">
          <StatCard label="TOTAL UNITS" value={stats.totalUnits} description="Fleet Machinery" icon={Truck} variant="default" isLoading={isLoading} />
          <StatCard label="INSPECTIONS" value={stats.totalInspections} description="Program Logs" icon={ClipboardList} variant="info" isLoading={isLoading} />
          <StatCard label="NORMAL (A)" value={stats.normalA} description="Safe Condition" icon={CheckCircle} variant="normal" isLoading={isLoading} />
          <StatCard label="CAUTION (B)" value={stats.cautionB} description="Monitor Closely" icon={AlertTriangle} variant="caution" isLoading={isLoading} />
          <StatCard label="CRITICAL (C)" value={stats.criticalC} description="Urgent Action" icon={AlertOctagon} variant="critical" isLoading={isLoading} />
          <StatCard label="SEVERE (X)" value={stats.severeX} description="High Risk" icon={Flame} variant="severe" isLoading={isLoading} />
          <StatCard label="OPEN FOLLOW UP" value={stats.openFollowUp} description="Active Actions" icon={Clock} variant="info" isLoading={isLoading} />
        </div>
      </section>

      {/* Program Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InspectionTrendChart data={trendData} isLoading={isLoading} />
        <SeverityDistributionChart data={severityData} isLoading={isLoading} />
      </div>

      {/* Program Inspection Table */}
      <InspectionTable
        inspections={filteredInspections}
        isLoading={isLoading}
        onViewDetail={onViewDetail}
        onEditInspection={onEditInspection}
        onDeleteInspection={onDeleteInspection}
        title={`${title} - Records`}
      />
    </div>
  );
};
