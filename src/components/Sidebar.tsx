import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Cog,
  Zap,
  Filter,
  Magnet,
  GitBranch,
  FlaskConical,
  Boxes,
  Layers,
  ClipboardCheck,
  History,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
  Cpu,
  Truck,
  FolderTree,
  ChevronDown,
} from 'lucide-react';
import { BrandingSettings } from '../services/brandingService';

export type PageId =
  | 'dashboard'
  | 'inspection'
  | 'master-units'
  | 'master-component'
  | 'ppm'
  | 'ppe'
  | 'fc'
  | 'mp'
  | 'cr'
  | 'pap'
  | 'ppa'
  | 'ppu'
  | 'followup'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isSheetsConnected?: boolean;
  branding?: BrandingSettings;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  isSheetsConnected = true,
  branding,
}) => {
  const isMasterDataActive =
    currentPage === 'master-units' ||
    currentPage === 'master-component';

  const [masterDataOpen, setMasterDataOpen] = useState<boolean>(true);

  // Keep Master Data submenu expanded when an item inside it is active
  useEffect(() => {
    if (isMasterDataActive) {
      setMasterDataOpen(true);
    }
  }, [isMasterDataActive]);

  const handleNavClick = (id: PageId) => {
    onSelectPage(id);
    onCloseMobile();
  };

  const pilarPrograms: NavItem[] = [
    { id: 'ppm', label: 'Program Mesin (PPM)', icon: Cog },
    { id: 'ppe', label: 'Program Elektrik (PPE)', icon: Zap },
    { id: 'fc', label: 'Filter Cutting (FC)', icon: Filter },
    { id: 'mp', label: 'Magnetic Plug (MP)', icon: Magnet },
    { id: 'cr', label: 'Cylinder Rating (CR)', icon: GitBranch },
    { id: 'pap', label: 'Program Analisa Pelumas (PAP)', icon: FlaskConical },
    { id: 'ppa', label: 'Pemeriksaan Attachment (PPA)', icon: Boxes },
    { id: 'ppu', label: 'Pemeriksaan Undercarriage (PPU)', icon: Layers },
  ];

  const masterDataItems: NavItem[] = [
    { id: 'master-units', label: 'Master Units', icon: Truck },
    { id: 'master-component', label: 'Master Components', icon: Cpu },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0B0F19] text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800 shadow-xl md:static ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header / Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-[#070B14]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 shrink-0 overflow-hidden font-extrabold">
              {branding?.appLogoUrl ? (
                <img
                  src={branding.appLogoUrl}
                  alt="App Logo"
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <ShieldCheck className="w-5 h-5 text-slate-950" />
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-black tracking-tight text-white truncate uppercase">
                  {branding?.appName || 'MINING CBM APP'}
                </span>
                <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase truncate">
                  {branding?.appSubtitle || 'HEAVY EQUIPMENT MONITORING'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle / Mobile close */}
          <div className="flex items-center">
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-md text-slate-400 hover:text-white md:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapsed}
              className="hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors md:block cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-3 scrollbar-none">
          {/* 1. Dashboard */}
          <div>
            <button
              onClick={() => handleNavClick('dashboard')}
              title={collapsed ? 'Dashboard' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all group relative cursor-pointer ${
                currentPage === 'dashboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {!collapsed && <span className="truncate text-left flex-1">Dashboard</span>}
            </button>
          </div>

          {/* 2. Master Data (Expandable Submenu) */}
          <div className="space-y-1">
            {!collapsed ? (
              <div>
                <button
                  onClick={() => setMasterDataOpen(!masterDataOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isMasterDataActive
                      ? 'text-amber-400 font-bold bg-slate-800/60'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderTree className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-500" />
                    <span className="truncate text-left font-bold">Master Data</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      masterDataOpen ? 'rotate-180 text-amber-400' : 'text-slate-500'
                    }`}
                  />
                </button>

                {/* Submenu Items */}
                {masterDataOpen && (
                  <div className="pl-6 pr-1 pt-1 space-y-1 border-l-2 border-slate-800 ml-4 mt-1">
                    {masterDataItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate text-left flex-1">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // Collapsed state: direct icon triggers
              <div className="space-y-1">
                {masterDataItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={item.label}
                      className={`w-full flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-800 my-1 mx-2" />

          {/* 3. Program CBM (8 Pilar) */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                PROGRAM CBM (8 PILAR)
              </div>
            )}
            {pilarPrograms.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all group relative cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  {!collapsed && <span className="truncate text-left flex-1">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-800 my-1 mx-2" />

          {/* 4. Follow Up, Inspection & Unit History */}
          <div className="space-y-1">
            <button
              onClick={() => handleNavClick('followup')}
              title={collapsed ? 'Follow Up' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all group relative cursor-pointer ${
                currentPage === 'followup'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {!collapsed && <span className="truncate text-left flex-1">Follow Up</span>}
            </button>

            <button
              onClick={() => handleNavClick('inspection')}
              title={collapsed ? 'Inspection' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all group relative cursor-pointer ${
                currentPage === 'inspection'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {!collapsed && <span className="truncate text-left flex-1">Inspection</span>}
            </button>

            <button
              onClick={() => handleNavClick('history')}
              title={collapsed ? 'Unit History' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all group relative cursor-pointer ${
                currentPage === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {!collapsed && <span className="truncate text-left flex-1">Unit History</span>}
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-800 my-1 mx-2" />

          {/* 5. Settings */}
          <div>
            <button
              onClick={() => handleNavClick('settings')}
              title={collapsed ? 'Settings' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all group relative cursor-pointer ${
                currentPage === 'settings'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {!collapsed && <span className="truncate text-left flex-1">Settings</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0B132B]/80">
          {!collapsed ? (
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex w-2 h-2">
                  <span
                    className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${
                      isSheetsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex w-2 h-2 rounded-full ${
                      isSheetsConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-slate-400" />
                  Database Integrated
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium pl-4">
                Tabang Mining Project
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSheetsConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title="Database Connected"
              />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
