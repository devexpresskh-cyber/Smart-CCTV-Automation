import { LocationZone, Camera, InspectionRecord, IssueTicket, Language, WeeklyDVRAttachment } from '../types';
import { initialLocations, initialCameras, initialIssueTickets, generateInitialInspections } from '../data/initialData';
import { idbSet, idbGet } from './idbStorage';

const STORAGE_KEYS = {
  LOCATIONS: 'cctv_sentinel_locations_v1',
  CAMERAS: 'cctv_sentinel_cameras_v1',
  INSPECTIONS: 'cctv_sentinel_inspections_v1',
  TICKETS: 'cctv_sentinel_tickets_v1',
  LANGUAGE: 'cctv_sentinel_language_v1',
};

export const getStoredLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved === 'km' || saved === 'en') return saved;
  } catch (e) {
    console.error(e);
  }
  return 'km'; // Default to Khmer as requested
};

export const setStoredLanguage = (lang: Language) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  } catch (e) {
    console.error(e);
  }
};

export const getStoredLocations = (): LocationZone[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  setStoredLocations(initialLocations);
  return initialLocations;
};

export const setStoredLocations = (locations: LocationZone[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  } catch (e) {
    console.error(e);
  }
};

export const getStoredCameras = (): Camera[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CAMERAS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  setStoredCameras(initialCameras);
  return initialCameras;
};

export const setStoredCameras = (cameras: Camera[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(cameras));
  } catch (e) {
    console.error(e);
  }
};

export const getStoredInspections = (): InspectionRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  const defaultInspections = generateInitialInspections();
  setStoredInspections(defaultInspections);
  return defaultInspections;
};

export const setStoredInspections = (inspections: InspectionRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(inspections));
  } catch (e) {
    console.error(e);
  }
};

export const getStoredTickets = (): IssueTicket[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TICKETS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  setStoredTickets(initialIssueTickets);
  return initialIssueTickets;
};

export const setStoredTickets = (tickets: IssueTicket[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  } catch (e) {
    console.error(e);
  }
};

const DVR_STORAGE_KEY = 'cctv_sentinel_dvr_profiles_v1';

export const getStoredDVRProfiles = (): any[] => {
  try {
    const data = localStorage.getItem(DVR_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

/**
 * Hydrates DVR profiles with full screenshot URLs from IndexedDB
 * if they were saved in stripped/lightweight format in localStorage.
 */
export const hydrateDVRProfilesWithIDB = async (profiles: any[]): Promise<any[]> => {
  try {
    const freshest = getStoredDVRProfiles();
    const sourceProfiles = (freshest && freshest.length > 0) ? freshest : profiles;

    const hydrated = await Promise.all(
      sourceProfiles.map(async p => {
        let dayUrl = p.dayScreenshotUrl;
        let nightUrl = p.nightScreenshotUrl;

        if (!dayUrl || dayUrl.length < 50) {
          const fromDb = await idbGet(`dvr_${p.id}_day`);
          if (fromDb) dayUrl = fromDb;
        }

        if (!nightUrl || nightUrl.length < 50) {
          const fromDb = await idbGet(`dvr_${p.id}_night`);
          if (fromDb) nightUrl = fromDb;
        }

        return {
          ...p,
          dayScreenshotUrl: dayUrl,
          nightScreenshotUrl: nightUrl,
          cameras: p.cameras, // explicitly preserve camera list
        };
      })
    );
    return hydrated;
  } catch (err) {
    console.warn('Hydration warning:', err);
    return profiles;
  }
};

// Helper to strip heavy image data URLs from any DVR profile list
export const toLightweightProfiles = (profiles: any[]) => {
  if (!Array.isArray(profiles)) return [];
  return profiles.map(p => ({
    ...p,
    dayScreenshotUrl: p.dayScreenshotUrl && p.dayScreenshotUrl.length > 300 ? '' : p.dayScreenshotUrl,
    nightScreenshotUrl: p.nightScreenshotUrl && p.nightScreenshotUrl.length > 300 ? '' : p.nightScreenshotUrl,
    lastScreenshotUrl: p.lastScreenshotUrl && p.lastScreenshotUrl.length > 300 ? '' : p.lastScreenshotUrl,
  }));
};

// Automatic cleanup on module load to purge any bloated legacy base64 data that caused QuotaExceededError
export const cleanupLegacyStorageBloat = () => {
  try {
    const raw = localStorage.getItem(DVR_STORAGE_KEY);
    if (raw && raw.length > 30000) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Save to IndexedDB first so photos aren't lost
        parsed.forEach(p => {
          if (p.dayScreenshotUrl && p.dayScreenshotUrl.length > 50) {
            idbSet(`dvr_${p.id}_day`, p.dayScreenshotUrl);
          }
          if (p.nightScreenshotUrl && p.nightScreenshotUrl.length > 50) {
            idbSet(`dvr_${p.id}_night`, p.nightScreenshotUrl);
          }
        });
        const light = toLightweightProfiles(parsed);
        localStorage.setItem(DVR_STORAGE_KEY, JSON.stringify(light));
      }
    }
  } catch (err) {
    console.warn('Storage cleanup notice:', err);
  }
};

// Immediately execute cleanup to free up quota
if (typeof window !== 'undefined') {
  cleanupLegacyStorageBloat();
}

export const setStoredDVRProfiles = (profiles: any[]) => {
  if (!Array.isArray(profiles)) return;

  // 1. Asynchronously save full screenshots to IndexedDB (virtually unlimited quota)
  profiles.forEach(p => {
    if (p.dayScreenshotUrl && p.dayScreenshotUrl.length > 50) {
      idbSet(`dvr_${p.id}_day`, p.dayScreenshotUrl);
    }
    if (p.nightScreenshotUrl && p.nightScreenshotUrl.length > 50) {
      idbSet(`dvr_${p.id}_night`, p.nightScreenshotUrl);
    }
  });

  // 2. Always save lightweight metadata to localStorage (never store MBs of base64 data URLs)
  try {
    const lightweight = toLightweightProfiles(profiles);
    localStorage.setItem(DVR_STORAGE_KEY, JSON.stringify(lightweight));
  } catch (e) {
    console.warn('localStorage quota warning in setStoredDVRProfiles. Pruning...', e);
    try {
      cleanupLegacyStorageBloat();
      const lightweight = toLightweightProfiles(profiles);
      localStorage.setItem(DVR_STORAGE_KEY, JSON.stringify(lightweight));
    } catch (innerErr) {
      console.error('Critical storage save error in localStorage', innerErr);
    }
  }
};

const WEEKLY_ATTACHMENTS_KEY_PREFIX = 'cctv_sentinel_weekly_attachments_';

export const getStoredWeeklyAttachments = (weekId: string): WeeklyDVRAttachment[] => {
  try {
    const data = localStorage.getItem(`${WEEKLY_ATTACHMENTS_KEY_PREFIX}${weekId}`);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return [];
};

export const setStoredWeeklyAttachments = (weekId: string, attachments: WeeklyDVRAttachment[]) => {
  if (!Array.isArray(attachments)) return;

  // 1. Save full screenshots to IndexedDB
  attachments.forEach(att => {
    if (att.dayScreenshotUrl && att.dayScreenshotUrl.length > 50) {
      idbSet(`weekly_${weekId}_${att.dvrId}_day`, att.dayScreenshotUrl);
    }
    if (att.nightScreenshotUrl && att.nightScreenshotUrl.length > 50) {
      idbSet(`weekly_${weekId}_${att.dvrId}_night`, att.nightScreenshotUrl);
    }
  });

  // 2. Save lightweight version directly to localStorage
  try {
    const lightweight = attachments.map(att => ({
      ...att,
      dayScreenshotUrl: att.dayScreenshotUrl && att.dayScreenshotUrl.length > 300 ? '' : att.dayScreenshotUrl,
      nightScreenshotUrl: att.nightScreenshotUrl && att.nightScreenshotUrl.length > 300 ? '' : att.nightScreenshotUrl,
    }));
    localStorage.setItem(`${WEEKLY_ATTACHMENTS_KEY_PREFIX}${weekId}`, JSON.stringify(lightweight));
  } catch (e) {
    console.warn('localStorage setItem notice for weekly attachments:', e);
  }
};

export const resetAllToDefault = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.LOCATIONS);
    localStorage.removeItem(STORAGE_KEYS.CAMERAS);
    localStorage.removeItem(STORAGE_KEYS.INSPECTIONS);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(DVR_STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
  const defaultInspections = generateInitialInspections();
  setStoredLocations(initialLocations);
  setStoredCameras(initialCameras);
  setStoredInspections(defaultInspections);
  setStoredTickets(initialIssueTickets);
  return {
    locations: initialLocations,
    cameras: initialCameras,
    inspections: defaultInspections,
    tickets: initialIssueTickets,
  };
};
