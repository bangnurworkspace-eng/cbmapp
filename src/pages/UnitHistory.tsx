import React, { useState, useMemo } from 'react';
import { Inspection, ProgramType, Rating } from '../types/inspection';
import { RatingBadge } from '../components/RatingBadge';
import { getMasterUnits } from '../services/masterUnitService';
import {
  History,
  Search,
  Truck,
  Filter,
  Wrench,
  Eye,
  Edit3,
  Trash2,
  Download,
  Calendar,
  User,
  ListFilter,
  CheckCircle2,
  Clock,
  Layers,
  LayoutList,
  GitCommit,
  ArrowUpDown,
  XCircle,
  FileText,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { calculateDashboardStats, normalizeRating } from '../utils/calculations';

interface UnitHistoryProps {
  inspections: Inspection[];
  onViewDetail: (item: Inspection) => void;
  onEditInspection?: (item: Inspection) => void;
  onDeleteInspection?: (item: Inspection) => void;
  onOpenNewInspection: (unitId?: string) => void;
}

type ViewMode = 'table' | 'timeline';

export const UnitHistory: React.FC<UnitHistoryProps> = ({
  inspections,
  onViewDetail,
  onEditInspection,
  onDeleteInspection,
  onOpenNewInspection,
}) => {
  // Filter States
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL'); // 'ALL' or specific unit code
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedRating, setSelectedRating] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Master unit list & active unit IDs
  const allUnitIds = useMemo(() => {
    const set = new Set<string>();
    getMasterUnits().forEach((u) => {
      if (u.unitCode) set.add(u.unitCode.trim().toUpperCase());
    });
    inspections.forEach((i) => {
      if (i.unitId) set.add(i.unitId.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [inspections]);

  // Unit unit code counts
  const unitCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    inspections.forEach((i) => {
      if (i.unitId) {
        const code = i.unitId.trim().toUpperCase();
        map.set(code, (map.get(code) || 0) + 1);
      }
    });
    return map;
  }, [inspections]);

  // Filtered Activity / History List
  const filteredInspections = useMemo(() => {
    let list = [...inspections];

    // Filter by Unit
    if (selectedUnit !== 'ALL') {
      list = list.filter(
        (i) => (i.unitId || '').trim().toUpperCase() === selectedUnit.trim().toUpperCase()
      );
    }

    // Filter by Program
    if (selectedProgram !== 'ALL') {
      list = list.filter(
        (i) => (i.program || '').trim().toUpperCase() === selectedProgram.trim().toUpperCase()
      );
    }

    // Filter by Rating
    if (selectedRating !== 'ALL') {
      list = list.filter((i) => normalizeRating(i.rating) === selectedRating);
    }

    // Filter by Follow Up Status
    if (selectedStatus !== 'ALL') {
      list = list.filter((i) => {
        const st = (i.followUpStatus || 'OPEN').trim().toUpperCase();
        return st === selectedStatus;
      });
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.unitId || '').toLowerCase().includes(q) ||
          (i.component || '').toLowerCase().includes(q) ||
          (i.system || '').toLowerCase().includes(q) ||
          (i.findings || '').toLowerCase().includes(q) ||
          (i.recommendation || '').toLowerCase().includes(q) ||
          (i.inspector || '').toLowerCase().includes(q) ||
          (i.program || '').toLowerCase().includes(q) ||
          (i.model || '').toLowerCase().includes(q)
      );
    }

    // Sort by date
    list.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (sortOrder === 'newest') {
        return dateB.localeCompare(dateA);
      } else {
        return dateA.localeCompare(dateB);
      }
    });

    return list;
  }, [
    inspections,
    selectedUnit,
    selectedProgram,
    selectedRating,
    selectedStatus,
    searchQuery,
    sortOrder,
  ]);

  // General or Unit-specific Statistics
  const stats = useMemo(() => {
    return calculateDashboardStats(filteredInspections);
  }, [filteredInspections]);

  // Export filtered items to CSV
  const handleExportCSV = () => {
    if (filteredInspections.length === 0) return;

    const headers = [
      'ID',
      'Tanggal',
      'Unit ID',
      'Model',
      'Hour Meter (HM)',
      'Program CBM',
      'Komponen',
      'Sistem',
      'Temuan (Findings)',
      'Rekomendasi',
      'Rating',
      'Inspektur',
      'Tindak Lanjut (Follow Up)',
      'Status Follow Up',
    ];

    const rows = filteredInspections.map((i) => [
      `"${i.id || ''}"`,
      `"${i.date || ''}"`,
      `"${i.unitId || ''}"`,
      `"${i.model || ''}"`,
      `"${i.hoursMeter || ''}"`,
      `"${i.program || ''}"`,
      `"${i.component || ''}"`,
      `"${i.system || ''}"`,
      `"${(i.findings || '').replace(/"/g, '""')}"`,
      `"${(i.recommendation || '').replace(/"/g, '""')}"`,
      `"${i.rating || 'A'}"`,
      `"${i.inspector || ''}"`,
      `"${(i.followUp || '').replace(/"/g, '""')}"`,
      `"${i.followUpStatus || 'OPEN'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename =
      selectedUnit === 'ALL'
        ? `riwayat_kegiatan_seluruh_aplikasi_${new Date().toISOString().slice(0, 10)}.csv`
        : `riwayat_kegiatan_unit_${selectedUnit}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSelectedUnit('ALL');
    setSelectedProgram('ALL');
    setSelectedRating('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 w-full min-w-0 pb-10">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 shrink-0 font-bold">
              <History className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Equipment Unit History & Application Activity Log
                </h2>
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {selectedUnit === 'ALL' ? 'Semua Kegiatan' : `Unit ${selectedUnit}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Menampilkan seluruh rekam riwayat kegiatan inspeksi, pemeliharaan berbasis kondisi (CBM),
                temuan kerusakan, serta histori aktivitas alat berat secara transparan dan terukur.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={filteredInspections.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => onOpenNewInspection(selectedUnit === 'ALL' ? undefined : selectedUnit)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-black text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>
                {selectedUnit === 'ALL' ? 'Tambah Kegiatan Baru' : `Input Kegiatan ${selectedUnit}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Kegiatan</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {stats.totalInspections}
          </div>
          <span className="text-[11px] text-slate-400">Total catatan kegiatan terdeteksi</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Unit Dipantau</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {stats.totalUnits}
          </div>
          <span className="text-[11px] text-slate-400">Unit terdaftar dalam log</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Normal (A)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
            {stats.normalA}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400/80">Kondisi baik & normal</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Perhatian (B/C/X)</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
            {stats.cautionB + stats.criticalC + stats.severeX}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400/80">Temuan perlu perhatian</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Follow Up Open</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
            {stats.openFollowUp}
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400/80">Perlu tindak lanjut lanjutan</span>
        </div>
      </div>

      {/* Filter Bar & View Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Cari Unit ID, Komponen, Temuan, Inspektur, Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-850 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode & Sort Toggle */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* View mode toggle */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Tabel Kegiatan</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Timeline Stream</span>
              </button>
            </div>

            {/* Sort order toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Urutkan Tanggal"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}</span>
            </button>
          </div>
        </div>

        {/* Multi Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Unit Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Unit Alat
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Unit ({inspections.length})</option>
              {allUnitIds.map((u) => (
                <option key={u} value={u}>
                  {u} ({unitCountsMap.get(u) || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Program CBM Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Program CBM
            </label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Program</option>
              <option value="PPM">PPM (Program Mesin)</option>
              <option value="PPE">PPE (Program Elektrik)</option>
              <option value="FC">FC (Filter Cutting)</option>
              <option value="MP">MP (Magnetic Plug)</option>
              <option value="CR">CR (Cylinder Rating)</option>
              <option value="PAP">PAP (Analisa Pelumas)</option>
              <option value="PPA">PPA (Pemeriksaan Attachment)</option>
              <option value="PPU">PPU (Pemeriksaan Undercarriage)</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Rating Kondisi
            </label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Rating</option>
              <option value="A">A - Normal</option>
              <option value="B">B - Caution / Perhatian</option>
              <option value="C">C - Critical / Kritis</option>
              <option value="X">X - Severe / Parah</option>
            </select>
          </div>

          {/* Follow-up Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Status Follow Up
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="OPEN">OPEN (Perlu Tindakan)</option>
              <option value="CLOSED">CLOSED (Selesai)</option>
            </select>
          </div>
        </div>

        {/* Active filter counter / Reset */}
        {(selectedUnit !== 'ALL' ||
          selectedProgram !== 'ALL' ||
          selectedRating !== 'ALL' ||
          selectedStatus !== 'ALL' ||
          searchQuery !== '') && (
          <div className="flex items-center justify-between text-xs pt-2 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <span>
              Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredInspections.length}</strong> dari {inspections.length} total data kegiatan.
            </span>
            <button
              onClick={resetFilters}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors w-full min-w-0">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Log Tabel Riwayat Kegiatan
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {filteredInspections.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">TANGGAL & HM</th>
                  <th className="py-3 px-4 whitespace-nowrap">UNIT & MODEL</th>
                  <th className="py-3 px-3 whitespace-nowrap">PROGRAM</th>
                  <th className="py-3 px-4 whitespace-nowrap">KOMPONEN & SISTEM</th>
                  <th className="py-3 px-4 min-w-[220px]">TEMUAN (FINDINGS)</th>
                  <th className="py-3 px-4 min-w-[200px]">REKOMENDASI</th>
                  <th className="py-3 px-3 whitespace-nowrap">RATING</th>
                  <th className="py-3 px-3 whitespace-nowrap">INSPEKTUR</th>
                  <th className="py-3 px-3 whitespace-nowrap">STATUS FOLLOW UP</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">AKSI</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                          Tidak ada riwayat kegiatan yang cocok.
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Coba sesuaikan kata kunci pencarian atau ubah filter unit/program yang dipilih.
                        </p>
                        <button
                          onClick={resetFilters}
                          className="mt-3 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold rounded-lg text-xs hover:bg-blue-100 cursor-pointer"
                        >
                          Reset Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onViewDetail(item)}
                      className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                    >
                      {/* Tanggal & HM */}
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.date}</span>
                        </div>
                        {item.hoursMeter && (
                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                            HM: {Number(item.hoursMeter).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Unit & Model */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 font-mono font-bold text-xs shadow-xs">
                            {item.unitId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] mt-0.5">
                          {item.model || 'Heavy Equipment'}
                        </div>
                      </td>

                      {/* Program */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
                          {item.program}
                        </span>
                      </td>

                      {/* Komponen & Sistem */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.component}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.system || '—'}
                        </div>
                      </td>

                      {/* Temuan */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.findings || '—'}
                        </p>
                      </td>

                      {/* Rekomendasi */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.recommendation || '—'}
                        </p>
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <RatingBadge rating={item.rating} />
                      </td>

                      {/* Inspektur */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{item.inspector || '—'}</span>
                        </div>
                      </td>

                      {/* Status Follow Up */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                            item.followUpStatus === 'CLOSED'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {item.followUpStatus === 'CLOSED' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>CLOSED</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>OPEN</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(item);
                            }}
                            title="Lihat Detail Inspeksi"
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onEditInspection && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditInspection(item);
                              }}
                              title="Edit Data Inspeksi"
                              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteInspection && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteInspection(item);
                              }}
                              title="Hapus Data Inspeksi"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
        </div>
      ) : (
        /* TIMELINE ACTIVITY STREAM VIEW */
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="mb-6 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Timeline Stream Kegiatan Inspeksi & Maintenance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alur kronologis berdasarkan waktu pencatatan kegiatan
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {filteredInspections.length} Events
            </span>
          </div>

          {filteredInspections.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              Tidak ada kegiatan yang ditemukan dalam timeline.
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {filteredInspections.map((item) => {
                const normRating = normalizeRating(item.rating);
                let badgeBg = 'bg-emerald-500 text-white';
                if (normRating === 'B') badgeBg = 'bg-amber-500 text-white';
                if (normRating === 'C') badgeBg = 'bg-orange-500 text-white';
                if (normRating === 'X') badgeBg = 'bg-rose-600 text-white';

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Point */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${badgeBg} ring-4 ring-white dark:ring-slate-900 shadow-sm z-10`}
                    >
                      {normRating}
                    </div>

                    {/* Timeline Card */}
                    <div
                      onClick={() => onViewDetail(item)}
                      className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-xs">
                            {item.unitId}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {item.program}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.component}
                          </span>
                          {item.system && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              ({item.system})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1 font-mono font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.date}</span>
                          </div>
                          {item.hoursMeter && (
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                              {Number(item.hoursMeter).toLocaleString()} HM
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Body & Findings */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Temuan / Findings:{' '}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {item.findings || '—'}
                          </span>
                        </div>
                        {item.recommendation && (
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Rekomendasi:{' '}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {item.recommendation}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Inspektur: {item.inspector || '—'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <RatingBadge rating={item.rating} />
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.followUpStatus === 'CLOSED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {item.followUpStatus === 'CLOSED' ? 'CLOSED' : 'OPEN FOLLOW-UP'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnitHistory;
