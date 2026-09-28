import React from 'react';
import {
  Menu,
  Plus,
  MapPin,
  ChevronDown,
  RefreshCw,
  Search,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Calendar,
  X,
  Filter,
  Download,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { Rating } from '../types/inspection';
import { PageId } from './Sidebar';
import { BrandingSettings } from '../services/brandingService';

interface HeaderProps {
  title: string;
  currentPage?: PageId;
  onSelectPage?: (page: PageId) => void;
  models: string[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
  selectedRating: string; // 'ALL' | 'A' | 'B' | 'C' | 'X'
  onSelectRating: (rating: string) => void;
  componentsList?: string[];
  selectedComponent?: string;
  onSelectComponent?: (component: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  onClearDateRange?: () => void;
  onOpenNewInspection: () => void;
  onToggleMobileMenu: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  branding?: BrandingSettings;
  onExportExcel?: () => void;
  isProtectedUnlocked?: boolean;
  onLockSession?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  currentPage = 'dashboard',
  onSelectPage,
  models,
  selectedModel,
  onSelectModel,
  selectedRating,
  onSelectRating,
  componentsList = [],
  selectedComponent = 'ALL',
  onSelectComponent,
  searchQuery,
  onSearchChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  onClearDateRange,
  onOpenNewInspection,
  onToggleMobileMenu,
  onRefresh,
  isRefreshing,
  theme = 'light',
  onToggleTheme,
  isFullscreen = false,
  onToggleFullscreen,
  branding,
  onExportExcel,
  isProtectedUnlocked = false,
  onLockSession,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 transition-colors shadow-2xs">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Title & Project Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-300 rounded-lg md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {branding?.faviconUrl && (
                <img
                  src={branding.faviconUrl}
                  alt="Page Logo"
                  className="w-6 h-6 object-contain rounded-md shrink-0"
                />
              )}
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl truncate">
                {title}
              </h1>

              {/* Project Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                {branding?.headerBadgeLogoUrl ? (
                  <img
                    src={branding.headerBadgeLogoUrl}
                    alt="Badge Logo"
                    className="w-3.5 h-3.5 object-contain rounded-full"
                  />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{branding?.headerBadgeText || 'Tabang Mining Project'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Search, Date Range Filter, Filters, Fullsize, Theme & Action Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[140px] sm:min-w-[170px] lg:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search unit, finding..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-850 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Date Range Picker Controls ("Tarik Tanggal Sekian Hingga Sekian") */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 pl-1.5 text-xs font-semibold shrink-0">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Periode:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
              className="px-2 py-1 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
              title="Tanggal Mulai (Dari)"
            />
            <span className="text-xs text-slate-400 font-bold px-0.5">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
              className="px-2 py-1 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
              title="Tanggal Akhir (Sampai)"
            />
            {(startDate || endDate) && onClearDateRange && (
              <button
                onClick={onClearDateRange}
                title="Clear Date Filter"
                className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Model Filter */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Model: All Models</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </div>

          {/* Condition Filter */}
          <div className="relative">
            <select
              value={selectedRating}
              onChange={(e) => onSelectRating(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Condition: All Ratings</option>
              <option value="A">A - Normal</option>
              <option value="B">B - Caution</option>
              <option value="C">C - Critical</option>
              <option value="X">X - Severe</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </div>

          {/* Component Filter (Dashboard & Inspection Pages) */}
          {onSelectComponent && (
            <div className="relative">
              <select
                value={selectedComponent}
                onChange={(e) => onSelectComponent(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs max-w-[160px] truncate"
              >
                <option value="ALL">Component: All</option>
                {componentsList.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
          )}

          {/* Fullsize Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Keluar Fullsize (Exit Fullscreen)' : 'Layar Penuh / Fullsize'}
              className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>
          )}

          {/* Theme Toggle (Dark / Light) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            className="p-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`}
            />
          </button>

          {/* Session Lock Button */}
          {isProtectedUnlocked && onLockSession && (
            <button
              onClick={onLockSession}
              title="Kunci Kembali Akses Master Data & Settings"
              className="p-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/80 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4 text-amber-500 stroke-[2.5]" />
              <span className="hidden md:inline text-xs font-bold">Kunci Akses</span>
            </button>
          )}

          {/* Export Excel Button */}
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              title="Export Data ke File Excel (.xlsx)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 active:scale-95 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-2xs transition-all duration-150 shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline">Export Excel</span>
            </button>
          )}

          {/* + New Inspection Button */}
          <button
            onClick={onOpenNewInspection}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-black text-slate-950 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-lg shadow-md shadow-amber-500/20 hover:shadow-lg transition-all duration-150 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>New Inspection</span>
          </button>
        </div>
      </div>
    </header>
  );
};
