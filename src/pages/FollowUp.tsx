import React, { useState, useMemo, useEffect } from 'react';
import { FollowUpItem, FollowUpTaskStatus, FollowUpPriority } from '../types/followUp';
import {
  getFollowUpItems,
  saveFollowUpItems,
  createFollowUpItem,
  updateFollowUpItem,
  deleteFollowUpItem,
  calculateFollowUpStats,
} from '../services/followUpService';
import { exportFollowUpsToExcel } from '../utils/excelExport';
import { getMasterUnits } from '../services/masterUnitService';
import { getMasterComponents } from '../services/masterComponentService';
import { fetchFollowUpsFromSheets } from '../services/googleSheets';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Cpu,
  Truck,
  Edit3,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ArrowRight,
  Activity,
  Check,
} from 'lucide-react';

interface FollowUpProps {
  startDate?: string;
  endDate?: string;
}

type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type FilterPriority = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const FollowUp: React.FC<FollowUpProps> = ({ startDate = '', endDate = '' }) => {
  // Items state from standalone service
  const [items, setItems] = useState<FollowUpItem[]>(() => getFollowUpItems());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('ALL');

  // Modal States
  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<FollowUpItem | null>(null);
  const [detailItem, setDetailItem] = useState<FollowUpItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State for Input Follow Up
  const [formUnitId, setFormUnitId] = useState<string>('');
  const [formUnitModel, setFormUnitModel] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formComponent, setFormComponent] = useState<string>('');
  const [formAction, setFormAction] = useState<string>('');
  const [formInspector, setFormInspector] = useState<string>('');
  const [formStatus, setFormStatus] = useState<FollowUpTaskStatus>('OPEN');
  const [formPriority, setFormPriority] = useState<FollowUpPriority>('MEDIUM');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Master options for easy selection in form
  const masterUnits = useMemo(() => getMasterUnits(), []);
  const masterComponents = useMemo(() => getMasterComponents(), []);

  // Sync / refresh items from Google Sheets on mount
  useEffect(() => {
    let isMounted = true;
    fetchFollowUpsFromSheets().then((remote) => {
      if (isMounted && remote && remote.length > 0) {
        saveFollowUpItems(remote);
        setItems(remote);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const reloadData = () => {
    setItems(getFollowUpItems());
  };

  // Dedicated Dashboard Stats calculation
  const stats = useMemo(() => {
    return calculateFollowUpStats(items);
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
      if (priorityFilter !== 'ALL' && (item.priority || 'MEDIUM') !== priorityFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = `${item.id} ${item.unitId} ${item.unitModel || ''} ${item.date} ${item.component} ${item.followUpAction} ${item.inspector} ${item.notes || ''}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [items, startDate, endDate, statusFilter, priorityFilter, searchQuery]);

  // Handle auto-populating Unit Model when Unit ID changes
  const handleUnitIdChange = (val: string) => {
    const clean = val.toUpperCase();
    setFormUnitId(clean);

    // Auto-lookup Unit Model from master units
    const matched = masterUnits.find(
      (u) => u.unitCode.trim().toUpperCase() === clean.trim()
    );
    if (matched && matched.unitModel) {
      setFormUnitModel(matched.unitModel);
    }
  };

  // Open Form for Adding New Follow Up
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormUnitId('');
    setFormUnitModel('');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormComponent('');
    setFormAction('');
    setFormInspector('');
    setFormStatus('OPEN');
    setFormPriority('MEDIUM');
    setFormDueDate('');
    setFormNotes('');
    setFormError('');
    setIsInputModalOpen(true);
  };

  // Open Form for Editing Existing Follow Up
  const handleOpenEditModal = (item: FollowUpItem) => {
    setEditingItem(item);
    setFormUnitId(item.unitId || '');
    setFormUnitModel(item.unitModel || '');
    setFormDate(item.date || new Date().toISOString().slice(0, 10));
    setFormComponent(item.component || '');
    setFormAction(item.followUpAction || '');
    setFormInspector(item.inspector || '');
    setFormStatus(item.status || 'OPEN');
    setFormPriority(item.priority || 'MEDIUM');
    setFormDueDate(item.dueDate || '');
    setFormNotes(item.notes || '');
    setFormError('');
    setIsInputModalOpen(true);
  };

  // Save / Submit Input Follow Up
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanUnit = formUnitId.trim();
    const cleanModel = formUnitModel.trim();
    const cleanDate = formDate.trim();
    const cleanComp = formComponent.trim();
    const cleanAction = formAction.trim();
    const cleanInspector = formInspector.trim();

    if (!cleanUnit) {
      setFormError('UNIT ID wajib diisi');
      return;
    }
    if (!cleanDate) {
      setFormError('DATE wajib diisi');
      return;
    }
    if (!cleanComp) {
      setFormError('Component wajib diisi');
      return;
    }
    if (!cleanAction) {
      setFormError('Follow Up Action wajib diisi');
      return;
    }
    if (!cleanInspector) {
      setFormError('Inspector wajib diisi');
      return;
    }

    if (editingItem) {
      const updatedItem: FollowUpItem = {
        ...editingItem,
        unitId: cleanUnit,
        unitModel: cleanModel || undefined,
        date: cleanDate,
        component: cleanComp,
        followUpAction: cleanAction,
        inspector: cleanInspector,
        status: formStatus,
        priority: formPriority,
        dueDate: formDueDate.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      const newList = updateFollowUpItem(updatedItem);
      setItems(newList);
      showToast(`Follow Up ${editingItem.id} berhasil diperbarui!`);
    } else {
      createFollowUpItem({
        unitId: cleanUnit,
        unitModel: cleanModel || undefined,
        date: cleanDate,
        component: cleanComp,
        followUpAction: cleanAction,
        inspector: cleanInspector,
        status: formStatus,
        priority: formPriority,
        dueDate: formDueDate.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
      setItems(getFollowUpItems());
      showToast('Follow Up baru berhasil ditambahkan!');
    }

    setIsInputModalOpen(false);
  };

  // Quick Status Change directly from table
  const handleQuickStatusChange = (item: FollowUpItem, newStatus: FollowUpTaskStatus) => {
    const updated = updateFollowUpItem({ ...item, status: newStatus });
    setItems(updated);
    showToast(`Status ${item.id} diubah ke ${newStatus}`, 'info');
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingId) return;
    const updated = deleteFollowUpItem(deletingId);
    setItems(updated);
    setDeletingId(null);
    showToast('Data Follow Up berhasil dihapus.', 'info');
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
            <ClipboardCheck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Follow Up Management Dashboard
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportFollowUpsToExcel(filteredItems)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-2xs"
            title="Export data Follow Up ke File Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>+ Input Follow Up</span>
          </button>
        </div>
      </div>

      {/* Standalone Dashboard Stats Cards */}
      <section aria-label="Follow Up Dashboard Overview" className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {/* Card 1: Total Tasks */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Tasks
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500 font-medium">Record(s)</span>
          </div>
        </div>

        {/* Card 2: Open Status */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Open (Pending)
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/60">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.open}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.total > 0 ? `${Math.round((stats.open / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-900/40 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {stats.inProgress}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.total > 0 ? `${Math.round((stats.inProgress / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: Closed / Completed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Closed (Completed)
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.closed}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.total > 0 ? `${Math.round((stats.closed / stats.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area: Search, Filters, and Data Table */}
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
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Controls: Priority Filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Priority Filter Dropdown */}
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:border-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Priority: All</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-60 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Unit ID, Component, Action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Follow Up Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">NO / ID</th>
                <th className="py-3 px-4 whitespace-nowrap">UNIT ID</th>
                <th className="py-3 px-4 whitespace-nowrap">DATE</th>
                <th className="py-3 px-4 whitespace-nowrap">COMPONENT</th>
                <th className="py-3 px-4 min-w-[220px]">FOLLOW UP ACTION</th>
                <th className="py-3 px-4 whitespace-nowrap">INSPECTOR</th>
                <th className="py-3 px-4 whitespace-nowrap">STATUS</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    Tidak ada data Follow Up yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
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
                        <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
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

                    {/* COMPONENT */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>{item.component}</span>
                      </div>
                    </td>

                    {/* FOLLOW UP ACTION */}
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <p className="line-clamp-2 max-w-sm" title={item.followUpAction}>
                        {item.followUpAction}
                      </p>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={item.notes}>
                          Note: {item.notes}
                        </p>
                      )}
                    </td>

                    {/* INSPECTOR */}
                    <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.inspector}</span>
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleQuickStatusChange(item, e.target.value as FollowUpTaskStatus)
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

                    {/* ACTIONS */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailItem(item)}
                          title="Lihat Detail Follow Up"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit Follow Up"
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          title="Hapus Follow Up"
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

      {/* MODAL 1: Input / Edit Follow Up Form */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden transition-all">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingItem ? `Edit Follow Up (${editingItem.id})` : 'Input Follow Up Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Isi detail rencana dan tindakan follow up unit operasional
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
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* UNIT ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    UNIT ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="master-units-list"
                    placeholder="Contoh: DT1204, EX3301"
                    value={formUnitId}
                    onChange={(e) => handleUnitIdChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <datalist id="master-units-list">
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
                    Unit Model <span className="text-xs font-medium text-blue-600 dark:text-blue-400">(Otomatis)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Auto terisi dari master unit"
                    value={formUnitModel}
                    onChange={(e) => setFormUnitModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* DATE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DATE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              {/* COMPONENT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Component <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="master-components-list"
                  placeholder="Contoh: Engine Turbocharger, Hydraulic Pump"
                  value={formComponent}
                  onChange={(e) => setFormComponent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <datalist id="master-components-list">
                  {masterComponents.map((c) => (
                    <option key={c.id} value={c.componentName} />
                  ))}
                </datalist>
              </div>

              {/* FOLLOW UP ACTION */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Follow Up Action <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi tindakan perbaikan atau pemeliharaan yang harus/telah dilakukan..."
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* INSPECTOR */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Inspector <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nama inspektor penanggung jawab"
                    value={formInspector}
                    onChange={(e) => setFormInspector(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
                    onChange={(e) => setFormStatus(e.target.value as FollowUpTaskStatus)}
                    className="w-full px-3 py-2 text-xs font-extrabold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="OPEN">OPEN (Belum Dikerjakan)</option>
                    <option value="IN_PROGRESS">IN PROGRESS (Sedang Dikerjakan)</option>
                    <option value="CLOSED">CLOSED (Selesai)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PRIORITY */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as FollowUpPriority)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                  >
                    <option value="HIGH">HIGH (Tinggi)</option>
                    <option value="MEDIUM">MEDIUM (Sedang)</option>
                    <option value="LOW">LOW (Rendah)</option>
                  </select>
                </div>

                {/* DUE DATE */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date (Target Selesai)
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan (Notes)
                </label>
                <input
                  type="text"
                  placeholder="Opsional: Keterangan sparepart, garansi, dsb."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-hidden"
                />
              </div>

              {/* Modal Actions */}
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
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Follow Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detail View Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden transition-all">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-slate-500">{detailItem.id}</span>
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

            <div className="p-5 space-y-3.5 text-xs">
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

              <div>
                <span className="text-slate-400 font-bold block text-[11px] mb-0.5">COMPONENT</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{detailItem.component}</p>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[11px] mb-0.5">FOLLOW UP ACTION</span>
                <div className="p-3 bg-blue-50/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium rounded-xl border border-blue-100 dark:border-slate-700 leading-relaxed">
                  {detailItem.followUpAction}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">INSPECTOR</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.inspector}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">PRIORITY</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailItem.priority || 'MEDIUM'}</span>
                </div>
              </div>

              {detailItem.dueDate && (
                <div>
                  <span className="text-slate-400 font-bold block text-[11px]">TARGET DUE DATE</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{detailItem.dueDate}</span>
                </div>
              )}

              {detailItem.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-bold block text-[11px]">NOTES</span>
                  <p className="text-slate-600 dark:text-slate-300 font-medium italic">{detailItem.notes}</p>
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

      {/* MODAL 3: Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Record Follow Up?
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
