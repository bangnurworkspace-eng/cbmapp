import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Code,
  Copy,
  Check,
  RotateCcw,
  Shield,
  Palette,
  Image as ImageIcon,
  Upload,
  Trash2,
  Save,
  FileText,
  Sparkles,
  Layers,
  Lock,
  KeyRound,
} from 'lucide-react';
import {
  getGoogleAppsScriptUrl,
  setGoogleAppsScriptUrl,
  getSampleAppsScriptCode,
  resetToDemoData,
} from '../services/googleSheets';
import {
  BrandingSettings,
  DEFAULT_BRANDING_SETTINGS,
  resetBrandingSettings,
} from '../services/brandingService';
import kmmsLogoSvg from '../assets/kmms-logo.svg';

interface SettingsProps {
  onRefreshData: () => Promise<void>;
  lastSynced: Date | null;
  refreshInterval: number; // in milliseconds
  onUpdateRefreshInterval: (interval: number) => void;
  isSheetsConnected: boolean;
  branding: BrandingSettings;
  onUpdateBranding: (settings: BrandingSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  onRefreshData,
  lastSynced,
  refreshInterval,
  onUpdateRefreshInterval,
  isSheetsConnected,
  branding,
  onUpdateBranding,
}) => {
  // Database connection states
  const [scriptUrl, setScriptUrlState] = useState<string>(getGoogleAppsScriptUrl());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Branding states
  const [localBranding, setLocalBranding] = useState<BrandingSettings>(branding);
  const [brandingSaved, setBrandingSaved] = useState<boolean>(false);

  // Password Management states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passStatus, setPassStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentStoredPass = localStorage.getItem('cbm_app_password') || 'cbmwebapp';
    if (oldPassword !== currentStoredPass) {
      setPassStatus({ success: false, message: 'Password lama tidak sesuai!' });
      return;
    }
    if (!newPassword || newPassword.trim().length < 4) {
      setPassStatus({ success: false, message: 'Password baru minimal 4 karakter!' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassStatus({ success: false, message: 'Konfirmasi password baru tidak cocok!' });
      return;
    }

    localStorage.setItem('cbm_app_password', newPassword.trim());
    setPassStatus({ success: true, message: 'Password otorisasi berhasil diperbarui!' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPassStatus(null), 4000);
  };

  // File upload refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const splashLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const badgeLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalBranding(branding);
  }, [branding]);

  // Handle Logo Upload (Base64)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: 'appLogoUrl' | 'splashLogoUrl' | 'faviconUrl' | 'headerBadgeLogoUrl'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih file gambar yang valid (PNG, JPG, JPEG, SVG, WEBP).');
      return;
    }

    // Limit file size to 2MB for base64 storage
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file gambar maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setLocalBranding((prev) => ({
        ...prev,
        [targetField]: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    onUpdateBranding(localBranding);
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 3000);
  };

  const handleResetBrandingToDefault = () => {
    if (confirm('Kembalikan semua logo, nama aplikasi, dan nama halaman ke pengaturan default?')) {
      const def = resetBrandingSettings();
      setLocalBranding(def);
      onUpdateBranding(def);
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 3000);
    }
  };

  const handleSaveUrl = () => {
    setGoogleAppsScriptUrl(scriptUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onRefreshData();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testTarget = scriptUrl.trim();
    if (!testTarget) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: 'Please enter a Web App URL first.',
      });
      return;
    }

    try {
      const url = new URL(testTarget);
      url.searchParams.set('action', 'getInspections');
      url.searchParams.set('t', Date.now().toString());

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      if (json && (json.success === true || Array.isArray(json.data) || Array.isArray(json))) {
        setTestResult({
          success: true,
          message: 'Connection successful! Verified Web App API responding with valid JSON.',
        });
        setGoogleAppsScriptUrl(testTarget);
        onRefreshData();
      } else {
        throw new Error(json.message || 'Invalid JSON format received from Web App API');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection test failed: ${err.message}. Verify Web App access is set to "Anyone".`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getSampleAppsScriptCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleResetDemo = () => {
    if (confirm('Reset fleet inspection database to initial Tabang Mining Project demo records?')) {
      resetToDemoData();
      onRefreshData();
    }
  };

  const formatLastSync = (d: Date | null) => {
    if (!d) return 'Not synced yet';
    return (
      d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) + `, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
  };

  return (
    <div className="max-w-4xl space-y-6 w-full min-w-0 pb-12">
      {/* Settings Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3.5 transition-colors">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 shrink-0">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {localBranding.pageTitles?.settings || 'System & Database Settings'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kustomisasi logo & identitas aplikasi, sinkronisasi database, dan preferensi sistem
          </p>
        </div>
      </div>

      {/* SECTION 1: Kustomisasi Logo & Identitas Aplikasi */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Kustomisasi Logo & Identitas Aplikasi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ubah logo sidebar, logo halaman / favicon, nama aplikasi, dan judul-judul halaman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetBrandingToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset ke Default
          </button>
        </div>

        {/* 1.1 Logo Aplikasi, Logo Splash Screen & Logo Halaman Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Logo Aplikasi (Sidebar) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Logo Sidebar & Header
              </label>
              {localBranding.appLogoUrl && (
                <button
                  type="button"
                  onClick={() => setLocalBranding((p) => ({ ...p, appLogoUrl: '' }))}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Hapus
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#0F172A] border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {localBranding.appLogoUrl ? (
                  <img
                    src={localBranding.appLogoUrl}
                    alt="App Logo Preview"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Shield className="w-7 h-7 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'appLogoUrl')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Upload Logo Sidebar
                </button>
                <input
                  type="text"
                  placeholder="Atau tempel URL gambar logo..."
                  value={localBranding.appLogoUrl}
                  onChange={(e) =>
                    setLocalBranding((p) => ({ ...p, appLogoUrl: e.target.value }))
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Logo Splash Screen (Aplikasi Pertama Buka) */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Logo Splash Screen (Awal)
              </label>
              {localBranding.splashLogoUrl && (
                <button
                  type="button"
                  onClick={() => setLocalBranding((p) => ({ ...p, splashLogoUrl: '' }))}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Reset Default
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-slate-950 border border-emerald-600/50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
                <img
                  src={localBranding.splashLogoUrl && localBranding.splashLogoUrl.trim() ? localBranding.splashLogoUrl : kmmsLogoSvg}
                  alt="Splash Logo Preview"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,200,0,0.5)]"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="file"
                  ref={splashLogoInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'splashLogoUrl')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => splashLogoInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Logo Splash
                </button>
                <input
                  type="text"
                  placeholder="Atau tempel URL gambar logo..."
                  value={localBranding.splashLogoUrl || ''}
                  onChange={(e) =>
                    setLocalBranding((p) => ({ ...p, splashLogoUrl: e.target.value }))
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Logo Halaman / Favicon */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Logo Favicon / Browser Tab
              </label>
              {localBranding.faviconUrl && (
                <button
                  type="button"
                  onClick={() => setLocalBranding((p) => ({ ...p, faviconUrl: '' }))}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Hapus
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {localBranding.faviconUrl ? (
                  <img
                    src={localBranding.faviconUrl}
                    alt="Favicon Preview"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Sparkles className="w-7 h-7 text-amber-500" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="file"
                  ref={faviconInputRef}
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'faviconUrl')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Upload Favicon Icon
                </button>
                <input
                  type="text"
                  placeholder="Atau tempel URL favicon/icon..."
                  value={localBranding.faviconUrl}
                  onChange={(e) =>
                    setLocalBranding((p) => ({ ...p, faviconUrl: e.target.value }))
                  }
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 1.2 Nama Aplikasi, Subjudul, Project Badge & Watermark Credit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Nama Aplikasi
            </label>
            <input
              type="text"
              placeholder="e.g. CBM WEB APP"
              value={localBranding.appName}
              onChange={(e) =>
                setLocalBranding((p) => ({ ...p, appName: e.target.value }))
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Subjudul Aplikasi
            </label>
            <input
              type="text"
              placeholder="e.g. Condition-Based Monitoring"
              value={localBranding.appSubtitle}
              onChange={(e) =>
                setLocalBranding((p) => ({ ...p, appSubtitle: e.target.value }))
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Nama Project / Lokasi Header
            </label>
            <input
              type="text"
              placeholder="e.g. Tabang Mining Project"
              value={localBranding.headerBadgeText}
              onChange={(e) =>
                setLocalBranding((p) => ({ ...p, headerBadgeText: e.target.value }))
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Watermark / Credit Text
            </label>
            <input
              type="text"
              placeholder="e.g. Credit by @BangNur"
              value={localBranding.creditText ?? 'Credit by @BangNur'}
              onChange={(e) =>
                setLocalBranding((p) => ({ ...p, creditText: e.target.value }))
              }
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* 1.3 Kustomisasi Nama Halaman */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Kustomisasi Judul & Nama Halaman
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Halaman Dashboard
              </span>
              <input
                type="text"
                value={localBranding.pageTitles?.dashboard || ''}
                onChange={(e) =>
                  setLocalBranding((p) => ({
                    ...p,
                    pageTitles: { ...p.pageTitles, dashboard: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Halaman Master Inspections
              </span>
              <input
                type="text"
                value={localBranding.pageTitles?.inspections || ''}
                onChange={(e) =>
                  setLocalBranding((p) => ({
                    ...p,
                    pageTitles: { ...p.pageTitles, inspections: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Halaman Master Units
              </span>
              <input
                type="text"
                value={localBranding.pageTitles?.['master-units'] || ''}
                onChange={(e) =>
                  setLocalBranding((p) => ({
                    ...p,
                    pageTitles: { ...p.pageTitles, 'master-units': e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Halaman Master Components
              </span>
              <input
                type="text"
                value={localBranding.pageTitles?.['master-components'] || ''}
                onChange={(e) =>
                  setLocalBranding((p) => ({
                    ...p,
                    pageTitles: { ...p.pageTitles, 'master-components': e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Halaman Trend & Analytics
              </span>
              <input
                type="text"
                value={localBranding.pageTitles?.trend || ''}
                onChange={(e) =>
                  setLocalBranding((p) => ({
                    ...p,
                    pageTitles: { ...p.pageTitles, trend: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Halaman Settings
              </span>
              <input
                type="text"
                value={localBranding.pageTitles?.settings || ''}
                onChange={(e) =>
                  setLocalBranding((p) => ({
                    ...p,
                    pageTitles: { ...p.pageTitles, settings: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Simpan Branding Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <div>
            {brandingSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" /> Pengaturan identitas & logo berhasil disimpan!
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveBranding}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Branding
          </button>
        </div>
      </div>

      {/* SECTION 2: Database Connection */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Database Connection (Web App API)
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              isSheetsConnected
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSheetsConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {isSheetsConnected ? 'Live Synchronized' : 'Offline / Standalone Mode'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          CBM WEB APP terintegrasi langsung dengan Google Spreadsheet sebagai database utama untuk menyimpan seluruh data inspeksi, master unit, dan master komponen secara real-time.
        </p>

        {/* Google Spreadsheet Target Info */}
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Target Spreadsheet ID:
            </span>
            <a
              href="https://docs.google.com/spreadsheets/d/1Xdhei2rVDYYsWhLh8YahZj1G8qgvjM4_Zbw-H51wTvw/edit"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Buka Google Sheet &rarr;
            </a>
          </div>
          <code className="block p-2 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 border border-blue-100 dark:border-blue-900/50 select-all">
            1Xdhei2rVDYYsWhLh8YahZj1G8qgvjM4_Zbw-H51wTvw
          </code>
          <p className="text-[11px] text-blue-800 dark:text-blue-300">
            Seluruh data yang diinput di aplikasi ini tersimpan dan tersinkronisasi otomatis dengan Google Spreadsheet ID di atas.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Web App API URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={scriptUrl}
              onChange={(e) => setScriptUrlState(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveUrl}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              {saveSuccess ? 'Saved!' : 'Save URL'}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-slate-300 dark:border-slate-700 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Apps Script Setup Guide */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Ready-to-Deploy Backend Script
            </span>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Open Apps Script Editor &rarr; Replace default code with this script &rarr; Deploy as <strong>Web App</strong> (Execute as: <em>Me</em>, Who has access: <em>Anyone</em>) &rarr; Paste generated URL above.
          </p>
        </div>
      </div>

      {/* SECTION 3: Sync & Refresh Interval */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Synchronization & Auto-Refresh Frequency
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Automatic Refresh Interval
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => onUpdateRefreshInterval(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value={10000}>10 seconds</option>
              <option value={30000}>30 seconds (Default)</option>
              <option value={60000}>60 seconds (1 minute)</option>
              <option value={300000}>5 minutes</option>
              <option value={0}>Disabled (Manual only)</option>
            </select>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Background polling keeps fleet ratings live without interrupting active user forms.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Last Successful Synchronization
            </label>
            <div className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
              {formatLastSync(lastSynced)}
            </div>
            <button
              onClick={() => onRefreshData()}
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Now Asynchronously
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3.5: Security & Password Management */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Lock className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Keamanan & Password Otorisasi (Master Data & Settings)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Atur password pelindung untuk membuka halaman Master Units, Master Components, dan Settings
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {passStatus && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                passStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              {passStatus.success ? <Check className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
              <span>{passStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Password Saat Ini
              </label>
              <input
                type="password"
                placeholder="Masukkan password saat ini..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Password Baru
              </label>
              <input
                type="password"
                placeholder="Masukkan password baru..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                placeholder="Ulangi password baru..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>Simpan Password Baru</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: Application & Environment Information */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Application & Fleet Profile
            </h3>
          </div>
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Local Inspection Cache
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold block uppercase text-[10px]">
              App Name
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {localBranding.appName}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold block uppercase text-[10px]">
              Project Assignment
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {localBranding.headerBadgeText}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold block uppercase text-[10px]">
              Condition Ratings
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              A, B, C, X Standard
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
