import React, { useState } from 'react';
import { Inspection } from '../types/inspection';
import { RatingBadge } from './RatingBadge';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: Inspection | null;
  onConfirmDelete: (id: string) => Promise<void>;
}

export const DeleteInspectionModal: React.FC<DeleteInspectionModalProps> = ({
  isOpen,
  onClose,
  inspection,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !inspection) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(inspection.id);
      onClose();
    } catch (err) {
      console.error('Delete inspection failed', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 dark:border-rose-950/60 bg-rose-50/70 dark:bg-rose-950/30">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hapus Data Inspeksi
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Konfirmasi penghapusan data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin menghapus data inspeksi berikut dari sistem & database?
          </p>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {inspection.id}
              </span>
              <RatingBadge rating={inspection.rating} />
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              {inspection.unitId} <span className="font-normal text-xs text-slate-500">({inspection.model})</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Program:</span> {inspection.program} | <span className="font-semibold">Tanggal:</span> {inspection.date}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Komponen:</span> {inspection.component}
            </div>
            {inspection.findings && (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic pt-1 border-t border-slate-200 dark:border-slate-700">
                "{inspection.findings}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800/60">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Tindakan ini permanen dan akan menghapus catatan dari penyimpanan.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
