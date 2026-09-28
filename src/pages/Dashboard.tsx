import React, { useState, useMemo, useCallback } from 'react';
import { Inspection, DashboardStats, TrendDataPoint, SeverityDistributionItem } from '../types/inspection';
import { StatCard } from '../components/StatCard';
import { InspectionTrendChart } from '../components/InspectionTrendChart';
import { SeverityDistributionChart } from '../components/SeverityDistributionChart';
import { InspectionTable } from '../components/InspectionTable';
import { PageId } from '../components/Sidebar';
import { getMasterUnits } from '../services/masterUnitService';
import {
  calculateDashboardStats,
  calculateTrendData,
  calculateSeverityDistribution,
  normalizeRating,
  isDateInRange,
} from '../utils/calculations';
import {
  Truck,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Flame,
  Clock,
  Cpu,
  Filter,
  SlidersHorizontal,
  Layers,
  ChevronDown,
  Calendar,
  X,
  RotateCcw,
} from 'lucide-react';

interface DashboardProps {
  inspections: Inspection[];
  selectedModel: string;
  selectedRating: string;
  selectedComponent?: string;
  searchQuery: string;
  isLoading: boolean;
  onViewDetail: (item: Inspection) => void;
  onOpenNewInspection: () => void;
  onNavigateToPage?: (page: PageId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  inspections,
  selectedModel,
  selectedRating,
  selectedComponent = 'ALL',
  searchQuery,
  isLoading,
  onViewDetail,
  onOpenNewInspection,
  onNavigateToPage,
}) => {
  // Apply filters to inspections (Model, Condition Rating, Component, Search)
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      // Model filter with flexible substring match
      if (selectedModel !== 'ALL') {
        const sLower = selectedModel.toLowerCase().trim();
        const itemLower = (item.model || '').toLowerCase().trim();
        if (itemLower !== sLower && !itemLower.includes(sLower) && !sLower.includes(itemLower)) {
          return false;
        }
      }

      // Condition filter
      if (selectedRating !== 'ALL') {
        const itemRating = normalizeRating(item.rating);
        if (itemRating !== selectedRating) {
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

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchableText = `${item.unitId} ${item.model} ${item.program} ${item.component} ${item.system} ${item.findings} ${item.recommendation} ${item.inspector}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, selectedModel, selectedRating, selectedComponent, searchQuery]);

  // Dynamic statistics calculated strictly from the filtered dataset
  const stats: DashboardStats = useMemo(() => {
    return calculateDashboardStats(filteredInspections);
  }, [filteredInspections]);

  // 1. Trend Chart Filter States (Unit, Model, Section, Date Range)
  const [trendUnitFilter, setTrendUnitFilter] = useState<string>('ALL');
  const [trendModelFilter, setTrendModelFilter] = useState<string>('ALL');
  const [trendSectionFilter, setTrendSectionFilter] = useState<string>('ALL');
  const [trendStartDate, setTrendStartDate] = useState<string>('');
  const [trendEndDate, setTrendEndDate] = useState<string>('');

  // 2. Severity Distribution Chart Filter States (Unit, Model, Section, Date Range)
  const [sevUnitFilter, setSevUnitFilter] = useState<string>('ALL');
  const [sevModelFilter, setSevModelFilter] = useState<string>('ALL');
  const [sevSectionFilter, setSevSectionFilter] = useState<string>('ALL');
  const [sevStartDate, setSevStartDate] = useState<string>('');
  const [sevEndDate, setSevEndDate] = useState<string>('');

  // 3. Top Popular Component Filter States (Section, Unit, Rating, Date Range, Rank Range)
  const [popSectionFilter, setPopSectionFilter] = useState<string>('ALL');
  const [popUnitFilter, setPopUnitFilter] = useState<string>('ALL');
  const [popRatingFilter, setPopRatingFilter] = useState<string>('ALL');
  const [popStartDate, setPopStartDate] = useState<string>('');
  const [popEndDate, setPopEndDate] = useState<string>('');
  const [rankStart, setRankStart] = useState<number>(1);
  const [rankEnd, setRankEnd] = useState<number>(5);

  // Master Units & Section Lookup
  const masterUnits = useMemo(() => getMasterUnits(), []);

  const unitSectionMap = useMemo(() => {
    const map = new Map<string, string>();
    masterUnits.forEach((u) => {
      if (u.unitCode && u.section) {
        map.set(u.unitCode.toUpperCase().trim(), u.section.trim());
      }
    });
    return map;
  }, [masterUnits]);

  // Unique Sections available in Master Units or Inspections
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    masterUnits.forEach((u) => {
      if (u.section?.trim()) set.add(u.section.trim());
    });
    return Array.from(set).sort();
  }, [masterUnits]);

  // Unique Units available in Inspections
  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((item) => {
      if (item.unitId?.trim()) set.add(item.unitId.trim());
    });
    return Array.from(set).sort();
  }, [inspections]);

  // Unique Models available in Inspections
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((item) => {
      if (item.model?.trim()) set.add(item.model.trim());
    });
    return Array.from(set).sort();
  }, [inspections]);

  // Helper Function: Filter Inspections by Criteria (Unit, Model, Section, Date Range)
  const filterByCriteria = useCallback((
    source: Inspection[],
    unit: string,
    model: string,
    section: string,
    startDate: string,
    endDate: string
  ) => {
    return source.filter((item) => {
      // Unit filter
      if (unit !== 'ALL') {
        if ((item.unitId || '').trim().toUpperCase() !== unit.trim().toUpperCase()) {
          return false;
        }
      }

      // Model filter
      if (model !== 'ALL') {
        const mLower = model.toLowerCase().trim();
        const itemModel = (item.model || '').toLowerCase().trim();
        if (itemModel !== mLower && !itemModel.includes(mLower) && !mLower.includes(itemModel)) {
          return false;
        }
      }

      // Section filter
      if (section !== 'ALL') {
        const itemUnitCode = (item.unitId || '').toUpperCase().trim();
        const mappedSection = unitSectionMap.get(itemUnitCode) || item.program || '';
        if (mappedSection.toLowerCase().trim() !== section.toLowerCase().trim()) {
          return false;
        }
      }

      // Date Range filter
      if (startDate || endDate) {
        if (!isDateInRange(item.date, startDate, endDate)) {
          return false;
        }
      }

      return true;
    });
  }, [unitSectionMap]);

  // Dynamic Trend Data (Filtered by trend filters)
  const trendInspections = useMemo(() => {
    return filterByCriteria(
      filteredInspections,
      trendUnitFilter,
      trendModelFilter,
      trendSectionFilter,
      trendStartDate,
      trendEndDate
    );
  }, [filteredInspections, trendUnitFilter, trendModelFilter, trendSectionFilter, trendStartDate, trendEndDate, filterByCriteria]);

  const trendData: TrendDataPoint[] = useMemo(() => {
    return calculateTrendData(trendInspections);
  }, [trendInspections]);

  // Dynamic Severity Data (Filtered by severity filters)
  const severityInspections = useMemo(() => {
    return filterByCriteria(
      filteredInspections,
      sevUnitFilter,
      sevModelFilter,
      sevSectionFilter,
      sevStartDate,
      sevEndDate
    );
  }, [filteredInspections, sevUnitFilter, sevModelFilter, sevSectionFilter, sevStartDate, sevEndDate, filterByCriteria]);

  const severityData: SeverityDistributionItem[] = useMemo(() => {
    return calculateSeverityDistribution(severityInspections);
  }, [severityInspections]);

  // Filtered & Ranked Popular Components
  const { popularComponents, totalPopularCount, availableComponentsCount } = useMemo(() => {
    // 1. Filter inspections based on popular component filters (Section, Unit, Rating, Date Range)
    const matchingInspections = filteredInspections.filter((item) => {
      // Section Filter
      if (popSectionFilter !== 'ALL') {
        const itemUnitCode = (item.unitId || '').toUpperCase().trim();
        const mappedSection = unitSectionMap.get(itemUnitCode) || item.program || '';
        if (mappedSection.toLowerCase() !== popSectionFilter.toLowerCase()) {
          return false;
        }
      }

      // Unit Filter
      if (popUnitFilter !== 'ALL') {
        if ((item.unitId || '').trim().toUpperCase() !== popUnitFilter.trim().toUpperCase()) {
          return false;
        }
      }

      // Rating Filter
      if (popRatingFilter !== 'ALL') {
        const r = normalizeRating(item.rating);
        if (r !== popRatingFilter) {
          return false;
        }
      }

      // Date Range Filter
      if (popStartDate || popEndDate) {
        if (!isDateInRange(item.date, popStartDate, popEndDate)) {
          return false;
        }
      }

      return true;
    });

    // 2. Group by Component
    const counts: Record<string, { count: number; ratings: { A: number; B: number; C: number; X: number } }> = {};
    matchingInspections.forEach((item) => {
      const comp = item.component?.trim() || 'General Component';
      if (!counts[comp]) {
        counts[comp] = { count: 0, ratings: { A: 0, B: 0, C: 0, X: 0 } };
      }
      counts[comp].count += 1;
      const r = normalizeRating(item.rating);
      counts[comp].ratings[r] += 1;
    });

    const allSorted = Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const startIdx = Math.max(0, rankStart - 1);
    const endIdx = Math.max(startIdx + 1, rankEnd);
    const sliced = allSorted.slice(startIdx, endIdx);

    return {
      popularComponents: sliced,
      totalPopularCount: matchingInspections.length,
      availableComponentsCount: allSorted.length,
    };
  }, [filteredInspections, popSectionFilter, popUnitFilter, popRatingFilter, popStartDate, popEndDate, rankStart, rankEnd, unitSectionMap]);

  // Reusable Chart Filter Bar rendering (Unit, Model, Section, Date Range)
  const renderChartFilterBar = (
    unitVal: string,
    setUnit: (v: string) => void,
    modelVal: string,
    setModel: (v: string) => void,
    secVal: string,
    setSec: (v: string) => void,
    startVal: string,
    setStart: (v: string) => void,
    endVal: string,
    setEnd: (v: string) => void,
    onReset: () => void
  ) => {
    const hasActive = unitVal !== 'ALL' || modelVal !== 'ALL' || secVal !== 'ALL' || Boolean(startVal) || Boolean(endVal);

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
        {/* Unit Filter */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Unit:</span>
          <select
            value={unitVal}
            onChange={(e) => setUnit(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer max-w-[110px]"
          >
            <option value="ALL">All Units</option>
            {uniqueUnits.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Model Filter */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Model:</span>
          <select
            value={modelVal}
            onChange={(e) => setModel(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer max-w-[120px]"
          >
            <option value="ALL">All Models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Section:</span>
          <select
            value={secVal}
            onChange={(e) => setSec(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer max-w-[120px]"
          >
            <option value="ALL">All Sections</option>
            {uniqueSections.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-0.5" />
          <input
            type="date"
            value={startVal}
            onChange={(e) => setStart(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 text-[11px] focus:outline-hidden cursor-pointer"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input
            type="date"
            value={endVal}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 text-[11px] focus:outline-hidden cursor-pointer"
          />
        </div>

        {/* Reset Filter Button */}
        {hasActive && (
          <button
            onClick={onReset}
            title="Reset Filter Diagram"
            className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 7 Key Performance Indicators Section */}
      <section aria-label="Key Performance Indicators" className="w-full min-w-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-3.5 w-full min-w-0">
          {/* 1. TOTAL UNITS */}
          <StatCard
            label="TOTAL UNITS"
            value={stats.totalUnits}
            description="Fleet Machinery"
            icon={Truck}
            variant="default"
            isLoading={isLoading}
          />

          {/* 2. INSPECTIONS */}
          <StatCard
            label="INSPECTIONS"
            value={stats.totalInspections}
            description="Total Records"
            icon={ClipboardList}
            variant="info"
            isLoading={isLoading}
          />

          {/* 3. NORMAL (A) */}
          <StatCard
            label="NORMAL (A)"
            value={stats.normalA}
            description="Safe Condition"
            icon={CheckCircle}
            variant="normal"
            isLoading={isLoading}
          />

          {/* 4. CAUTION (B) */}
          <StatCard
            label="CAUTION (B)"
            value={stats.cautionB}
            description="Monitor Closely"
            icon={AlertTriangle}
            variant="caution"
            isLoading={isLoading}
          />

          {/* 5. CRITICAL (C) */}
          <StatCard
            label="CRITICAL (C)"
            value={stats.criticalC}
            description="Urgent Action"
            icon={AlertOctagon}
            variant="critical"
            isLoading={isLoading}
          />

          {/* 6. SEVERE (X) */}
          <StatCard
            label="SEVERE (X)"
            value={stats.severeX}
            description="High Risk"
            icon={Flame}
            variant="severe"
            isLoading={isLoading}
          />

          {/* 7. OPEN FOLLOW UP */}
          <StatCard
            label="OPEN FOLLOW UP"
            value={stats.openFollowUp}
            description="Active Actions"
            icon={Clock}
            variant="info"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Two Large Charts Section */}
      <section aria-label="Visual Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full min-w-0">
        {/* Left: Inspection Trend Analysis */}
        <div className="w-full min-w-0">
          <InspectionTrendChart
            data={trendData}
            isLoading={isLoading}
            filterSlot={renderChartFilterBar(
              trendUnitFilter,
              setTrendUnitFilter,
              trendModelFilter,
              setTrendModelFilter,
              trendSectionFilter,
              setTrendSectionFilter,
              trendStartDate,
              setTrendStartDate,
              trendEndDate,
              setTrendEndDate,
              () => {
                setTrendUnitFilter('ALL');
                setTrendModelFilter('ALL');
                setTrendSectionFilter('ALL');
                setTrendStartDate('');
                setTrendEndDate('');
              }
            )}
          />
        </div>

        {/* Right: Severity Distribution */}
        <div className="w-full min-w-0">
          <SeverityDistributionChart
            data={severityData}
            isLoading={isLoading}
            filterSlot={renderChartFilterBar(
              sevUnitFilter,
              setSevUnitFilter,
              sevModelFilter,
              setSevModelFilter,
              sevSectionFilter,
              setSevSectionFilter,
              sevStartDate,
              setSevStartDate,
              sevEndDate,
              setSevEndDate,
              () => {
                setSevUnitFilter('ALL');
                setSevModelFilter('ALL');
                setSevSectionFilter('ALL');
                setSevStartDate('');
                setSevEndDate('');
              }
            )}
          />
        </div>
      </section>

      {/* Top Populer Component Section with Section, Unit, Condition Rating, and Rank Range Filters */}
      <section aria-label="Top Popular Components" className="w-full min-w-0">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-4 transition-colors">
          
          {/* Card Header & Controls Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-900/60 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Top Populer Component
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                    Rank #{rankStart} - #{rankEnd} ({popularComponents.length} Ditampilkan)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Analisis frekuensi inspeksi komponen berdasarkan section, unit, condition rating, dan peringkat
                </p>
              </div>
            </div>

            {/* Filter Controls Grid */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Filter Section */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-500 dark:text-slate-400 pl-1 shrink-0">Section:</span>
                <select
                  value={popSectionFilter}
                  onChange={(e) => setPopSectionFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Sections</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              {/* Filter Unit */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-500 dark:text-slate-400 pl-1 shrink-0">Unit:</span>
                <select
                  value={popUnitFilter}
                  onChange={(e) => setPopUnitFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer max-w-[130px]"
                >
                  <option value="ALL">All Units</option>
                  {uniqueUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Filter Condition Rating */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-500 dark:text-slate-400 pl-1 shrink-0">Rating:</span>
                <select
                  value={popRatingFilter}
                  onChange={(e) => setPopRatingFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Ratings</option>
                  <option value="A">A - Normal</option>
                  <option value="B">B - Caution</option>
                  <option value="C">C - Critical</option>
                  <option value="X">X - Severe</option>
                </select>
              </div>

              {/* Filter Date Range */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-0.5" />
                <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Tanggal:</span>
                <input
                  type="date"
                  value={popStartDate}
                  onChange={(e) => setPopStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="date"
                  value={popEndDate}
                  onChange={(e) => setPopEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden cursor-pointer"
                />
                {(popStartDate || popEndDate) && (
                  <button
                    onClick={() => { setPopStartDate(''); setPopEndDate(''); }}
                    className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Hapus Filter Tanggal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Tarik Range Populer (Custom Start - End, e.g. 1-3, 1-10) */}
              <div className="flex items-center gap-1 bg-blue-50/80 dark:bg-blue-950/40 p-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ml-1" />
                <span className="font-bold text-blue-900 dark:text-blue-300 shrink-0 px-0.5">Rank:</span>
                
                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  {[
                    { label: '1-3', start: 1, end: 3 },
                    { label: '1-5', start: 1, end: 5 },
                    { label: '1-10', start: 1, end: 10 },
                    { label: '1-15', start: 1, end: 15 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setRankStart(p.start);
                        setRankEnd(p.end);
                      }}
                      className={`px-1.5 py-0.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        rankStart === p.start && rankEnd === p.end
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <span className="text-slate-400 font-bold px-0.5">/</span>

                {/* Custom Number Inputs */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={rankEnd}
                    value={rankStart}
                    onChange={(e) => setRankStart(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-10 px-1 py-0.5 text-center font-bold bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-md text-blue-900 dark:text-blue-200 focus:outline-hidden"
                    title="Peringkat Mulai"
                  />
                  <span className="text-slate-400 font-bold">s/d</span>
                  <input
                    type="number"
                    min={rankStart}
                    max={100}
                    value={rankEnd}
                    onChange={(e) => setRankEnd(Math.max(rankStart, parseInt(e.target.value) || rankStart))}
                    className="w-10 px-1 py-0.5 text-center font-bold bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-md text-blue-900 dark:text-blue-200 focus:outline-hidden"
                    title="Peringkat Akhir"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* List of Popular Components Grid */}
          {popularComponents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Tidak ada data komponen yang cocok dengan kombinasi filter terpilih.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {popularComponents.map((comp, idx) => {
                const actualRank = rankStart + idx;
                const totalInspections = totalPopularCount || 1;
                const percentage = Math.round((comp.count / totalInspections) * 100);
                return (
                  <div key={comp.name} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 shadow-2xs ${
                          actualRank === 1 ? 'bg-amber-500 text-white' :
                          actualRank === 2 ? 'bg-slate-400 text-white' :
                          actualRank === 3 ? 'bg-amber-700 text-white' :
                          'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          #{actualRank}
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={comp.name}>
                          {comp.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/60 shrink-0">
                        {comp.count} Inspeksi
                      </span>
                    </div>

                    {/* Progress Bar & Breakdown */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                        {comp.ratings.A > 0 && (
                          <div style={{ width: `${(comp.ratings.A / comp.count) * 100}%` }} className="bg-emerald-500 h-full" title={`Normal (A): ${comp.ratings.A}`} />
                        )}
                        {comp.ratings.B > 0 && (
                          <div style={{ width: `${(comp.ratings.B / comp.count) * 100}%` }} className="bg-amber-500 h-full" title={`Caution (B): ${comp.ratings.B}`} />
                        )}
                        {comp.ratings.C > 0 && (
                          <div style={{ width: `${(comp.ratings.C / comp.count) * 100}%` }} className="bg-rose-500 h-full" title={`Critical (C): ${comp.ratings.C}`} />
                        )}
                        {comp.ratings.X > 0 && (
                          <div style={{ width: `${(comp.ratings.X / comp.count) * 100}%` }} className="bg-purple-600 h-full" title={`Severe (X): ${comp.ratings.X}`} />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <div className="flex items-center gap-2">
                          {comp.ratings.A > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">A: {comp.ratings.A}</span>}
                          {comp.ratings.B > 0 && <span className="text-amber-600 dark:text-amber-400 font-semibold">B: {comp.ratings.B}</span>}
                          {comp.ratings.C > 0 && <span className="text-rose-600 dark:text-rose-400 font-semibold">C: {comp.ratings.C}</span>}
                          {comp.ratings.X > 0 && <span className="text-purple-600 dark:text-purple-400 font-semibold">X: {comp.ratings.X}</span>}
                        </div>
                        <span className="font-medium">{percentage}% dari total</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Latest Live Inspections Table */}
      <section aria-label="Latest Inspections" className="w-full min-w-0">
        <InspectionTable
          inspections={filteredInspections}
          isLoading={isLoading}
          onViewDetail={onViewDetail}
          title="Latest Live Inspections"
        />
      </section>
    </div>
  );
};
