import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar, PageId } from './components/Sidebar';
import { Header } from './components/Header';
import { SyncStatus } from './components/SyncStatus';
import { NewInspectionModal } from './components/NewInspectionModal';
import { EditInspectionModal } from './components/EditInspectionModal';
import { DeleteInspectionModal } from './components/DeleteInspectionModal';
import { InspectionDetailModal } from './components/InspectionDetailModal';
import { PasswordPromptModal } from './components/PasswordPromptModal';
import { SplashScreen } from './components/SplashScreen';
import { Inspection, ProgramType } from './types/inspection';
import {
  fetchInspections,
  createInspection,
  updateInspection,
  deleteInspection,
  getGoogleAppsScriptUrl,
} from './services/googleSheets';

// Pages
import { Dashboard } from './pages/Dashboard';
import { StandaloneInspectionPage } from './pages/StandaloneInspectionPage';
import { PPM } from './pages/PPM';
import { PPE } from './pages/PPE';
import { FC } from './pages/FC';
import { MP } from './pages/MP';
import { CR } from './pages/CR';
import { PAP } from './pages/PAP';
import { PPA } from './pages/PPA';
import { PPU } from './pages/PPU';
import { FollowUp } from './pages/FollowUp';
import { UnitHistory } from './pages/UnitHistory';
import { MasterComponentPage } from './pages/MasterComponentPage';
import { MasterUnitsPage } from './pages/MasterUnitsPage';
import { Settings } from './pages/Settings';
import { getMasterUnits, saveMasterUnits } from './services/masterUnitService';
import { getMasterComponents, saveMasterComponents } from './services/masterComponentService';
import { getFollowUpItems, saveFollowUpItems } from './services/followUpService';
import { getStandaloneInspections, saveStandaloneInspections } from './services/standaloneInspectionService';
import { isDateInRange } from './utils/calculations';
import {
  fetchMasterUnitsFromSheets,
  fetchMasterComponentsFromSheets,
  fetchFollowUpsFromSheets,
  fetchStandaloneInspectionsFromSheets,
} from './services/googleSheets';
import {
  exportInspectionsToExcel,
  exportMasterUnitsToExcel,
  exportMasterComponentsToExcel,
  exportFollowUpsToExcel,
  exportStandaloneInspectionsToExcel,
} from './utils/excelExport';
import {
  BrandingSettings,
  getBrandingSettings,
  saveBrandingSettings,
  applyFavicon,
} from './services/brandingService';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Branding & Identity state
  const [branding, setBranding] = useState<BrandingSettings>(() => getBrandingSettings());

  useEffect(() => {
    applyFavicon(branding.faviconUrl);
  }, [branding.faviconUrl]);

  const handleUpdateBranding = (newSettings: BrandingSettings) => {
    saveBrandingSettings(newSettings);
    setBranding(newSettings);
    showToast('Pengaturan logo & identitas aplikasi berhasil disimpan!');
  };

  // Global filters
  const [selectedModel, setSelectedModel] = useState<string>('ALL');
  const [selectedRating, setSelectedRating] = useState<string>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Data states
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [selectedInspectionForDetail, setSelectedInspectionForDetail] = useState<Inspection | null>(null);
  const [selectedInspectionForEdit, setSelectedInspectionForEdit] = useState<Inspection | null>(null);
  const [selectedInspectionForDelete, setSelectedInspectionForDelete] = useState<Inspection | null>(null);
  const [modalInitialProgram, setModalInitialProgram] = useState<ProgramType | undefined>(undefined);
  const [modalInitialUnitId, setModalInitialUnitId] = useState<string | undefined>(undefined);

  // Password Protection States
  const [isProtectedUnlocked, setIsProtectedUnlocked] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [pendingProtectedPage, setPendingProtectedPage] = useState<PageId | null>(null);

  const handleSelectPage = (targetPage: PageId) => {
    const protectedPages: PageId[] = ['master-units', 'master-component', 'settings'];
    if (protectedPages.includes(targetPage) && !isProtectedUnlocked) {
      setPendingProtectedPage(targetPage);
      setIsPasswordModalOpen(true);
    } else {
      setCurrentPage(targetPage);
    }
  };

  const handlePasswordSuccess = () => {
    setIsProtectedUnlocked(true);
    setIsPasswordModalOpen(false);
    if (pendingProtectedPage) {
      setCurrentPage(pendingProtectedPage);
      setPendingProtectedPage(null);
    }
    showToast('Akses Master Data & Settings berhasil dibuka!');
  };

  const handleLockSession = () => {
    setIsProtectedUnlocked(false);
    const protectedPages: PageId[] = ['master-units', 'master-component', 'settings'];
    if (protectedPages.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
    showToast('Akses Master Data & Settings dikunci kembali.');
  };

  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Auto-refresh config (default 30 seconds = 30000ms)
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);

  // Dark / Light Mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cbm_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('cbm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fullsize / Fullscreen mode
  const [isFullsize, setIsFullsize] = useState<boolean>(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullsize) {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
        setIsFullsize(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullsize]);

  const toggleFullscreen = () => {
    if (!isFullsize) {
      try {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } catch (e) {}
      setIsFullsize(true);
      showToast('Mode Fullsize aktif (Tekan ESC untuk keluar)');
    } else {
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen?.().catch(() => {});
        } catch (e) {}
      }
      setIsFullsize(false);
      showToast('Keluar dari mode Fullsize');
    }
  };

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch data
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsRefreshing(true);
    }

    try {
      // 1. Fetch Inspections
      const response = await fetchInspections();
      if (response.data) {
        setInspections(response.data);
        setLastSynced(new Date());
        setIsError(!response.success && Boolean(response.error));
        if (response.error) {
          setErrorMessage(response.message || 'Warning: Unable to synchronize with database.');
        } else {
          setIsError(false);
          setErrorMessage('');
        }
      }

      // 2. Fetch Master Units if Google Sheets is connected
      const remoteUnits = await fetchMasterUnitsFromSheets();
      if (remoteUnits && remoteUnits.length > 0) {
        saveMasterUnits(remoteUnits);
      }

      // 3. Fetch Master Components if Google Sheets is connected
      const remoteComponents = await fetchMasterComponentsFromSheets();
      if (remoteComponents && remoteComponents.length > 0) {
        saveMasterComponents(remoteComponents);
      }

      // 4. Fetch Follow Ups if Google Sheets is connected
      const remoteFollowUps = await fetchFollowUpsFromSheets();
      if (remoteFollowUps && remoteFollowUps.length > 0) {
        saveFollowUpItems(remoteFollowUps);
      }

      // 5. Fetch Standalone Inspections if Google Sheets is connected
      const remoteStandalone = await fetchStandaloneInspectionsFromSheets();
      if (remoteStandalone && remoteStandalone.length > 0) {
        saveStandaloneInspections(remoteStandalone);
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Failed to fetch inspections from database.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadData(true);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, loadData]);

  // Filtered dataset by Date Range across all pages
  const displayInspections = useMemo(() => {
    if (!startDate && !endDate) return inspections;
    return inspections.filter((i) =>
      isDateInRange(i.date || i.createdAt, startDate, endDate)
    );
  }, [inspections, startDate, endDate]);

  // List of unique equipment models across dataset & master catalog for the model filter
  const uniqueModels = useMemo(() => {
    const set = new Set<string>();
    getMasterUnits().forEach((u) => {
      if (u.unitModel && u.unitModel.trim()) set.add(u.unitModel.trim());
    });
    inspections.forEach((i) => {
      if (i.model && i.model.trim()) set.add(i.model.trim());
    });
    return Array.from(set).sort();
  }, [inspections]);

  // List of unique components from Master Components and live inspections
  const uniqueComponents = useMemo(() => {
    const set = new Set<string>();
    getMasterComponents().forEach((c) => {
      if (c.componentName && c.componentName.trim()) set.add(c.componentName.trim());
    });
    inspections.forEach((i) => {
      if (i.component && i.component.trim() && i.component !== '-') set.add(i.component.trim());
    });
    return Array.from(set).sort();
  }, [inspections]);

  // Page title mapping based on branding settings
  const pageTitleMap: Record<PageId, string> = useMemo(() => ({
    dashboard: branding.pageTitles?.dashboard || 'Dashboard',
    inspection: branding.pageTitles?.inspections || 'Master Inspections',
    'master-units': branding.pageTitles?.['master-units'] || 'Master Units',
    'master-component': branding.pageTitles?.['master-components'] || 'Master Components',
    ppm: 'Program Mesin (PPM)',
    ppe: 'Program Elektrik (PPE)',
    fc: branding.pageTitles?.['cut-filter'] || 'Filter Cutting (FC)',
    mp: branding.pageTitles?.mag || 'Magnetic Plug (MP)',
    cr: 'Cylinder Rating (CR)',
    pap: branding.pageTitles?.pap || 'Program Analisa Pelumas (PAP)',
    ppa: 'Pemeriksaan Attachment (PPA)',
    ppu: branding.pageTitles?.['under-carriage'] || 'Pemeriksaan Undercarriage (PPU)',
    followup: 'Follow Up',
    history: 'Unit History',
    settings: branding.pageTitles?.settings || 'Settings',
  }), [branding]);

  // Handle open new inspection with optional preset
  const handleOpenNewInspection = (presetProg?: ProgramType, presetUnit?: string) => {
    setModalInitialProgram(presetProg);
    setModalInitialUnitId(presetUnit);
    setIsNewModalOpen(true);
  };

  // Handle saving new inspection to database
  const handleSaveNewInspection = async (
    data: Omit<Inspection, 'id' | 'createdAt'>
  ): Promise<boolean> => {
    const res = await createInspection(data);
    if (res.data) {
      setInspections((prev) => [res.data!, ...prev.filter((i) => i.id !== res.data!.id)]);
      setLastSynced(new Date());
      showToast(res.message || 'Inspection saved successfully!');
      return true;
    }
    return false;
  };

  // Handle updating follow-up status in database
  const handleUpdateInspection = async (updated: Inspection) => {
    const res = await updateInspection(updated);
    setInspections((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    showToast('Inspection status updated successfully.');
  };

  // Handle opening edit modal
  const handleOpenEditInspection = (item: Inspection) => {
    setSelectedInspectionForEdit(item);
  };

  // Handle saving edited inspection
  const handleSaveEditInspection = async (updated: Inspection): Promise<boolean> => {
    const res = await updateInspection(updated);
    if (res.success || res.data) {
      setInspections((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setLastSynced(new Date());
      showToast('Data inspeksi berhasil diperbarui!');
      return true;
    }
    return false;
  };

  // Handle opening delete confirmation
  const handleOpenDeleteInspection = (item: Inspection) => {
    setSelectedInspectionForDelete(item);
  };

  // Handle executing delete
  const handleConfirmDeleteInspection = async (id: string) => {
    await deleteInspection(id);
    setInspections((prev) => prev.filter((item) => item.id !== id));
    setLastSynced(new Date());
    showToast('Data inspeksi berhasil dihapus.');
  };

  // Handle Global Export Excel depending on current page
  const handleGlobalExportExcel = () => {
    if (currentPage === 'master-units') {
      exportMasterUnitsToExcel(getMasterUnits());
      showToast('Data Master Units berhasil diexport ke Excel!');
    } else if (currentPage === 'master-component') {
      exportMasterComponentsToExcel(getMasterComponents());
      showToast('Data Master Components berhasil diexport ke Excel!');
    } else if (currentPage === 'followup') {
      exportFollowUpsToExcel(getFollowUpItems());
      showToast('Data Follow Up Tasks berhasil diexport ke Excel!');
    } else if (currentPage === 'inspection') {
      exportStandaloneInspectionsToExcel(getStandaloneInspections());
      showToast('Data Standalone Inspections berhasil diexport ke Excel!');
    } else {
      const pageName = pageTitleMap[currentPage] || 'Inspections';
      exportInspectionsToExcel(displayInspections, pageName);
      showToast(`Data ${pageName} (${displayInspections.length} records) berhasil diexport ke Excel!`);
    }
  };

  const isSheetsConnected = Boolean(getGoogleAppsScriptUrl());

  return (
    <div
      className={`min-h-screen mining-bg flex text-slate-800 dark:text-slate-100 transition-colors duration-200 ${
        isFullsize ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden' : ''
      }`}
    >
      {/* 3 Second Mining Splash Screen on Initial App Load */}
      {showSplash && (
        <SplashScreen
          logoUrl={branding.splashLogoUrl}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Dark Navy Sidebar with Expandable Master Data */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={handleSelectPage}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        isSheetsConnected={isSheetsConnected}
        branding={branding}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Main Header */}
        <Header
          title={pageTitleMap[currentPage] || 'Dashboard'}
          currentPage={currentPage}
          onSelectPage={handleSelectPage}
          models={uniqueModels}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          selectedRating={selectedRating}
          onSelectRating={setSelectedRating}
          componentsList={uniqueComponents}
          selectedComponent={selectedComponent}
          onSelectComponent={setSelectedComponent}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onClearDateRange={() => {
            setStartDate('');
            setEndDate('');
          }}
          onOpenNewInspection={() => handleOpenNewInspection()}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          onRefresh={() => loadData(false)}
          isRefreshing={isRefreshing}
          theme={theme}
          onToggleTheme={toggleTheme}
          isFullscreen={isFullsize}
          onToggleFullscreen={toggleFullscreen}
          branding={branding}
          onExportExcel={handleGlobalExportExcel}
          isProtectedUnlocked={isProtectedUnlocked}
          onLockSession={handleLockSession}
        />

        {/* Sync Status Banner */}
        <SyncStatus
          isLoading={isRefreshing && inspections.length === 0}
          isError={isError}
          errorMessage={errorMessage}
          lastSynced={lastSynced}
          onRetry={() => loadData(false)}
          isUsingMock={!isSheetsConnected}
        />

        {/* Page Content Body */}
        <main
          className={`flex-1 p-4 sm:p-6 lg:p-7 w-full mx-auto ${
            isFullsize ? 'max-w-[98vw]' : 'max-w-7xl'
          }`}
        >
          {currentPage === 'dashboard' && (
            <Dashboard
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              selectedComponent={selectedComponent}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onOpenNewInspection={() => handleOpenNewInspection()}
              onNavigateToPage={handleSelectPage}
            />
          )}

          {currentPage === 'inspection' && (
            <StandaloneInspectionPage
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {currentPage === 'ppm' && (
            <PPM
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'ppe' && (
            <PPE
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'fc' && (
            <FC
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'mp' && (
            <MP
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'cr' && (
            <CR
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'pap' && (
            <PAP
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'ppa' && (
            <PPA
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'ppu' && (
            <PPU
              inspections={displayInspections}
              selectedModel={selectedModel}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(prog) => handleOpenNewInspection(prog)}
            />
          )}

          {currentPage === 'followup' && (
            <FollowUp
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {currentPage === 'history' && (
            <UnitHistory
              inspections={displayInspections}
              onViewDetail={setSelectedInspectionForDetail}
              onEditInspection={handleOpenEditInspection}
              onDeleteInspection={handleOpenDeleteInspection}
              onOpenNewInspection={(unitId) => handleOpenNewInspection(undefined, unitId)}
            />
          )}

          {currentPage === 'master-component' && (
            <MasterComponentPage
              inspections={displayInspections}
              onNavigateToInspection={(componentName) => {
                setSelectedComponent(componentName);
                setCurrentPage('inspection');
              }}
            />
          )}

          {currentPage === 'master-units' && (
            <MasterUnitsPage
              onNavigateToInspection={(unitCode) => {
                setSearchQuery(unitCode);
                setCurrentPage('inspection');
              }}
            />
          )}

          {currentPage === 'settings' && (
            <Settings
              onRefreshData={() => loadData(false)}
              lastSynced={lastSynced}
              refreshInterval={refreshInterval}
              onUpdateRefreshInterval={setRefreshInterval}
              isSheetsConnected={isSheetsConnected}
              branding={branding}
              onUpdateBranding={handleUpdateBranding}
            />
          )}

          {/* Footer Watermark / Credit */}
          <footer className="mt-10 pt-4 pb-2 border-t border-slate-200/60 dark:border-slate-800/80 text-center">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              {branding?.creditText || 'Credit by @BangNur'}
            </p>
          </footer>
        </main>
      </div>

      {/* New Inspection Modal */}
      <NewInspectionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleSaveNewInspection}
        initialProgram={modalInitialProgram}
        initialUnitId={modalInitialUnitId}
        inspections={inspections}
      />

      {/* Edit Inspection Modal */}
      <EditInspectionModal
        isOpen={Boolean(selectedInspectionForEdit)}
        onClose={() => setSelectedInspectionForEdit(null)}
        inspection={selectedInspectionForEdit}
        onSave={handleSaveEditInspection}
        inspections={inspections}
      />

      {/* Delete Inspection Confirmation Modal */}
      <DeleteInspectionModal
        isOpen={Boolean(selectedInspectionForDelete)}
        onClose={() => setSelectedInspectionForDelete(null)}
        inspection={selectedInspectionForDelete}
        onConfirmDelete={handleConfirmDeleteInspection}
      />

      {/* Inspection Detail Modal */}
      <InspectionDetailModal
        inspection={selectedInspectionForDetail}
        isOpen={Boolean(selectedInspectionForDetail)}
        onClose={() => setSelectedInspectionForDetail(null)}
        onUpdateStatus={handleUpdateInspection}
        onEdit={handleOpenEditInspection}
        onDelete={handleOpenDeleteInspection}
      />

      {/* Password Prompt Modal for Protected Pages */}
      <PasswordPromptModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        targetPageName={
          pendingProtectedPage === 'master-units'
            ? 'Master Equipment Units'
            : pendingProtectedPage === 'master-component'
            ? 'Master Components'
            : pendingProtectedPage === 'settings'
            ? 'Pengaturan Sistem (Settings)'
            : 'Master Data / Settings'
        }
      />
    </div>
  );
}
