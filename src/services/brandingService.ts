export interface PageTitleSettings {
  dashboard: string;
  inspections: string;
  'master-units': string;
  'master-components': string;
  trend: string;
  pap: string;
  mag: string;
  'under-carriage': string;
  'cut-filter': string;
  settings: string;
}

export interface BrandingSettings {
  appName: string;
  appSubtitle: string;
  appLogoUrl: string; // Custom sidebar logo
  splashLogoUrl?: string; // Custom splash screen logo
  faviconUrl: string; // Custom favicon
  headerBadgeText: string; // e.g. Tabang Mining Project
  headerBadgeLogoUrl?: string; // Optional custom header badge icon
  creditText?: string; // Watermark / Credit text e.g. Credit by @BangNur
  pageTitles: PageTitleSettings;
}

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  appName: 'CBM WEB APP',
  appSubtitle: 'Condition-Based Monitoring',
  appLogoUrl: '',
  splashLogoUrl: '',
  faviconUrl: '',
  headerBadgeText: 'Tabang Mining Project',
  headerBadgeLogoUrl: '',
  creditText: 'Credit by @BangNur',
  pageTitles: {
    dashboard: 'Dashboard Overview',
    inspections: 'Inspection Registry',
    'master-units': 'Master Equipment Units',
    'master-components': 'Master Components Registry',
    trend: 'Condition Rating Trend & Analytics',
    pap: 'Program Analisa Pelumas (PAP)',
    mag: 'Magnetic Plug Inspection (MAG)',
    'under-carriage': 'Under Carriage Inspection',
    'cut-filter': 'Cut Filter Inspection',
    settings: 'System & Database Settings',
  },
};

let currentBrandingInMemory: BrandingSettings = { ...DEFAULT_BRANDING_SETTINGS };

export function getBrandingSettings(): BrandingSettings {
  return currentBrandingInMemory;
}

export function setBrandingInMemory(settings: BrandingSettings): void {
  currentBrandingInMemory = {
    ...DEFAULT_BRANDING_SETTINGS,
    ...settings,
    pageTitles: {
      ...DEFAULT_BRANDING_SETTINGS.pageTitles,
      ...(settings.pageTitles || {}),
    },
  };
  applyFavicon(currentBrandingInMemory.faviconUrl);
}

export function applyFavicon(faviconUrl: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  if (faviconUrl && faviconUrl.trim()) {
    link.href = faviconUrl.trim();
  }
}
