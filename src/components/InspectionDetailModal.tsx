import React, { useState } from 'react';
import { Inspection, FollowUpStatus } from '../types/inspection';
import { RatingBadge } from './RatingBadge';
import { X, Calendar, User, Truck, CheckCircle, Clock, Edit3, Trash2 } from 'lucide-react';

interface InspectionDetailModalProps {
  inspection: Inspection | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (updated: Inspection) => Promise<void>;
  onEdit?: (inspection: Inspection) => void;
  onDelete?: (inspection: Inspection) => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  inspection,
  isOpen,
  onClose,
  onUpdateStatus,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !inspection) return null;

  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(inspection.followUpStatus);
  const [followUpText, setFollowUpText] = useState<string>(inspection.followUp || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleSaveUpdate = async () => {
    setIsUpdating(true);
    try {
      const updated: Inspection = {
        ...inspection,
        followUp: followUpText,
        followUpStatus,
        status: 'OPEN',
      };
      await onUpdateStatus(updated);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
              {inspection.id}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{inspection.unitId}</span>
                <span className="text-slate-400 dark:text-slate-600 font-normal">|</span>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{inspection.model}</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
          {/* Key metadata banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Program</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{inspection.program}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Hours Meter</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-mono">
                {inspection.hoursMeter ? `${Number(inspection.hoursMeter).toLocaleString()} Hrs` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Inspection Date</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">{inspection.date}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Inspector</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs sm:text-sm">{inspection.inspector || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase block">Condition</span>
              <RatingBadge rating={inspection.rating} />
            </div>
          </div>

          {/* Component */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Component {inspection.system ? `& System` : ''}
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {inspection.component}
              {inspection.system && (
                <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                  — {inspection.system}
                </span>
              )}
            </p>
          </div>

          {/* Inspection Image (if available) */}
          {inspection.imageUrl && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-950/40 p-3 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Foto / Bukti Temuan Lapangan (Inspection Photo)
              </span>
              <div className="relative group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-black max-h-72 flex items-center justify-center">
                <img
                  src={inspection.imageUrl}
                  alt={`Finding for ${inspection.unitId}`}
                  className="w-full max-h-72 object-cover object-center group-hover:scale-102 transition-transform duration-300"
                />
              </div>
            </div>
          )}

          {/* Findings */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-800/40">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-1">
              Inspection Findings
            </span>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{inspection.findings}</p>
          </div>

          {/* Recommendation */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/25 border border-blue-200/60 dark:border-blue-800/40">
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider block mb-1">
              Maintenance Recommendation
            </span>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{inspection.recommendation}</p>
          </div>

          {/* Follow Up Section with Quick Status Update */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Follow Up Action & Status
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Action / Resolution Log
              </label>
              <textarea
                rows={2}
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="Log follow up activity..."
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Follow Up Status
                </label>
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value as FollowUpStatus)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPEN">OPEN (Belum Selesai)</option>
                  <option value="CLOSED">CLOSED (Selesai / Ditutup)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Due Date
                </label>
                <div className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-mono">
                  {inspection.dueDate || 'Not specified'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(inspection);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(inspection);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-900/60 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Data</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleSaveUpdate}
              disabled={isUpdating}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isUpdating ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
