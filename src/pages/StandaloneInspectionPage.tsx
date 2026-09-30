import React, { useState, useMemo, useEffect } from 'react';
import {
  StandaloneInspectionItem,
  StandaloneInspectionStatus,
  StandaloneInspectionPriority,
} from '../types/standaloneInspection';
import {
  getStandaloneInspections,
  fetchStandaloneInspections,
  createStandaloneInspection,
  updateStandaloneInspection,
  deleteStandaloneInspection,
  calculateStandaloneInspectionStats,
} from '../services/standaloneInspectionService';
import { fetchStandaloneInspectionsFromSheets } from '../services/googleSheets';
import { exportStandaloneInspectionsToExcel } from '../utils/excelExport';
import { getMasterUnits } from '../services/masterUnitService';
import { compressBase64Image } from '../utils/imageCompressor';
import {
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Truck,
  Edit3,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  Check,
  AlertCircle,
  FileText,
  Camera,
} from 'lucide-react';

interface StandaloneInspectionPageProps {
  startDate?: string;
  endDate?: string;
}

type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type FilterPriority = 'ALL' | 'P1' | 'P2' | 'P3';

export const StandaloneInspectionPage: React.FC<StandaloneInspectionPageProps> = ({
  startDate = '',
  endDate = '',
}) => {
  // Items state
  const [items, setItems] = useState<StandaloneInspectionItem[]>(() =>
    getStandaloneInspections()
  );

  // Auto-sync items from Google Sheets on mount
  useEffect(() => {
    let isMounted = true;
    fetchStandaloneInspections().then((remote) => {
      if (isMounted) {
        setItems(remote);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('ALL');

  // Modal States
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<StandaloneInspectionItem | null>(null);
  const [detailItem, setDetailItem] = useState<StandaloneInspectionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);

  // Form State for Inspection Input
  const [formUnitId, setFormUnitId] = useState<string>('');
  const [formUnitModel, setFormUnitModel] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formFindings, setFormFindings] = useState<string>('');
  const [formFindingsImage, setFormFindingsImage] = useState<string>('');
  const [formInspector, setFormInspector] = useState<string>('');
  const [formStatus, setFormStatus] = useState<StandaloneInspectionStatus>('OPEN');
  const [formPriority, setFormPriority] = useState<StandaloneInspectionPriority>('P2');
  const [formNotes, setFormNotes] = useState<string>('');

  // Conditional Close Action Form State
  const [formActionBy, setFormActionBy] = useState<string>('');
  const [formActionDate, setFormActionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formActionDetails, setFormActionDetails] = useState<string>('');
  const [formActionImage, setFormActionImage] = useState<string>('');

  const [formError, setFormError] = useState<string>('');

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Master units list for auto-lookup
  const masterUnits = useMemo(() => getMasterUnits(), []);

  // Dashboard Stats
  const stats = useMemo(() => {
    return calculateStandaloneInspectionStats(items);
  }, [items]);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Date Range Filter
      if (startDate && item.date && item.date < startDate) return false;
      if (endDate && item.date && item.date > endDate) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Priority Filter
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = `${item.id} ${item.unitId} ${item.unitModel || ''} ${item.date} ${item.findings} ${item.inspector} ${item.actionBy || ''} ${item.actionDetails || ''} ${item.notes || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [items, startDate, endDate, statusFilter, priorityFilter, searchQuery]);

  // Auto-populate Unit Model when Unit ID changes
  const handleUnitIdChange = (val: string) => {
    const clean = val.toUpperCase();
    setFormUnitId(clean);

    const matched = masterUnits.find(
      (u) => u.unitCode.trim().toUpperCase() === clean.trim()
    );
    if (matched && matched.unitModel) {
      setFormUnitModel(matched.unitModel);
    }
  };

  // Image Upload Handler (Findings Image)
  const handleFindingsImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('Ukuran gambar temuan terlalu besar (Maksimal 10MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const raw = reader.result as string;
        const compressed = await compressBase64Image(raw, 600, 600, 0.6);
        setFormFindingsImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  // Image Upload Handler (Action Image)
  const handleActionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFormError('Ukuran gambar action terlalu besar (Maksimal 10MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const raw = reader.result as string;
        const compressed = await compressBase64Image(raw, 600, 600, 0.6);
        setFormActionImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormUnitId('');
    setFormUnitModel('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormFindings('');
    setFormFindingsImage('');
    setFormInspector('');
    setFormStatus('OPEN');
    setFormPriority('P2');
    setFormNotes('');
    setFormActionBy('');
    setFormActionDate(new Date().toISOString().slice(0, 10));
    setFormActionDetails('');
    setFormActionImage('');
    setFormError('');
    setIsInputModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: StandaloneInspectionItem) => {
    setEditingItem(item);
    setFormUnitId(item.unitId || '');
    setFormUnitModel(item.unitModel || '');
    setFormDate(item.date || new Date().toISOString().slice(0, 10));
    setFormFindings(item.findings || '');
    setFormFindingsImage(item.findingsImage || '');
    setFormInspector(item.inspector || '');
    setFormStatus(item.status || 'OPEN');
    setFormPriority(item.priority || 'P2');
    setFormNotes(item.notes || '');
    setFormActionBy(item.actionBy || '');
    setFormActionDate(item.actionDate || new Date().toISOString().slice(0, 10));
    setFormActionDetails(item.actionDetails || '');
    setFormActionImage(item.actionImage || '');
    setFormError('');
    setIsInputModalOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUnit = formUnitId.trim();
    const cleanModel = formUnitModel.trim();
    const cleanDate = formDate.trim();
    const cleanFindings = formFindings.trim();
    const cleanInspector = formInspector.trim();

    if (!cleanUnit) {
      setFormError('UNIT ID wajib diisi');
      return;
    }
    if (!cleanDate) {
      setFormError('DATE wajib diisi');
      return;
    }
    if (!cleanFindings) {
      setFormError('Findings (Temuan) wajib diisi');
      return;
    }
    if (!cleanInspector) {
      setFormError('Inspector wajib diisi');
      return;
    }

    // Validation when status is CLOSED
    if (formStatus === 'CLOSED') {
      if (!formActionBy.trim()) {
        setFormError('Jika status CLOSED, field "Action By" wajib diisi!');
        return;
      }
      if (!formActionDate.trim()) {
        setFormError('Jika status CLOSED, field "Tanggal Action" wajib diisi!');
        return;
      }
      if (!formActionDetails.trim()) {
        setFormError('Jika status CLOSED, field "Kegiatan yang di Action" wajib diisi!');
        return;
      }
    }

    if (editingItem) {
      const updatedItem: StandaloneInspectionItem = {
        ...editingItem,
        unitId: cleanUnit,
        unitModel: cleanModel || undefined,
        date: cleanDate,
        findings: cleanFindings,
        findingsImage: formFindingsImage.trim() || undefined,
        inspector: cleanInspector,
        status: formStatus,
        priority: formPriority,
        notes: formNotes.trim() || undefined,
        actionBy: formStatus === 'CLOSED' ? formActionBy.trim() : (editingItem.actionBy || undefined),
        actionDate: formStatus === 'CLOSED' ? formActionDate.trim() : (editingItem.actionDate || undefined),
        actionDetails: formStatus === 'CLOSED' ? formActionDetails.trim() : (editingItem.actionDetails || undefined),
        actionImage: formStatus === 'CLOSED' ? (formActionImage.trim() || undefined) : (editingItem.actionImage || undefined),
      };

      await updateStandaloneInspection(updatedItem);
      const newList = await getStandaloneInspections();
      setItems(newList);
      showToast(`Inspection ${editingItem.id} berhasil diperbarui!`);
    } else {
      await createStandaloneInspection({
        unitId: cleanUnit,
        unitModel: cleanModel || undefined,
        date: cleanDate,
        findings: cleanFindings,
        findingsImage: formFindingsImage.trim() || undefined,
        inspector: cleanInspector,
        status: formStatus,
        priority: formPriority,
        notes: formNotes.trim() || undefined,
        actionBy: formStatus === 'CLOSED' ? formActionBy.trim() : undefined,
        actionDate: formStatus === 'CLOSED' ? formActionDate.trim() : undefined,
        actionDetails: formStatus === 'CLOSED' ? formActionDetails.trim() : undefined,
        actionImage: formStatus === 'CLOSED' ? formActionImage.trim() || undefined : undefined,
      });
      const newList = await getStandaloneInspections();
      setItems(newList);
      showToast('Data Inspection baru berhasil ditambahkan!');
    }

    setIsInputModalOpen(false);
  };

  // Quick Status Toggle directly from table
  const handleQuickStatusChange = async (item: StandaloneInspectionItem, newStatus: StandaloneInspectionStatus) => {
    if (newStatus === 'CLOSED' && (!item.actionBy || !item.actionDetails)) {
      handleOpenEditModal({ ...item, status: 'CLOSED' });
      showToast('Lengkapi data Action By & Kegiatan Action terlebih dahulu', 'info');
      return;
    }

    await updateStandaloneInspection({ ...item, status: newStatus });
    const newList = await getStandaloneInspections();
    setItems(newList);
    showToast(`Status ${item.id} diubah ke ${newStatus}`, 'info');
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    await deleteStandaloneInspection(deletingId);
    const newList = await getStandaloneInspections();
    setItems(newList);
    setDeletingId(null);
    showToast('Data Inspection berhasil dihapus.', 'info');
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Banner Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Inspection Dashboard
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportStandaloneInspectionsToExcel(filteredItems)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            title="Export data Inspection ke File Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>+ Input Inspection</span>
          </button>
        </div>
      </div>

      {/* Standalone Inspection Dashboard Stats Cards */}
      <section aria-label="Inspection Dashboard Overview" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
        {/* Total */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Open */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Open</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.open}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        {/* In Progress */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">In Progress</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.inProgress}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* Closed */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs transition-colors">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Closed</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.closed}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        {/* P1 Count */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Priority P1</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.p1Count}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-md">Urgent</span>
          </div>
        </div>

        {/* P2 Count */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Priority P2</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.p2Count}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-md">Medium</span>
          </div>
        </div>

        {/* P3 Count */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Priority P3</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.p3Count}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md">Low</span>
          </div>
        </div>
      </section>

      {/* Main Table & Filters Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-x-auto shrink-0">
            {[
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'OPEN', label: `Open (${stats.open})` },
              { id: 'IN_PROGRESS', label: `In Progress (${stats.inProgress})` },
              { id: 'CLOSED', label: `Closed (${stats.closed})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as FilterStatus)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Controls: Priority Filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Priority: Semua</option>
                <option value="P1">P1 (Kritis / Urgent)</option>
                <option value="P2">P2 (Sedang / Medium)</option>
                <option value="P3">P3 (Rendah / Low)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-60 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Unit ID, Temuan, Inspector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">NO / ID</th>
                <th className="py-3 px-4 whitespace-nowrap">UNIT ID</th>
                <th className="py-3 px-4 whitespace-nowrap">DATE</th>
                <th className="py-3 px-4 min-w-[220px]">FINDINGS (TEMUAN)</th>
                <th className="py-3 px-4 whitespace-nowrap">INSPECTOR</th>
                <th className="py-3 px-4 whitespace-nowrap">PRIORITY</th>
                <th className="py-3 px-4 whitespace-nowrap">STATUS</th>
                <th className="py-3 px-4 min-w-[180px]">CLOSE ACTION BUKTI</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    Tidak ada data Inspection yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* ID */}
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {item.id}
                    </td>

                    {/* UNIT ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                        <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>{item.unitId}</span>
                      </div>
                      {item.unitModel && (
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-5">
                          {item.unitModel}
                        </div>
                      )}
                    </td>

                    {/* DATE */}
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.date}</span>
                      </div>
                    </td>

                    {/* FINDINGS (TEMUAN) WITH IMAGE THUMBNAIL */}
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-start gap-2.5">
                        {item.findingsImage && (
                          <button
                            onClick={() => setPreviewImageModal({ url: item.findingsImage!, title: `Gambar Temuan ${item.id}` })}
                            className="shrink-0 group relative cursor-pointer"
                            title="Klik untuk memperbesar gambar temuan"
                          >
                            <img
                              src={item.findingsImage}
                              alt="Temuan"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        )}
                        <div className="min-w-0">
                          <p className="line-clamp-2 max-w-xs font-semibold" title={item.findings}>
                            {item.findings}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={item.notes}>
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* INSPECTOR */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.inspector}</span>
                      </div>
                    </td>

                    {/* PRIORITY */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-black rounded-lg border ${
                        item.priority === 'P1'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          : item.priority === 'P2'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      }`}>
                        {item.priority}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleQuickStatusChange(item, e.target.value as StandaloneInspectionStatus)
                          }
                          className={`appearance-none font-extrabold text-xs px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-hidden ${
                            item.status === 'CLOSED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </div>
                    </td>

                    {/* ACTION CLOSE BUKTI */}
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {item.status === 'CLOSED' ? (
                        <div className="flex items-start gap-2 bg-emerald-50/60 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                          {item.actionImage && (
                            <button
                              onClick={() => setPreviewImageModal({ url: item.actionImage!, title: `Bukti Action ${item.id}` })}
                              className="shrink-0 group relative cursor-pointer"
                              title="Klik untuk memperbesar bukti gambar action"
                            >
                              <img
                                src={item.actionImage}
                                alt="Action Bukti"
                                className="w-9 h-9 object-cover rounded-lg border border-emerald-300 dark:border-emerald-800 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                            </button>
                          )}
                          <div className="text-[11px] min-w-0">
                            <span className="font-extrabold text-emerald-800 dark:text-emerald-300 block truncate">
                              By: {item.actionBy || '-'} ({item.actionDate || '-'})
                            </span>
                            <p className="line-clamp-1 text-slate-600 dark:text-slate-300 text-[10px]" title={item.actionDetails}>
                              {item.actionDetails || 'Selesai ditindaklanjuti'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum di-close</span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailItem(item)}
                          title="Lihat Detail Inspection"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit Inspection"
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          title="Hapus Inspection"
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Input / Edit Standalone Inspection Form */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden transition-all my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingItem ? `Edit Inspection (${editingItem.id})` : 'Input Inspection Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formulir pencatatan temuan inspeksi mandiri dan penanganan action
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInputModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 1: Unit ID, Unit Model, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* UNIT ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UNIT ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="master-units-list-inspection"
                    placeholder="Contoh: DT1204, EX3301"
                    value={formUnitId}
                    onChange={(e) => handleUnitIdChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                  <datalist id="master-units-list-inspection">
                    {masterUnits.map((u) => (
                      <option key={u.id} value={u.unitCode}>
                        {u.unitCode} ({u.unitModel})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* UNIT MODEL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Model <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">(Otomatis)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Auto terisi dari master unit"
                    value={formUnitModel}
                    onChange={(e) => setFormUnitModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>

                {/* DATE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DATE (Tanggal) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* FINDINGS (TEMUAN) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Findings (Temuan) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan detail temuan hasil inspeksi unit secara spesifik..."
                  value={formFindings}
                  onChange={(e) => setFormFindings(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden resize-none"
                  required
                />
              </div>

              {/* GAMBAR TEMUAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gambar Temuan (Upload / URL)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-200 transition-colors shrink-0">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Pilih Foto Temuan</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFindingsImageUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Atau masukkan URL gambar temuan..."
                    value={formFindingsImage}
                    onChange={(e) => setFormFindingsImage(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
                {formFindingsImage && (
                  <div className="mt-2.5 relative inline-block">
                    <img
                      src={formFindingsImage}
                      alt="Preview Temuan"
                      className="w-24 h-24 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setFormFindingsImage('')}
                      className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md"
                      title="Hapus foto temuan"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Grid 2: Inspector, Status, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* INSPECTOR */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Inspector <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama inspektor"
                    value={formInspector}
                    onChange={(e) => setFormInspector(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                    required
                  />
                </div>

                {/* STATUS */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StandaloneInspectionStatus)}
                    className="w-full px-3 py-2 text-xs font-extrabold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="OPEN">OPEN (Belum Ditindaklanjuti)</option>
                    <option value="IN_PROGRESS">IN PROGRESS (Sedang Dikerjakan)</option>
                    <option value="CLOSED">CLOSED (Selesai Ditindaklanjuti)</option>
                  </select>
                </div>

                {/* PRIORITY */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as StandaloneInspectionPriority)}
                    className="w-full px-3 py-2 text-xs font-extrabold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="P1">P1 - Kritis / Urgent</option>
                    <option value="P2">P2 - Sedang / Medium</option>
                    <option value="P3">P3 - Rendah / Low</option>
                  </select>
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan (Notes)
                </label>
                <input
                  type="text"
                  placeholder="Keterangan opsional..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              {/* CONDITIONAL SECTION: ACTION CLOSE DETAILS (Only when status is CLOSED) */}
              {formStatus === 'CLOSED' && (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        Data Pelaksanaan Action Close (Wajib diisi)
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Isikan informasi orang yang mengeksekusi perbaikan beserta bukti gambarnya.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* ACTION BY */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Action By (Pelaksana Action) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Nama pelaksana perbaikan"
                        value={formActionBy}
                        onChange={(e) => setFormActionBy(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        required
                      />
                    </div>

                    {/* TANGGAL ACTION */}
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                        Tanggal Action <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formActionDate}
                        onChange={(e) => setFormActionDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  {/* KEGIATAN YANG DI ACTION */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                      Kegiatan yang di Action <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Uraikan perbaikan/tindakan yang telah selesai dilaksanakan..."
                      value={formActionDetails}
                      onChange={(e) => setFormActionDetails(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden resize-none"
                      required
                    />
                  </div>

                  {/* GAMBAR YANG DI ACTION */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                      Gambar yang di Action (Bukti Foto)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold cursor-pointer hover:bg-emerald-100 transition-colors shrink-0">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>Upload Bukti Action</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleActionImageUpload}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Atau masukkan URL foto bukti action..."
                        value={formActionImage}
                        onChange={(e) => setFormActionImage(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                      />
                    </div>
                    {formActionImage && (
                      <div className="mt-2.5 relative inline-block">
                        <img
                          src={formActionImage}
                          alt="Preview Action"
                          className="w-24 h-24 object-cover rounded-xl border border-emerald-400 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setFormActionImage('')}
                          className="absolute -top-2 -right-2 p-1 bg-rose-600 text-white rounded-full shadow-md"
                          title="Hapus foto bukti action"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detail View Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden transition-all my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-slate-500">{detailItem.id}</span>
                <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md border ${
                  detailItem.priority === 'P1' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  detailItem.priority === 'P2' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  Priority {detailItem.priority}
                </span>
                <span className={`px-2 py-0.5 text-[11px] font-extrabold rounded-md border ${
                  detailItem.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  detailItem.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {detailItem.status}
                </span>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">UNIT ID</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">{detailItem.unitId}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">UNIT MODEL</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.unitModel || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">DATE</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.date}</span>
                </div>
              </div>

              {/* Findings */}
              <div className="space-y-2">
                <span className="text-slate-400 font-bold block text-[11px]">FINDINGS (TEMUAN INSPEKSI)</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-medium leading-relaxed">
                  {detailItem.findings}
                </div>
                {detailItem.findingsImage && (
                  <div className="pt-1">
                    <span className="text-slate-400 font-bold block text-[11px] mb-1">FOTO TEMUAN</span>
                    <img
                      src={detailItem.findingsImage}
                      alt="Gambar Temuan"
                      className="w-full max-h-56 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">INSPECTOR</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.inspector}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">PRIORITY</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.priority}</span>
                </div>
              </div>

              {detailItem.notes && (
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">CATATAN TAMBAHAN</span>
                  <p className="text-slate-600 dark:text-slate-300 font-medium italic">{detailItem.notes}</p>
                </div>
              )}

              {/* Close Action Block */}
              {detailItem.status === 'CLOSED' && (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h5 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                      BUKTI ESEKUSI CLOSE ACTION
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold block">ACTION BY</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{detailItem.actionBy || '-'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold block">TANGGAL ACTION</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.actionDate || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-[11px]">KEGIATAN ACTION</span>
                    <p className="text-slate-800 dark:text-slate-200 font-medium bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      {detailItem.actionDetails || '-'}
                    </p>
                  </div>
                  {detailItem.actionImage && (
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-[11px] mb-1">FOTO BUKTI ACTION</span>
                      <img
                        src={detailItem.actionImage}
                        alt="Gambar Action"
                        className="w-full max-h-56 object-cover rounded-xl border border-emerald-300 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Image Preview Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between p-3.5 bg-slate-950 text-white border-b border-slate-800">
              <span className="font-bold text-xs">{previewImageModal.title}</span>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/50">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Record Inspection?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus record <strong className="font-mono">{deletingId}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
