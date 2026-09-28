import React, { useState, useMemo, useRef } from 'react';
import { MasterComponent, ComponentCsvValidationPreview } from '../types/masterComponent';
import { Inspection } from '../types/inspection';
import {
  getMasterComponents,
  createComponent,
  updateComponent,
  deleteOrDeactivateComponent,
  getComponentInspectionCount,
  validateComponentCsvImport,
  executeComponentCsvImport,
  getNextComponentId,
  clearAllComponents,
} from '../services/masterComponentService';
import { exportMasterComponentsToExcel } from '../utils/excelExport';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  FileSpreadsheet,
  Layers,
  Activity,
  Archive,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface MasterComponentPageProps {
  inspections: Inspection[];
  onNavigateToInspection?: (componentName: string) => void;
}

export const MasterComponentPage: React.FC<MasterComponentPageProps> = ({
  inspections,
  onNavigateToInspection,
}) => {
  const [components, setComponents] = useState<MasterComponent[]>(() => getMasterComponents());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterComponent | null>(null);
  const [selectedComponentForDetail, setSelectedComponentForDetail] = useState<MasterComponent | null>(null);
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formError, setFormError] = useState('');

  // Delete / Inactivate Modal State
  const [deleteTarget, setDeleteTarget] = useState<MasterComponent | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ComponentCsvValidationPreview | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Pre-calculate inspection counts per component
  const componentStats = useMemo(() => {
    const map = new Map<string, number>();
    components.forEach((c) => {
      const count = getComponentInspectionCount(c.componentName, c.id, inspections);
      map.set(c.id, count);
    });
    return map;
  }, [components, inspections]);

  // Filtered components list
  const filteredComponents = useMemo(() => {
    return components.filter((item) => {
      // Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const searchable = `${item.id} ${item.componentName} ${item.status}`.toLowerCase();
        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [components, statusFilter, searchQuery]);

  // Overall KPI counts
  const totalCount = components.length;
  const activeCount = components.filter((c) => c.status === 'ACTIVE').length;
  const inactiveCount = components.filter((c) => c.status === 'INACTIVE').length;
  const usedInInspectionsCount = components.filter((c) => (componentStats.get(c.id) || 0) > 0).length;

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormStatus('ACTIVE');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MasterComponent) => {
    setEditingItem(item);
    setFormName(item.componentName);
    setFormStatus(item.status);
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Form (Add or Edit)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmed = formName.trim();
    if (!trimmed) {
      setFormError('Component Name is required.');
      return;
    }

    if (editingItem) {
      // Edit existing
      const res = await updateComponent({
        ...editingItem,
        componentName: trimmed,
        status: formStatus,
      });

      if (!res.success) {
        setFormError(res.message || 'Failed to update component.');
        return;
      }

      const updated = getMasterComponents();
      setComponents(updated);
      setIsModalOpen(false);
      triggerToast(`Component "${trimmed}" updated successfully.`);
    } else {
      // Add new
      const res = await createComponent(trimmed, formStatus);
      if (!res.success) {
        setFormError(res.message || 'Failed to create component.');
        return;
      }

      const updated = getMasterComponents();
      setComponents(updated);
      setIsModalOpen(false);
      triggerToast(`Component "${trimmed}" added to Master Components.`);
    }
  };

  // Delete or Deactivate Action Handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const count = componentStats.get(deleteTarget.id) || 0;
    const isUsed = count > 0;

    const res = await deleteOrDeactivateComponent(deleteTarget.id, isUsed);
    const updated = getMasterComponents();
    setComponents(updated);
    setDeleteTarget(null);

    if (res.actionTaken === 'INACTIVE') {
      triggerToast(res.message || `Component "${deleteTarget.componentName}" marked as INACTIVE.`, 'warning');
    } else {
      triggerToast(res.message || `Component "${deleteTarget.componentName}" deleted.`, 'info');
    }
  };

  // Clear all components completely
  const handleExecuteClearAll = () => {
    clearAllComponents();
    setComponents([]);
    setIsClearAllModalOpen(false);
    triggerToast('Seluruh data Master Components berhasil dihapus.', 'info');
  };

  // CSV File Selection & Parse
  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const preview = validateComponentCsvImport(text, components);
        setImportPreview(preview);
        setIsImportModalOpen(true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute CSV Import
  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);

    try {
      const result = await executeComponentCsvImport(importPreview, duplicateAction, components);
      setComponents(result.updatedList);
      setIsImportModalOpen(false);
      setImportPreview(null);
      triggerToast(
        `Imported ${result.importedCount} components successfully.${
          result.updatedCount > 0 ? ` Updated ${result.updatedCount} existing records.` : ''
        }`
      );
    } catch (err: any) {
      triggerToast(`Import error: ${err.message}`, 'warning');
    } finally {
      setIsImporting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'COMPONENT_NAME', 'STATUS', 'CREATED_AT', 'UPDATED_AT'];
    const rows = filteredComponents.map((c) => [
      `"${c.id}"`,
      `"${c.componentName.replace(/"/g, '""')}"`,
      `"${c.status}"`,
      `"${c.createdAt}"`,
      `"${c.updatedAt}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Master_Components_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Master Components exported to CSV successfully.');
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 text-white rounded-xl shadow-xl border animate-in slide-in-from-top duration-200 ${
            toast.type === 'warning'
              ? 'bg-amber-900/90 border-amber-700'
              : toast.type === 'info'
              ? 'bg-slate-900/90 border-slate-700'
              : 'bg-emerald-950/90 border-emerald-700'
          }`}
        >
          <CheckCircle2
            className={`w-5 h-5 shrink-0 ${
              toast.type === 'warning'
                ? 'text-amber-400'
                : toast.type === 'info'
                ? 'text-blue-400'
                : 'text-emerald-400'
            }`}
          />
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Hidden File Input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleCsvFileSelected}
        className="hidden"
      />

      {/* Top Banner Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 shrink-0">
            <Cpu className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Master Components
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {components.length} Components
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Halaman ini digunakan untuk mengelola daftar component/system yang digunakan dalam proses inspeksi Condition Based Maintenance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {components.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
              title="Hapus seluruh data components"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Hapus Semua</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            title="Import component data from CSV"
          >
            <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => exportMasterComponentsToExcel(components)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            title="Export master components ke File Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            title="Export master components to CSV"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>+ Add Component</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full min-w-0">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Components
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Komponen terdaftar di Master Data
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Active Components
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Tersedia untuk New Inspection
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inactive Components
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-700 dark:text-slate-300">
            {inactiveCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Terkunci untuk riwayat histori
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Used in Inspections
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {usedInInspectionsCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Komponen memiliki data inspeksi
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search component..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 min-w-[160px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Status: Active</option>
              <option value="INACTIVE">Status: Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Master Component Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Master Component Table
            </h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
              {filteredComponents.length} of {components.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-850/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 w-14 text-center">No.</th>
                <th className="py-3.5 px-4">Component</th>
                <th className="py-3.5 px-4">Inspection Count</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredComponents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Cpu className="w-8 h-8 opacity-40" />
                      <span className="text-sm font-semibold">
                        No component found matching your filter criteria.
                      </span>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('ALL');
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 underline font-semibold mt-1 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredComponents.map((item, index) => {
                  const usageCount = componentStats.get(item.id) || 0;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. No. */}
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-400 dark:text-slate-500">
                        {index + 1}
                      </td>

                      {/* 2. Component */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {item.id}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {item.componentName}
                          </span>
                        </div>
                      </td>

                      {/* 3. Inspection Count */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          onClick={() => {
                            if (usageCount > 0 && onNavigateToInspection) {
                              onNavigateToInspection(item.componentName);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            usageCount > 0
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer hover:underline'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Activity className="w-3 h-3" />
                          <span>{usageCount} Inspections</span>
                        </span>
                      </td>

                      {/* 4. Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            INACTIVE
                          </span>
                        )}
                      </td>

                      {/* 5. Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedComponentForDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title="Detail Component"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                            title="Edit Component"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete / Inactivate Component"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Component Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Component' : 'Add Component'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingItem ? `ID: ${editingItem.id}` : `New ID: ${getNextComponentId(components)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm}>
              <div className="p-6 space-y-4 text-xs sm:text-sm">
                {formError && (
                  <div className="p-3 text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Component Name Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Component Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine, Hydraulic, Transmission, Steering"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Pastikan nama component unik dan belum terdaftar.
                  </p>
                </div>

                {/* Status Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Dapat dipilih pada New Inspection)</option>
                    <option value="INACTIVE">INACTIVE (Hanya untuk referensi histori)</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Inactivation Confirmation Modal with Protection */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            {(componentStats.get(deleteTarget.id) || 0) > 0 ? (
              // PROTECTED: Already used in inspections
              <>
                <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Data Integrity Protection
                    </h4>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      Used in {componentStats.get(deleteTarget.id)} inspection records
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-2">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    This component is already used by inspection records.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    For data integrity, it will be marked as <strong className="text-amber-600 dark:text-amber-400">INACTIVE</strong> instead of permanently deleted.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    Set Inactive
                  </button>
                </div>
              </>
            ) : (
              // UNUSED: Can be permanently deleted
              <>
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Delete this component?
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Component:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {deleteTarget.componentName}
                  </strong>{' '}
                  ({deleteTarget.id})
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSV Import Preview & Validation Modal */}
      {isImportModalOpen && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    MASTER COMPONENT DATA DETECTED
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    File: {importFileName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs sm:text-sm max-h-[70vh] overflow-y-auto">
              {/* Detection Summary Box */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <span>Column Detected:</span>
                  <span className="font-mono bg-blue-200/70 dark:bg-blue-900/80 px-2 py-0.5 rounded text-blue-950 dark:text-blue-100">
                    {importPreview.detectedColumn} → Component Name
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-200">
                  <span>Total Records Detected:</span>
                  <span className="font-bold text-sm text-blue-700 dark:text-blue-300">
                    {importPreview.totalRows}
                  </span>
                </div>
              </div>

              {/* Import Preview Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Import Preview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
                      Total Rows:
                    </span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {importPreview.totalRows}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                      Valid Rows:
                    </span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {importPreview.validRows}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold block">
                      Duplicate Rows:
                    </span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {importPreview.duplicateRows}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <span className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold block">
                      Invalid Rows:
                    </span>
                    <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
                      {importPreview.invalidRows}
                    </span>
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Section */}
              {importPreview.duplicateRows > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Duplicate Components Handling:</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        value="skip"
                        checked={duplicateAction === 'skip'}
                        onChange={() => setDuplicateAction('skip')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Skip (Jangan import record duplicate)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dupAction"
                        value="update"
                        checked={duplicateAction === 'update'}
                        onChange={() => setDuplicateAction('update')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Update Existing (Perbarui data jika sudah ada)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Sample of Valid Components */}
              {importPreview.validItems.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Valid Components to Import ({importPreview.validItems.length}):
                  </h5>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    {importPreview.validItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {item.componentName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview(null);
                }}
                disabled={isImporting}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || importPreview.validRows === 0}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Detail Modal */}
      {selectedComponentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detail Master Component
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedComponentForDetail.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedComponentForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Component ID</span>
                  <span className="font-bold text-slate-900 dark:text-white text-base font-mono">{selectedComponentForDetail.id}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      selectedComponentForDetail.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {selectedComponentForDetail.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Nama Komponen</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedComponentForDetail.componentName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Jumlah Riwayat Inspeksi</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {componentStats.get(selectedComponentForDetail.id) || 0} Inspeksi Terkait
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Tanggal Dibuat</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{selectedComponentForDetail.createdAt || '—'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedComponentForDetail;
                    setSelectedComponentForDetail(null);
                    setDeleteTarget(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedComponentForDetail;
                    setSelectedComponentForDetail(null);
                    handleOpenEditModal(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-900/60 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToInspection && (
                  <button
                    type="button"
                    onClick={() => {
                      const name = selectedComponentForDetail.componentName;
                      setSelectedComponentForDetail(null);
                      onNavigateToInspection(name);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Filter di Inspeksi
                  </button>
                )}
                <button
                  onClick={() => setSelectedComponentForDetail(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Components Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Seluruh Data Components?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan mengosongkan seluruh daftar master component.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus seluruh ({components.length}) data master component? Anda dapat mengimpor kembali file CSV kapan saja.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteClearAll}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
