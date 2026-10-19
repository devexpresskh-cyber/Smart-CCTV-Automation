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
    const hydrated = await Promise.all(
      profiles.map(async p => {
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
        };
      })
    );
    return hydrated;
  } catch (err) {
    console.warn('Hydration warning:', err);
    return profiles;
  }
};

export const setStoredDVRProfiles = (profiles: any[]) => {
  // 1. Asynchronously save full screenshots to IndexedDB (virtually unlimited quota)
  if (Array.isArray(profiles)) {
    profiles.forEach(p => {
      if (p.dayScreenshotUrl && p.dayScreenshotUrl.length > 50) {
        idbSet(`dvr_${p.id}_day`, p.dayScreenshotUrl);
      }
      if (p.nightScreenshotUrl && p.nightScreenshotUrl.length > 50) {
        idbSet(`dvr_${p.id}_night`, p.nightScreenshotUrl);
      }
    });
  }

  // 2. Try saving to localStorage
  try {
    localStorage.setItem(DVR_STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.warn('localStorage quota exceeded. Saving lightweight metadata without raw images.', e);
    try {
      // Strip large screenshot data URLs from localStorage, keeping all metadata intact
      const lightweight = profiles.map(p => ({
        ...p,
        dayScreenshotUrl: p.dayScreenshotUrl && p.dayScreenshotUrl.length > 300 ? '' : p.dayScreenshotUrl,
        nightScreenshotUrl: p.nightScreenshotUrl && p.nightScreenshotUrl.length > 300 ? '' : p.nightScreenshotUrl,
      }));
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
  // Save screenshots to IndexedDB
  if (Array.isArray(attachments)) {
    attachments.forEach(att => {
      if (att.dayScreenshotUrl) idbSet(`weekly_${weekId}_${att.dvrId}_day`, att.dayScreenshotUrl);
      if (att.nightScreenshotUrl) idbSet(`weekly_${weekId}_${att.dvrId}_night`, att.nightScreenshotUrl);
    });
  }

  try {
    localStorage.setItem(`${WEEKLY_ATTACHMENTS_KEY_PREFIX}${weekId}`, JSON.stringify(attachments));
  } catch (e) {
    console.warn('localStorage quota exceeded for weekly attachments. Saving lightweight version.', e);
    try {
      const lightweight = attachments.map(att => ({
        ...att,
        dayScreenshotUrl: att.dayScreenshotUrl && att.dayScreenshotUrl.length > 300 ? '' : att.dayScreenshotUrl,
        nightScreenshotUrl: att.nightScreenshotUrl && att.nightScreenshotUrl.length > 300 ? '' : att.nightScreenshotUrl,
      }));
      localStorage.setItem(`${WEEKLY_ATTACHMENTS_KEY_PREFIX}${weekId}`, JSON.stringify(lightweight));
    } catch (innerErr) {
      console.error('Critical storage save error in weekly attachments', innerErr);
    }
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
