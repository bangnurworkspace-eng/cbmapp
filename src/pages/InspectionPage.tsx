import React, { useState, useMemo } from 'react';
import { Inspection, ProgramType, Rating } from '../types/inspection';
import { InspectionTable } from '../components/InspectionTable';
import { RatingBadge } from '../components/RatingBadge';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Flame,
  Truck,
  Image as ImageIcon,
} from 'lucide-react';
import { normalizeRating } from '../utils/calculations';

interface InspectionPageProps {
  inspections: Inspection[];
  selectedModel: string;
  selectedRating: string;
  selectedComponent?: string;
  searchQuery: string;
  isLoading: boolean;
  onViewDetail: (item: Inspection) => void;
  onEditInspection?: (item: Inspection) => void;
  onDeleteInspection?: (item: Inspection) => void;
  onOpenNewInspection: (presetProg?: ProgramType) => void;
}

export const InspectionPage: React.FC<InspectionPageProps> = ({
  inspections,
  selectedModel,
  selectedRating,
  selectedComponent = 'ALL',
  searchQuery,
  isLoading,
  onViewDetail,
  onEditInspection,
  onDeleteInspection,
  onOpenNewInspection,
}) => {
  const [activeProgram, setActiveProgram] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filtered dataset
  const filteredList = useMemo(() => {
    return inspections.filter((item) => {
      // Program filter
      if (activeProgram !== 'ALL' && item.program !== activeProgram) {
        return false;
      }

      // Global or local Model filter
      if (selectedModel !== 'ALL') {
        const sLower = selectedModel.toLowerCase().trim();
        const itemLower = (item.model || '').toLowerCase().trim();
        if (itemLower !== sLower && !itemLower.includes(sLower) && !sLower.includes(itemLower)) {
          return false;
        }
      }

      // Global Condition filter
      if (selectedRating !== 'ALL') {
        if (normalizeRating(item.rating) !== selectedRating) {
          return false;
        }
      }

      // Component filter
      if (selectedComponent && selectedComponent !== 'ALL') {
        const cLower = selectedComponent.toLowerCase().trim();
        const itemComp = (item.component || '').toLowerCase().trim();
        const itemSys = (item.system || '').toLowerCase().trim();
        if (itemComp !== cLower && !itemComp.includes(cLower) && !itemSys.includes(cLower)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const itemStatus = (item.followUpStatus || item.status || '').toUpperCase();
        if (statusFilter === 'OPEN' && itemStatus.includes('CLOSE')) return false;
        if (statusFilter === 'CLOSED' && !itemStatus.includes('CLOSE')) return false;
      }

      // Search Query
      const query = (localSearch || searchQuery).toLowerCase().trim();
      if (query) {
        const searchable = `${item.id} ${item.unitId} ${item.model} ${item.component} ${item.system || ''} ${item.findings} ${item.recommendation} ${item.inspector}`.toLowerCase();
        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, activeProgram, selectedModel, selectedRating, selectedComponent, statusFilter, localSearch, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let a = 0, b = 0, c = 0, x = 0;
    filteredList.forEach((i) => {
      const r = normalizeRating(i.rating);
      if (r === 'A') a++;
      else if (r === 'B') b++;
      else if (r === 'C') c++;
      else if (r === 'X') x++;
    });
    return {
      total: filteredList.length,
      normalA: a,
      cautionB: b,
      criticalC: c,
      severeX: x,
    };
  }, [filteredList]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = [
      'ID',
      'Date',
      'Unit ID',
      'Model',
      'Program',
      'Component',
      'Findings',
      'Recommendation',
      'Rating',
      'Status',
      'Inspector',
      'Follow Up',
      'Follow Up Status',
      'Due Date',
    ];
    const rows = filteredList.map((i) => [
      `"${i.id}"`,
      `"${i.date}"`,
      `"${i.unitId}"`,
      `"${i.model}"`,
      `"${i.program}"`,
      `"${i.component}"`,
      `"${i.findings.replace(/"/g, '""')}"`,
      `"${i.recommendation.replace(/"/g, '""')}"`,
      `"${i.rating}"`,
      `"${i.status}"`,
      `"${i.inspector}"`,
      `"${i.followUp.replace(/"/g, '""')}"`,
      `"${i.followUpStatus}"`,
      `"${i.dueDate}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CBM_Inspections_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const programOptions: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Programs' },
    { id: 'PPM', label: 'PPM (Mesin)' },
    { id: 'PPE', label: 'PPE (Elektrik)' },
    { id: 'FC', label: 'FC (Filter)' },
    { id: 'MP', label: 'MP (Magnetic)' },
    { id: 'CR', label: 'CR (Cylinder)' },
    { id: 'PAP', label: 'PAP (Pelumas)' },
    { id: 'PPA', label: 'PPA (Attachment)' },
    { id: 'PPU', label: 'PPU (Undercarriage)' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Inspection Registry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live records synced directly with database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onOpenNewInspection()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Inspection</span>
          </button>
        </div>
      </div>

      {/* Program Tab Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {programOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActiveProgram(opt.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeProgram === opt.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Status KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
            Total Shown
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {stats.total}
          </p>
        </div>

        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Normal (A)
          </span>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
            {stats.normalA}
          </p>
        </div>

        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Caution (B)
          </span>
          <p className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-0.5">
            {stats.cautionB}
          </p>
        </div>

        <div className="p-3 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 uppercase flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" />
            Critical (C)
          </span>
          <p className="text-xl font-bold text-orange-800 dark:text-orange-300 mt-0.5">
            {stats.criticalC}
          </p>
        </div>

        <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Severe (X)
          </span>
          <p className="text-xl font-bold text-rose-800 dark:text-rose-300 mt-0.5">
            {stats.severeX}
          </p>
        </div>
      </div>

      {/* Main Inspection Table */}
      <InspectionTable
        inspections={filteredList}
        isLoading={isLoading}
        onViewDetail={onViewDetail}
        onEditInspection={onEditInspection}
        onDeleteInspection={onDeleteInspection}
        title="Inspection Records"
      />
    </div>
  );
};
