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
  appLogoUrl: string; // Custom sidebar logo (Data URL or HTTP URL)
  splashLogoUrl?: string; // Custom splash screen logo (Data URL or HTTP URL)
  faviconUrl: string; // Custom favicon / page logo
  headerBadgeText: string; // e.g. Tabang Mining Project
  headerBadgeLogoUrl?: string; // Optional custom header badge icon
  creditText?: string; // Watermark / Credit text e.g. Credit by @BangNur
  pageTitles: PageTitleSettings;
}

const BRANDING_STORAGE_KEY = 'cbm_branding_settings_v1';

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

export function getBrandingSettings(): BrandingSettings {
  if (typeof window === 'undefined') return DEFAULT_BRANDING_SETTINGS;
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return DEFAULT_BRANDING_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BRANDING_SETTINGS,
      ...parsed,
      pageTitles: {
        ...DEFAULT_BRANDING_SETTINGS.pageTitles,
        ...(parsed.pageTitles || {}),
      },
    };
  } catch (e) {
    console.error('Failed to load branding settings:', e);
    return DEFAULT_BRANDING_SETTINGS;
  }
}

export function saveBrandingSettings(settings: BrandingSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(settings));
    applyFavicon(settings.faviconUrl);
  } catch (e) {
    console.error('Failed to save branding settings:', e);
  }
}

export function resetBrandingSettings(): BrandingSettings {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BRANDING_STORAGE_KEY);
  }
  applyFavicon('');
  return DEFAULT_BRANDING_SETTINGS;
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
