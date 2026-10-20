import { Camera, DVRProfile } from '../types';

export const HEALTH_ALERT_OVERDUE_HOURS = 72; // 72 hours threshold

export interface CameraHealthAlert {
  camera: Camera;
  overdueHours: number;
  lastCheckedFormatted: string;
  isNeverChecked: boolean;
}

export interface DVRHealthAlert {
  dvrId: string;
  dvrName: string;
  locationKm: string;
  type: 'disk_error' | 'retention_low' | 'operating_issue' | 'time_desync' | 'playback_fail' | 'black_screens';
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
}

/**
 * Checks if a camera hasn't been inspected in more than the threshold hours (default 72h).
 */
export function isCameraOverdue(camera: Camera, thresholdHours = HEALTH_ALERT_OVERDUE_HOURS): boolean {
  if (!camera.lastCheckedAt) return true;
  const lastTime = new Date(camera.lastCheckedAt).getTime();
  if (isNaN(lastTime)) return true;
  const diffHours = (Date.now() - lastTime) / (1000 * 60 * 60);
  return diffHours > thresholdHours;
}

/**
 * Gets how many hours overdue an inspection is.
 */
export function getCameraOverdueHours(camera: Camera): number {
  if (!camera.lastCheckedAt) return 999;
  const lastTime = new Date(camera.lastCheckedAt).getTime();
  if (isNaN(lastTime)) return 999;
  const diffHours = (Date.now() - lastTime) / (1000 * 60 * 60);
  return Math.max(0, Math.round(diffHours));
}

/**
 * Formats overdue time nicely in English and Khmer.
 */
export function formatOverdueTime(hours: number, isKm: boolean): string {
  if (hours >= 999) {
    return isKm ? 'មិនដែលត្រួតពិនិត្យ (Never Checked)' : 'Never Inspected';
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) {
    return isKm
      ? `ហួសកំណត់ ${days} ថ្ងៃ ${remHours} ម៉ោង (${hours} ម៉ោង)`
      : `${days}d ${remHours}h ago (${hours}h total)`;
  }
  return isKm ? `ហួសកំណត់ ${hours} ម៉ោង` : `${hours}h ago`;
}

/**
 * Gathers all camera health alerts.
 */
export function getOverdueCameraAlerts(cameras: Camera[]): CameraHealthAlert[] {
  return cameras
    .filter(c => isCameraOverdue(c, HEALTH_ALERT_OVERDUE_HOURS))
    .map(c => {
      const hours = getCameraOverdueHours(c);
      const isNever = !c.lastCheckedAt;
      return {
        camera: c,
        overdueHours: hours,
        lastCheckedFormatted: c.lastCheckedAt
          ? new Date(c.lastCheckedAt).toLocaleString()
          : 'None',
        isNeverChecked: isNever,
      };
    })
    .sort((a, b) => b.overdueHours - a.overdueHours);
}

/**
 * Evaluates DVR Profile health and returns all active alerts.
 */
export function getDVRHealthAlerts(dvr: DVRProfile): DVRHealthAlert[] {
  const alerts: DVRHealthAlert[] = [];
  const check = dvr.dvrCheck;

  if (check) {
    // 1. Operating status
    if (check.operating === 'issue') {
      alerts.push({
        dvrId: dvr.id,
        dvrName: dvr.name,
        locationKm: dvr.locationKm,
        type: 'operating_issue',
        severity: 'critical',
        title: 'DVR System Malfunction (ស្ថានភាពម៉ាស៊ីនមានបញ្ហា)',
        detail: `DVR "${dvr.name}" operating status reported with abnormal symptoms.`,
      });
    }

    // 2. Hard disk check error
    if (check.diskCheckStatus && check.diskCheckStatus.toLowerCase().includes('error')) {
      alerts.push({
        dvrId: dvr.id,
        dvrName: dvr.name,
        locationKm: dvr.locationKm,
        type: 'disk_error',
        severity: 'critical',
        title: 'Hard Disk Failure Alert (បញ្ហា Hard Disk / HDD)',
        detail: `Disk check returned: "${check.diskCheckStatus}". Immediate backup or drive replacement required.`,
      });
    }

    // 3. Storage retention days alert (< 30 days standard)
    if (check.recordedDays !== undefined && check.recordedDays < 30) {
      alerts.push({
        dvrId: dvr.id,
        dvrName: dvr.name,
        locationKm: dvr.locationKm,
        type: 'retention_low',
        severity: 'warning',
        title: 'Low Storage Retention (< 30 Days)',
        detail: `Holding only ${check.recordedDays} days of recorded video history (Legal enterprise standard is ≥ 30 days).`,
      });
    }

    // 4. Playback capability
    if (check.canPlayback === false) {
      alerts.push({
        dvrId: dvr.id,
        dvrName: dvr.name,
        locationKm: dvr.locationKm,
        type: 'playback_fail',
        severity: 'critical',
        title: 'Playback Video Failure (មិនអាចចាក់មើលវីដេអូចាស់បាន)',
        detail: `Historical playback capability is offline or corrupted on this recorder unit.`,
      });
    }

    // 5. Date & Time desync
    if (check.dateTimeConfig === 'issue') {
      alerts.push({
        dvrId: dvr.id,
        dvrName: dvr.name,
        locationKm: dvr.locationKm,
        type: 'time_desync',
        severity: 'warning',
        title: 'NTP Time Desynchronized (ម៉ោង DVR មិនត្រូវគ្នា)',
        detail: `System clock is desynchronized with real time, invalidating legal forensic timestamps.`,
      });
    }
  }

  // 6. Black screen / offline channels in this DVR
  const faultyChannels = dvr.cameras.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue');
  if (faultyChannels.length > 0) {
    alerts.push({
      dvrId: dvr.id,
      dvrName: dvr.name,
      locationKm: dvr.locationKm,
      type: 'black_screens',
      severity: 'critical',
      title: `${faultyChannels.length} Black Screen Channels (អេក្រង់ខ្មៅ)`,
      detail: `Channels ${faultyChannels.map(c => `C${c.number}`).join(', ')} failed video signal detection.`,
    });
  }

  return alerts;
}

/**
 * Calculates overall fleet health percentage and summary statistics.
 */
export function calculateFleetHealth(profiles: DVRProfile[]) {
  let totalDvr = profiles.length;
  let healthyDvr = 0;
  let totalChannels = 0;
  let workingChannels = 0;
  let diskErrors = 0;
  let lowRetentionCount = 0;

  profiles.forEach(p => {
    const alerts = getDVRHealthAlerts(p);
    if (alerts.length === 0) {
      healthyDvr++;
    }
    const check = p.dvrCheck;
    if (check?.diskCheckStatus?.toLowerCase().includes('error')) {
      diskErrors++;
    }
    if (check?.recordedDays !== undefined && check.recordedDays < 30) {
      lowRetentionCount++;
    }
    p.cameras.forEach(c => {
      totalChannels++;
      if (c.dayStatus === 'ok' && c.nightStatus === 'ok') {
        workingChannels++;
      }
    });
  });

  const fleetHealthRate = totalDvr > 0 ? Math.round((healthyDvr / totalDvr) * 100) : 100;
  const channelSignalRate = totalChannels > 0 ? Math.round((workingChannels / totalChannels) * 100) : 100;

  return {
    totalDvr,
    healthyDvr,
    fleetHealthRate,
    totalChannels,
    workingChannels,
    faultyChannels: totalChannels - workingChannels,
    channelSignalRate,
    diskErrors,
    lowRetentionCount,
  };
}
