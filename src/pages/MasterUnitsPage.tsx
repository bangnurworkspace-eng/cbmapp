import React, { useState, useMemo, useRef } from 'react';
import { MasterUnit, CsvValidationPreview } from '../types/masterUnit';
import {
  getMasterUnits,
  saveMasterUnits,
  validateCsvImport,
  executeCsvImport,
  clearAllUnits,
} from '../services/masterUnitService';
import { exportMasterUnitsToExcel } from '../utils/excelExport';
import {
  Truck,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Building2,
  Compass,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
} from 'lucide-react';

interface MasterUnitsPageProps {
  onNavigateToInspection?: (unitCode: string) => void;
}

export const MasterUnitsPage: React.FC<MasterUnitsPageProps> = ({ onNavigateToInspection }) => {
  const [units, setUnits] = useState<MasterUnit[]>(() => getMasterUnits());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedModel, setSelectedModel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination state
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MasterUnit | null>(null);
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<MasterUnit | null>(null);

  // Form state
  const [formUnitCode, setFormUnitCode] = useState('');
  const [formUnitModel, setFormUnitModel] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formError, setFormError] = useState('');

  // Delete Confirmation state
  const [deleteTarget, setDeleteTarget] = useState<MasterUnit | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Import CSV state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<CsvValidationPreview | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Dynamic filter values derived directly from dataset
  const uniqueManufacturers = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.manufacturer && u.manufacturer.trim()) set.add(u.manufacturer.trim());
    });
    return Array.from(set).sort();
  }, [units]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.section && u.section.trim()) set.add(u.section.trim());
    });
    return Array.from(set).sort();
  }, [units]);

  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => {
      if (u.unitModel && u.unitModel.trim()) set.add(u.unitModel.trim());
    });
    return Array.from(set).sort();
  }, [units]);

  // Filtered units list
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (selectedManufacturer !== 'ALL' && u.manufacturer !== selectedManufacturer) {
        return false;
      }
      if (selectedSection !== 'ALL' && u.section !== selectedSection) {
        return false;
      }
      if (selectedModel !== 'ALL' && u.unitModel !== selectedModel) {
        return false;
      }
      if (selectedStatus !== 'ALL' && u.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const code = (u.unitCode || '').toLowerCase();
        const model = (u.unitModel || '').toLowerCase();
        const mfg = (u.manufacturer || '').toLowerCase();
        const sec = (u.section || '').toLowerCase();
        if (!code.includes(query) && !model.includes(query) && !mfg.includes(query) && !sec.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [units, selectedManufacturer, selectedSection, selectedModel, selectedStatus, searchQuery]);

  // Pagination calculations
  const totalPages = rowsPerPage === 0 ? 1 : Math.ceil(filteredUnits.length / rowsPerPage);
  const paginatedUnits = useMemo(() => {
    if (rowsPerPage === 0) return filteredUnits;
    const start = (currentPageNum - 1) * rowsPerPage;
    return filteredUnits.slice(start, start + rowsPerPage);
  }, [filteredUnits, currentPageNum, rowsPerPage]);

  const handleOpenAdd = () => {
    setEditingUnit(null);
    setFormUnitCode('');
    setFormUnitModel('');
    setFormManufacturer(uniqueManufacturers[0] || 'CATERPILLAR');
    setFormSection(uniqueSections[0] || 'BIG DIGGER');
    setFormStatus('ACTIVE');
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (unit: MasterUnit) => {
    setEditingUnit(unit);
    setFormUnitCode(unit.unitCode);
    setFormUnitModel(unit.unitModel);
    setFormManufacturer(unit.manufacturer);
    setFormSection(unit.section);
    setFormStatus(unit.status);
    setFormError('');
    setIsAddEditModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = formUnitCode.trim().toUpperCase();
    const cleanModel = formUnitModel.trim();
    const cleanMfg = formManufacturer.trim();
    const cleanSec = formSection.trim();

    if (!cleanCode) {
      setFormError('Unit Code wajib diisi');
      return;
    }
    if (!cleanModel) {
      setFormError('Unit Model wajib diisi');
      return;
    }
    if (!cleanMfg) {
      setFormError('Manufacturer wajib diisi');
      return;
    }
    if (!cleanSec) {
      setFormError('Section wajib diisi');
      return;
    }

    if (editingUnit) {
      // Check if code changed to an already existing unit code
      if (
        cleanCode !== editingUnit.unitCode.toUpperCase() &&
        units.some((u) => u.unitCode.toUpperCase() === cleanCode)
      ) {
        setFormError(`Unit Code "${cleanCode}" sudah digunakan unit lain.`);
        return;
      }

      const updated = units.map((u) =>
        u.id === editingUnit.id
          ? {
              ...u,
              unitCode: cleanCode,
              unitModel: cleanModel,
              manufacturer: cleanMfg,
              section: cleanSec,
              status: formStatus,
              updatedAt: new Date().toISOString(),
            }
          : u
      );
      setUnits(updated);
      saveMasterUnits(updated);
      triggerToast(`Unit "${cleanCode}" berhasil diperbarui.`);
    } else {
      // Check duplicate
      if (units.some((u) => u.unitCode.toUpperCase() === cleanCode)) {
        setFormError(`Unit Code "${cleanCode}" sudah ada di database Master Units.`);
        return;
      }

      const newUnit: MasterUnit = {
        id: `UNIT_${cleanCode}`,
        unitCode: cleanCode,
        unitModel: cleanModel,
        manufacturer: cleanMfg,
        section: cleanSec,
        status: formStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [newUnit, ...units];
      setUnits(updated);
      saveMasterUnits(updated);
      triggerToast(`Unit baru "${cleanCode}" berhasil ditambahkan.`);
    }

    setIsAddEditModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const targetCode = deleteTarget.unitCode;
    const updated = units.filter((u) => u.id !== deleteTarget.id);
    setUnits(updated);
    saveMasterUnits(updated);
    triggerToast(`Unit "${targetCode}" berhasil dihapus.`);
    setDeleteTarget(null);
  };

  const handleExecuteClearAll = () => {
    clearAllUnits();
    setUnits([]);
    setIsClearAllModalOpen(false);
    triggerToast('Seluruh data Master Units berhasil dihapus.');
  };

  const handleExportCSV = () => {
    const headers = ['unit code', 'unit model', 'manufacture', 'section', 'status'];
    const rows = filteredUnits.map((u) => [
      `"${u.unitCode}"`,
      `"${u.unitModel.replace(/"/g, '""')}"`,
      `"${u.manufacturer.replace(/"/g, '""')}"`,
      `"${u.section.replace(/"/g, '""')}"`,
      `"${u.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CBM_Master_Units_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Data Master Units berhasil diexport ke CSV.');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const preview = validateCsvImport(text, units);
        setImportPreview(preview);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    setIsProcessingImport(true);

    setTimeout(() => {
      const res = executeCsvImport(importPreview, duplicateAction, units);
      setUnits(res.updatedList);
      setIsProcessingImport(false);
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);

      triggerToast(
        `Import selesai: ${res.importedCount} unit baru ditambahkan${
          res.updatedCount > 0 ? `, ${res.updatedCount} unit diperbarui` : ''
        }.`
      );
    }, 200);
  };

  const getSectionBadgeClass = (sec: string) => {
    const s = sec.toUpperCase();
    if (s.includes('DIGGER') || s.includes('EXCAVATOR')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    if (s.includes('HAUL') || s.includes('WHEEL')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (s.includes('TRACK')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (s.includes('INFRA')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    if (s.includes('SSE')) {
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 shrink-0">
            <Truck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Master Units
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {units.length} Records
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Data master seluruh equipment dan unit armada operasional perusahaan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {units.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
              title="Hapus seluruh data master units"
            >
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Hapus Semua</span>
            </button>
          )}
          <button
            onClick={() => {
              setImportFile(null);
              setImportPreview(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Import unit dari file CSV"
          >
            <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => exportMasterUnitsToExcel(units)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            title="Export master units ke File Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Export master units ke CSV"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>+ Add Unit</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 w-full min-w-0">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Units
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {units.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Unit code terdaftar dalam master data
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Unit Models
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {uniqueModels.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Varian model alat dalam armada
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Manufacturers
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {uniqueManufacturers.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Pabrikan alat berat (OEM) terdaftar
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Sections
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {uniqueSections.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Departemen / section operasional
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search unit (Unit Code, Unit Model, Manufacturer, Section)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPageNum(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPageNum(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Manufacturer Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Mfg:</span>
              <select
                value={selectedManufacturer}
                onChange={(e) => {
                  setSelectedManufacturer(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Manufacturers ({uniqueManufacturers.length})</option>
                {uniqueManufacturers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Sections ({uniqueSections.length})</option>
                {uniqueSections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Model Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Models ({uniqueModels.length})</option>
                {uniqueModels.map((mdl) => (
                  <option key={mdl} value={mdl}>
                    {mdl}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            {(selectedManufacturer !== 'ALL' ||
              selectedSection !== 'ALL' ||
              selectedModel !== 'ALL' ||
              selectedStatus !== 'ALL' ||
              searchQuery) && (
              <button
                onClick={() => {
                  setSelectedManufacturer('ALL');
                  setSelectedSection('ALL');
                  setSelectedModel('ALL');
                  setSelectedStatus('ALL');
                  setSearchQuery('');
                  setCurrentPageNum(1);
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Tabel Master Units
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
              {filteredUnits.length} dari {units.length} Unit
            </span>
          </div>

          {/* Rows per page selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Tampilkan:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPageNum(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
              <option value={0}>Semua baris ({filteredUnits.length})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-850/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 w-14 text-center">No.</th>
                <th className="py-3.5 px-4 w-40">Unit Code</th>
                <th className="py-3.5 px-4">Unit Model</th>
                <th className="py-3.5 px-4">Manufacturer</th>
                <th className="py-3.5 px-4">Section</th>
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Truck className="w-8 h-8 opacity-40" />
                      <span className="text-sm font-semibold">
                        Tidak ada unit yang cocok dengan kriteria pencarian/filter.
                      </span>
                      <button
                        onClick={() => {
                          setSelectedManufacturer('ALL');
                          setSelectedSection('ALL');
                          setSelectedModel('ALL');
                          setSelectedStatus('ALL');
                          setSearchQuery('');
                          setCurrentPageNum(1);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 underline font-semibold mt-1 cursor-pointer"
                      >
                        Reset Semua Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((item, idx) => {
                  const rowNumber = rowsPerPage === 0 ? idx + 1 : (currentPageNum - 1) * rowsPerPage + idx + 1;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* No. */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
                        {rowNumber}
                      </td>

                      {/* Unit Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                          <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          {item.unitCode}
                        </span>
                      </td>

                      {/* Unit Model */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.unitModel}
                      </td>

                      {/* Manufacturer */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {item.manufacturer}
                      </td>

                      {/* Section */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getSectionBadgeClass(
                            item.section
                          )}`}
                        >
                          {item.section}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUnitForDetail(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title={`Lihat detail unit ${item.unitCode}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                            title={`Edit unit ${item.unitCode}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title={`Delete unit ${item.unitCode}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {rowsPerPage > 0 && totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Halaman {currentPageNum} dari {totalPages} ({filteredUnits.length} total unit)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={currentPageNum === totalPages}
                onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Unit Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingUnit ? 'Edit Unit' : 'Add Unit'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingUnit
                      ? `Perbarui rincian unit ${editingUnit.unitCode}`
                      : 'Tambahkan unit baru ke database master armada'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
                {formError && (
                  <div className="p-3 text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Unit Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXLB003, HDKM050, PC-200"
                    value={formUnitCode}
                    onChange={(e) => setFormUnitCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Unique identifier armada. Tidak boleh duplikat.
                  </p>
                </div>

                {/* Unit Model */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Model *
                  </label>
                  <input
                    type="text"
                    required
                    list="unit-models-datalist"
                    placeholder="e.g. R9300, PC2000-8, HD785-7, XE3000"
                    value={formUnitModel}
                    onChange={(e) => setFormUnitModel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="unit-models-datalist">
                    {uniqueModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    list="manufacturers-datalist"
                    placeholder="e.g. LIEBHERR, KOMATSU, XCMG, CATERPILLAR, VOLVO"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="manufacturers-datalist">
                    {uniqueManufacturers.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section *
                  </label>
                  <input
                    type="text"
                    required
                    list="sections-datalist"
                    placeholder="e.g. BIG DIGGER, SSE, TRACK, WHEEL, WHEEL INFRA"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="sections-datalist">
                    {uniqueSections.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Operasional)</option>
                    <option value="INACTIVE">INACTIVE (Discontinued / Pensiun)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete this unit?
              </h3>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl mb-3 border border-slate-200 dark:border-slate-700 font-mono text-sm">
              <span className="text-slate-500 dark:text-slate-400 block text-xs">Unit:</span>
              <strong className="text-base text-slate-900 dark:text-white font-bold">
                {deleteTarget.unitCode}
              </strong>
              <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                {deleteTarget.unitModel} • {deleteTarget.manufacturer} • {deleteTarget.section}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed font-semibold text-rose-600 dark:text-rose-400">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Import CSV Master Units
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload file CSV dengan kolom: unit code, unit model, manufacture, section
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
              {/* File input zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-850/50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {importFile ? importFile.name : 'Klik untuk memilih file CSV'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung separator koma (,) atau titik-koma (;)
                </p>
              </div>

              {/* Preview statistics */}
              {importPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Total Rows
                      </span>
                      <strong className="text-xl font-black text-slate-900 dark:text-white">
                        {importPreview.totalRows}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                        Valid Rows
                      </span>
                      <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {importPreview.validRows}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">
                        Duplicate Rows
                      </span>
                      <strong className="text-xl font-black text-amber-600 dark:text-amber-400">
                        {importPreview.duplicateRows}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800">
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 block">
                        Invalid Rows
                      </span>
                      <strong className="text-xl font-black text-rose-600 dark:text-rose-400">
                        {importPreview.invalidRows}
                      </strong>
                    </div>
                  </div>

                  {/* Duplicate handling prompt */}
                  {importPreview.duplicateRows > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2 font-bold text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Duplicate Unit Code Ditemukan ({importPreview.duplicateRows} Unit)</span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mb-3">
                        Terdapat Unit Code pada CSV yang sudah terdaftar di database. Pilih opsi penanganan:
                      </p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="skip"
                            checked={duplicateAction === 'skip'}
                            onChange={() => setDuplicateAction('skip')}
                            className="text-blue-600"
                          />
                          <span>Skip (Pertahankan data lama)</span>
                        </label>
                        <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="update"
                            checked={duplicateAction === 'update'}
                            onChange={() => setDuplicateAction('update')}
                            className="text-blue-600"
                          />
                          <span>Update Existing (Perbarui dengan CSV ini)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Invalid rows warning */}
                  {importPreview.invalidRows > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                      <strong className="block mb-1 font-bold">Baris Tidak Valid (Missing Data):</strong>
                      <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto font-mono text-[11px]">
                        {importPreview.invalidItems.slice(0, 5).map((inv, idx) => (
                          <li key={idx}>
                            Baris {inv.rowNumber}: {inv.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!importPreview || (importPreview.validRows === 0 && importPreview.duplicateRows === 0) || isProcessingImport}
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isProcessingImport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Import</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Detail Modal */}
      {selectedUnitForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Detail Master Unit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedUnitForDetail.unitCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUnitForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Unit Code</span>
                  <span className="font-bold text-slate-900 dark:text-white text-base font-mono">{selectedUnitForDetail.unitCode}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      selectedUnitForDetail.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {selectedUnitForDetail.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Model Unit</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedUnitForDetail.unitModel || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Manufacturer / OEM</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUnitForDetail.manufacturer || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Section Area</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUnitForDetail.section || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">ID Record</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{selectedUnitForDetail.id}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedUnitForDetail;
                    setSelectedUnitForDetail(null);
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
                    const target = selectedUnitForDetail;
                    setSelectedUnitForDetail(null);
                    handleOpenEdit(target);
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
                      const code = selectedUnitForDetail.unitCode;
                      setSelectedUnitForDetail(null);
                      onNavigateToInspection(code);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Lihat Riwayat Inspeksi
                  </button>
                )}
                <button
                  onClick={() => setSelectedUnitForDetail(null)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Units Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Seluruh Data Units?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan mengosongkan seluruh daftar master unit armada.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus seluruh ({units.length}) data master units? Anda dapat mengimpor kembali file CSV kapan saja.
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
