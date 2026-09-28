import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Inspection, Rating } from '../types/inspection';
import { RatingBadge } from './RatingBadge';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  X,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Search,
  Calendar,
  Check,
  ChevronDown,
  Truck,
  Layers,
  Cpu,
  Award,
  RotateCcw,
} from 'lucide-react';
import { parseDate, isDateInRange, normalizeRating } from '../utils/calculations';
import { exportInspectionsToExcel } from '../utils/excelExport';

interface InspectionTableProps {
  inspections: Inspection[];
  isLoading?: boolean;
  onViewDetail?: (inspection: Inspection) => void;
  onEditInspection?: (inspection: Inspection) => void;
  onDeleteInspection?: (inspection: Inspection) => void;
  title?: string;
}

type SortField = 'date' | 'unitId' | 'program' | 'rating';
type SortDirection = 'asc' | 'desc';

interface SearchableFilterDropdownProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  icon: React.ReactNode;
  placeholder?: string;
  displayMap?: Record<string, string>;
}

const SearchableFilterDropdown: React.FC<SearchableFilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  icon,
  placeholder = 'Cari...',
  displayMap,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const disp = displayMap ? displayMap[opt] || opt : opt;
      return opt.toLowerCase().includes(term) || disp.toLowerCase().includes(term);
    });
  }, [options, searchTerm, displayMap]);

  const isActive = value !== 'ALL';
  const displayValue = value === 'ALL' ? 'Semua' : displayMap ? displayMap[value] || value : value;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
        }`}
      >
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <span className="font-semibold text-slate-500 dark:text-slate-400">{label}:</span>
        <span className="font-bold max-w-[110px] truncate text-slate-800 dark:text-slate-200">{displayValue}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
          {/* Filter Search Box inside Dropdown */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onChange('ALL');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                value === 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Semua {label}</span>
              {value === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                Hasil "{searchTerm}" tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt;
                const optDisplay = displayMap ? displayMap[opt] || opt : opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate pr-2">{optDisplay}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const InspectionTable: React.FC<InspectionTableProps> = ({
  inspections,
  isLoading = false,
  onViewDetail,
  onEditInspection,
  onDeleteInspection,
  title = 'Latest Live Inspections',
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isFullsize, setIsFullsize] = useState<boolean>(false);
  const pageSize = isFullsize ? 15 : 10;

  // Filter States
  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [programFilter, setProgramFilter] = useState<string>('ALL');
  const [componentFilter, setComponentFilter] = useState<string>('ALL');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [unitFilter, programFilter, componentFilter, ratingFilter, startDateFilter, endDateFilter, globalSearch]);

  // Unique options derived from current dataset
  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((item) => {
      if (item.unitId?.trim()) set.add(item.unitId.trim());
    });
    return Array.from(set).sort();
  }, [inspections]);

  const uniquePrograms = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((item) => {
      if (item.program?.trim()) set.add(item.program.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [inspections]);

  const uniqueComponents = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((item) => {
      if (item.component?.trim()) set.add(item.component.trim());
    });
    return Array.from(set).sort();
  }, [inspections]);

  const ratingOptions = ['ALL', 'A', 'B', 'C', 'X'];
  const ratingDisplayMap: Record<string, string> = {
    A: 'A - Normal',
    B: 'B - Caution',
    C: 'C - Critical',
    X: 'X - Severe',
  };

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      // 1. Unit ID Filter
      if (unitFilter !== 'ALL') {
        if ((item.unitId || '').trim().toUpperCase() !== unitFilter.trim().toUpperCase()) {
          return false;
        }
      }

      // 2. Program Filter
      if (programFilter !== 'ALL') {
        if ((item.program || '').trim().toUpperCase() !== programFilter.trim().toUpperCase()) {
          return false;
        }
      }

      // 3. Component Filter
      if (componentFilter !== 'ALL') {
        if ((item.component || '').trim().toLowerCase() !== componentFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 4. Rating Filter
      if (ratingFilter !== 'ALL') {
        const norm = normalizeRating(item.rating);
        if (norm !== ratingFilter) {
          return false;
        }
      }

      // 5. Date Range Filter
      if (startDateFilter || endDateFilter) {
        if (!isDateInRange(item.date, startDateFilter, endDateFilter)) {
          return false;
        }
      }

      // 6. Global Search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase().trim();
        const mUnit = (item.unitId || '').toLowerCase().includes(q);
        const mModel = (item.model || '').toLowerCase().includes(q);
        const mProg = (item.program || '').toLowerCase().includes(q);
        const mComp = (item.component || '').toLowerCase().includes(q);
        const mSys = (item.system || '').toLowerCase().includes(q);
        const mFind = (item.findings || '').toLowerCase().includes(q);
        const mRec = (item.recommendation || '').toLowerCase().includes(q);
        const mInsp = (item.inspector || '').toLowerCase().includes(q);
        const mRating = (item.rating || '').toLowerCase().includes(q);
        const mHm = (item.hoursMeter || '').toString().toLowerCase().includes(q);

        if (!mUnit && !mModel && !mProg && !mComp && !mSys && !mFind && !mRec && !mInsp && !mRating && !mHm) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, unitFilter, programFilter, componentFilter, ratingFilter, startDateFilter, endDateFilter, globalSearch]);

  const hasActiveFilters =
    unitFilter !== 'ALL' ||
    programFilter !== 'ALL' ||
    componentFilter !== 'ALL' ||
    ratingFilter !== 'ALL' ||
    Boolean(startDateFilter) ||
    Boolean(endDateFilter) ||
    Boolean(globalSearch.trim());

  const resetAllFilters = () => {
    setUnitFilter('ALL');
    setProgramFilter('ALL');
    setComponentFilter('ALL');
    setRatingFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
    setGlobalSearch('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  // Sort filtered inspections
  const sortedInspections = useMemo(() => {
    return [...filteredInspections].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        const dateA = parseDate(a.date)?.getTime() || 0;
        const dateB = parseDate(b.date)?.getTime() || 0;
        comparison = dateA - dateB;
      } else if (sortField === 'unitId') {
        comparison = a.unitId.localeCompare(b.unitId);
      } else if (sortField === 'program') {
        comparison = a.program.localeCompare(b.program);
      } else if (sortField === 'rating') {
        const rank: Record<string, number> = { A: 1, B: 2, C: 3, X: 4 };
        comparison = (rank[a.rating] || 0) - (rank[b.rating] || 0);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredInspections, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedInspections.length / pageSize));
  const paginatedInspections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedInspections.slice(start, start + pageSize);
  }, [sortedInspections, currentPage, pageSize]);

  const tableContent = (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col ${isFullsize ? 'h-full max-h-[90vh]' : ''}`}>
      {/* Table Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Real-time filter & synchronized database records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportInspectionsToExcel(filteredInspections, title)}
            title="Download Data Tabel ini ke File Excel (.xlsx)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Tampil: {filteredInspections.length} / {inspections.length} Record
          </span>

          {/* Fullsize button */}
          <button
            onClick={() => setIsFullsize(!isFullsize)}
            title={isFullsize ? 'Tutup Fullsize' : 'Mode Tabel Fullsize'}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            {isFullsize ? (
              <Minimize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive Search & Filter Toolbar Bar */}
      <div className="p-3.5 bg-slate-50/90 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2 shrink-0">
        {/* Global Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Cari kata kunci / unit / findings..."
            className="w-full pl-8 pr-7 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-blue-500 shadow-2xs"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 1. Searchable Unit Filter */}
        <SearchableFilterDropdown
          label="Unit"
          value={unitFilter}
          onChange={setUnitFilter}
          options={uniqueUnits}
          icon={<Truck className="w-3.5 h-3.5" />}
          placeholder="Cari kode unit..."
        />

        {/* 2. Searchable Program Filter */}
        <SearchableFilterDropdown
          label="Program"
          value={programFilter}
          onChange={setProgramFilter}
          options={uniquePrograms}
          icon={<Layers className="w-3.5 h-3.5" />}
          placeholder="Cari program (PPM/PPE...)"
        />

        {/* 3. Searchable Component Filter */}
        <SearchableFilterDropdown
          label="Komponen"
          value={componentFilter}
          onChange={setComponentFilter}
          options={uniqueComponents}
          icon={<Cpu className="w-3.5 h-3.5" />}
          placeholder="Cari nama komponen..."
        />

        {/* 4. Searchable Rating Filter */}
        <SearchableFilterDropdown
          label="Rating"
          value={ratingFilter}
          onChange={setRatingFilter}
          options={ratingOptions}
          icon={<Award className="w-3.5 h-3.5" />}
          placeholder="Cari rating (A/B/C/X)..."
          displayMap={ratingDisplayMap}
        />

        {/* 5. Date Range Filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-xs">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Tgl:</span>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="bg-transparent border-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            title="Tanggal Mulai"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="bg-transparent border-none text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            title="Tanggal Selesai"
          />
          {(startDateFilter || endDateFilter) && (
            <button
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
              title="Hapus Filter Tanggal"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Reset All Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Reset semua filter"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto flex-1 min-h-[300px]">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
              <th
                onClick={() => handleSort('date')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>DATE</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('unitId')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>UNIT ID</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('program')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>PROGRAM</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-4 whitespace-nowrap">COMPONENT / SYSTEM</th>
              <th className="py-3 px-4 min-w-[200px]">FINDINGS</th>
              <th className="py-3 px-4 min-w-[180px]">RECOMMENDATION</th>

              <th
                onClick={() => handleSort('rating')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>RATING</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3 text-center whitespace-nowrap">ACTION</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skel-${index}`} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16" /></td>
                  <td className="py-3.5 px-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40" /></td>
                  <td className="py-3.5 px-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20" /></td>
                  <td className="py-3.5 px-3"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-8 mx-auto" /></td>
                </tr>
              ))
            ) : paginatedInspections.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      Tidak ada data inspeksi yang cocok
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                      Coba sesuaikan atau atur ulang kombinasi pencarian dan filter Anda.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetAllFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Semua Filter</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedInspections.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
                  onClick={() => onViewDetail && onViewDetail(row)}
                >
                  {/* Date */}
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {row.date}
                  </td>

                  {/* Unit ID */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {row.unitId}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {row.model && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {row.model}
                          </span>
                        )}
                        {row.hoursMeter && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.2 rounded border border-blue-200 dark:border-blue-900/60">
                            HM: {Number(row.hoursMeter).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Program */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {row.program}
                    </span>
                  </td>

                  {/* Component */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {row.component}
                      </span>
                      {row.system && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {row.system}
                        </span>
                      )}
                      {row.imageUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-1.5 py-0.5 rounded mt-1 self-start">
                          <ImageIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Photo
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Findings */}
                  <td className="py-3 px-4 max-w-[280px]">
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {row.findings}
                    </p>
                  </td>

                  {/* Recommendation */}
                  <td className="py-3 px-4 max-w-[240px]">
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {row.recommendation}
                    </p>
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <RatingBadge rating={row.rating} />
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {onViewDetail && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(row);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Detail Inspeksi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {onEditInspection && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditInspection(row);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Data Inspeksi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteInspection && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteInspection(row);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Data Inspeksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 shrink-0">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {sortedInspections.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {Math.min(currentPage * pageSize, sortedInspections.length)}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {sortedInspections.length}
          </span>{' '}
          records
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || sortedInspections.length === 0}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-medium text-slate-700 dark:text-slate-200">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || sortedInspections.length === 0}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (isFullsize) {
    return (
      <>
        {/* Placeholder in regular flow */}
        <div className="p-4 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20 text-center text-xs text-blue-600 dark:text-blue-400 font-medium">
          Tabel sedang ditampilkan dalam mode Fullsize.
        </div>

        {/* Modal Overlay for Fullsize Table */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-7xl h-full flex flex-col">
            {tableContent}
          </div>
        </div>
      </>
    );
  }

  return tableContent;
};
