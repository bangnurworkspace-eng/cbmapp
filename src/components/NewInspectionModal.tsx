import React, { useState, useRef, useMemo } from 'react';
import { Rating, ProgramType, FollowUpStatus, Inspection } from '../types/inspection';
import { getMasterUnits } from '../services/masterUnitService';
import { getMasterComponents } from '../services/masterComponentService';
import {
  X,
  ShieldAlert,
  Save,
  Image as ImageIcon,
  Upload,
  Trash2,
  Camera,
  Link as LinkIcon,
  CheckCircle,
  Lock,
  Building,
  Tag,
  Compass,
  Cpu,
  Gauge,
} from 'lucide-react';

interface NewInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Inspection, 'id' | 'createdAt'>) => Promise<boolean>;
  initialProgram?: ProgramType;
  initialUnitId?: string;
  inspections?: Inspection[];
}

/**
 * Helper to auto-detect machinery model from Unit ID string
 */
function detectModelFromUnitId(input: string, unitMap: Record<string, string>): string | null {
  if (!input || !input.trim()) return null;
  const upper = input.toUpperCase().trim();

  // 1. Direct dictionary match
  if (unitMap[upper]) return unitMap[upper];

  return null;
}

export const NewInspectionModal: React.FC<NewInspectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProgram,
  initialUnitId,
  inspections = [],
}) => {
  const todayStr = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const nextWeekStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Build reactive Unit Code -> Master Unit dictionary from real CSV dataset + Master Models
  const masterUnits = useMemo(() => {
    return getMasterUnits();
  }, [isOpen]);

  // Load Active Master Components dynamically
  const activeComponents = useMemo(() => {
    const all = getMasterComponents();
    return all.filter((c) => c.status === 'ACTIVE');
  }, [isOpen]);

  const unitDetailsMap = useMemo(() => {
    const map: Record<string, { model: string; manufacturer: string; section: string }> = {};

    masterUnits.forEach((u) => {
      if (u.unitCode && u.unitCode.trim()) {
        map[u.unitCode.toUpperCase().trim()] = {
          model: u.unitModel?.trim() || '',
          manufacturer: u.manufacturer?.trim() || '',
          section: u.section?.trim() || '',
        };
      }
    });

    inspections.forEach((i) => {
      if (i.unitId && i.model) {
        const cleanUid = i.unitId.toUpperCase().trim();
        if (!map[cleanUid]) {
          map[cleanUid] = {
            model: i.model.trim(),
            manufacturer: '',
            section: '',
          };
        }
      }
    });

    return map;
  }, [masterUnits, inspections]);

  const knownUnitsList = useMemo(() => {
    const set = new Set<string>(Object.keys(unitDetailsMap));
    return Array.from(set).sort();
  }, [unitDetailsMap]);

  const knownComponentsList = useMemo(() => {
    const list: { id?: string; name: string }[] = [];
    const seen = new Set<string>();

    activeComponents.forEach((c) => {
      const clean = c.componentName?.toUpperCase().trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push({ id: c.id, name: c.componentName.trim() });
      }
    });

    inspections.forEach((i) => {
      const clean = i.component?.toUpperCase().trim();
      if (clean && clean !== '-' && !seen.has(clean)) {
        seen.add(clean);
        list.push({ name: i.component.trim() });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeComponents, inspections]);

  const knownInspectorsList = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((i) => {
      if (i.inspector && i.inspector.trim() && i.inspector !== '-') {
        set.add(i.inspector.trim());
      }
    });
    return Array.from(set).sort();
  }, [inspections]);

  const [date, setDate] = useState<string>(todayStr());
  const [unitId, setUnitId] = useState<string>(initialUnitId || '');
  const [hoursMeter, setHoursMeter] = useState<string>('');
  const [program, setProgram] = useState<ProgramType>(initialProgram || 'PPM');

  const initialDetails = useMemo(() => {
    if (!initialUnitId) return null;
    const clean = initialUnitId.toUpperCase().trim();
    if (unitDetailsMap[clean]) return unitDetailsMap[clean];
    const detectedModel = detectModelFromUnitId(initialUnitId, {});
    return detectedModel ? { model: detectedModel, manufacturer: '', section: '' } : null;
  }, [initialUnitId, unitDetailsMap]);

  const [model, setModel] = useState<string>(initialDetails?.model || '');
  const [manufacturer, setManufacturer] = useState<string>(initialDetails?.manufacturer || '');
  const [section, setSection] = useState<string>(initialDetails?.section || '');
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(Boolean(initialDetails));

  // Component Selection from Master Components
  const [component, setComponent] = useState<string>('');
  const [componentId, setComponentId] = useState<string>('');

  const [findings, setFindings] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('');
  const [rating, setRating] = useState<Rating>('A');
  const [inspector, setInspector] = useState<string>('');
  const [followUp, setFollowUp] = useState<string>('');
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>('OPEN');
  const [dueDate, setDueDate] = useState<string>('');

  // Automatically update and display model, manufacturer & section when Unit Code is selected or typed
  const handleUnitIdChange = (newVal: string) => {
    setUnitId(newVal);
    const clean = newVal.toUpperCase().trim();
    const details = unitDetailsMap[clean];
    if (details) {
      setModel(details.model);
      setManufacturer(details.manufacturer);
      setSection(details.section);
      setIsAutoDetected(true);
    } else {
      const detected = detectModelFromUnitId(newVal, {});
      if (detected) {
        setModel(detected);
        setManufacturer('');
        setSection('');
        setIsAutoDetected(true);
      } else {
        setModel('');
        setManufacturer('');
        setSection('');
        setIsAutoDetected(false);
      }
    }
  };

  // Image handling
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageUrl(result);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to process image file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!unitId.trim()) {
      setErrorMsg('Please specify a valid Unit Code');
      return;
    }
    if (!component.trim()) {
      setErrorMsg('Please select a Component from Master Components');
      return;
    }
    if (!findings.trim()) {
      setErrorMsg('Findings field is required');
      return;
    }
    const isRecommendationRequired = rating === 'C' || rating === 'X';
    if (isRecommendationRequired && !recommendation.trim()) {
      setErrorMsg('Recommendation wajib diisi untuk rating Critical (C) dan Severe (X)');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanUnitCode = unitId.trim().toUpperCase();
      const detectedDetails = unitDetailsMap[cleanUnitCode];
      const finalModel = model.trim() || detectedDetails?.model || detectModelFromUnitId(unitId, {}) || 'Heavy Equipment';
      const payload: Omit<Inspection, 'id' | 'createdAt'> = {
        date,
        unitId: unitId.trim().toUpperCase(),
        hoursMeter: hoursMeter.trim() || undefined,
        program,
        model: finalModel,
        component: component.trim(),
        system: componentId ? `${component.trim()} (${componentId})` : component.trim(),
        findings: findings.trim(),
        recommendation: recommendation.trim(),
        rating,
        status: 'OPEN',
        inspector: inspector.trim(),
        followUp: followUp.trim(),
        followUpStatus,
        dueDate,
        imageUrl: imageUrl.trim() || undefined,
      };

      const success = await onSave(payload);
      if (success) {
        onClose();
      } else {
        setErrorMsg('Failed to record inspection in database.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              New Equipment Inspection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Submit inspection finding to database
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
            {errorMsg && (
              <div className="p-3 text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Row 1: Date, Unit Code & Hours Meter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Inspection Date *
                </label>
                <input
                  type="text"
                  required
                  placeholder="DD/MM/YYYY"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Unit Code *</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Ketik / pilih
                  </span>
                </label>
                <input
                  type="text"
                  required
                  list="fleet-unit-codes-datalist"
                  placeholder="Contoh: EXLB003..."
                  value={unitId}
                  onChange={(e) => handleUnitIdChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="fleet-unit-codes-datalist">
                  {knownUnitsList.map((code) => {
                    const info = unitDetailsMap[code];
                    const label = info?.model ? `${code} (${info.model})` : code;
                    return <option key={code} value={code} label={label} />;
                  })}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Hours Meter (HM)
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    SMR / Hours
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Contoh: 12500"
                    value={hoursMeter}
                    onChange={(e) => setHoursMeter(e.target.value)}
                    className="w-full pl-3 pr-11 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 pointer-events-none">
                    Hrs
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-populated Fleet Specs Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Spesifikasi Armada Terkunci (Auto Master Units)
                </span>
                {isAutoDetected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle className="w-3 h-3" />
                    Terverifikasi Master Units
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Model */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Unit Model
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      placeholder="e.g. R9300 / PC2000-8"
                      value={model}
                      className="w-full pl-3 pr-7 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-bold cursor-not-allowed"
                    />
                    <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* 2. Manufacture */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Manufacture
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      placeholder="e.g. LIEBHERR / KOMATSU"
                      value={manufacturer}
                      className="w-full pl-3 pr-7 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-bold cursor-not-allowed"
                    />
                    <Building className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* 3. Section */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Section
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      placeholder="e.g. BIG DIGGER / SSE"
                      value={section}
                      className="w-full pl-3 pr-7 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-bold cursor-not-allowed"
                    />
                    <Compass className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Program & Component (Manual typing with datalists) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Program CBM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Program CBM *</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Ketik / pilih
                  </span>
                </label>
                <input
                  type="text"
                  required
                  list="new-program-cbm-datalist"
                  placeholder="Contoh: PPM, PPE, FC, dll..."
                  value={program}
                  onChange={(e) => setProgram(e.target.value.toUpperCase() as ProgramType)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="new-program-cbm-datalist">
                  <option value="PPM" label="PPM - Program Mesin" />
                  <option value="PPE" label="PPE - Program Elektrik" />
                  <option value="FC" label="FC - Filter Cutting" />
                  <option value="MP" label="MP - Magnetic Plug" />
                  <option value="CR" label="CR - Cylinder Rating" />
                  <option value="PAP" label="PAP - Analisa Pelumas" />
                  <option value="PPA" label="PPA - Pemeriksaan Attachment" />
                  <option value="PPU" label="PPU - Pemeriksaan Undercarriage" />
                </datalist>
              </div>

              {/* Component Input with Master Components Suggestions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Component *
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Ketik / pilih
                  </span>
                </label>
                <input
                  type="text"
                  required
                  list="new-components-datalist"
                  placeholder="Contoh: ENGINE, RADIATOR, dll..."
                  value={component}
                  onChange={(e) => {
                    const val = e.target.value;
                    setComponent(val);
                    const match = activeComponents.find(
                      (c) => c.componentName.toUpperCase().trim() === val.toUpperCase().trim()
                    );
                    if (match) {
                      setComponentId(match.id);
                    } else {
                      setComponentId('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="new-components-datalist">
                  {knownComponentsList.map((c) => (
                    <option
                      key={c.id ? `${c.id}-${c.name}` : c.name}
                      value={c.name}
                      label={c.id ? `${c.name} (${c.id})` : c.name}
                    />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Row 3: Rating & Inspector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Condition Rating *
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value as Rating)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="A">A - Normal (Safe operating range)</option>
                  <option value="B">B - Caution (Attention / monitor closely)</option>
                  <option value="C">C - Critical (Immediate corrective maintenance)</option>
                  <option value="X">X - Severe (Emergency shutdown / high risk)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Inspector Name</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    Ketik manual
                  </span>
                </label>
                <input
                  type="text"
                  list="new-inspectors-datalist"
                  placeholder="Ketik nama inspector (e.g. Budi Santoso)..."
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="new-inspectors-datalist">
                  {knownInspectorsList.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Findings Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Findings (Deskripsi Temuan Lapangan) *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Jelaskan kondisi fisik, keausan komponen, kebocoran, deviasi atau hasil pengujian..."
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Recommendation Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>
                  Recommendation (Rekomendasi Tindak Lanjut){' '}
                  {rating === 'C' || rating === 'X' ? '*' : '(Opsional)'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {rating === 'C' || rating === 'X'
                    ? 'Wajib untuk Rating C & X'
                    : 'Tidak wajib untuk Rating A & B'}
                </span>
              </label>
              <textarea
                rows={2}
                placeholder={
                  rating === 'C' || rating === 'X'
                    ? 'Wajib: Rekomendasi teknis perbaikan, pergantian part, re-torque, atau penjadwalan...'
                    : 'Opsional: Rekomendasi teknis perbaikan atau pemantauan berkala...'
                }
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Row 4: Follow Up & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Follow Up Action Plan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Order seal kit #4432109 & alokasi bay mekanik"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Target Due Date</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    Opsional
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY (Opsional)"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Photo Attachment Section */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Foto / Dokumentasi Temuan (Opsional)
              </label>

              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 group max-w-sm">
                  <img
                    src={imageUrl}
                    alt="Inspection finding preview"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
                      title="Hapus Gambar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Memproses...' : 'Upload Foto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Tautan URL</span>
                    </button>
                  </div>

                  {showUrlInput && (
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://images.example.com/finding.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Inspection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
