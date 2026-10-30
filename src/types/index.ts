export type Language = 'km' | 'en';

export type ShiftType = 'day' | 'night';

export type CameraStatus = 'working' | 'faulty' | 'offline' | 'maintenance';

export type CameraType = 'bullet' | 'dome' | 'ptz' | 'fisheye';

export type IssueType =
  | 'no_signal'
  | 'blur_lens'
  | 'angle_shift'
  | 'ir_night_fail'
  | 'recording_error'
  | 'power_issue'
  | 'physical_damage'
  | 'network_lag'
  | 'other';

export type IssueSeverity = 'critical' | 'medium' | 'low';

export type IssueResolutionStatus =
  | 'reported'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'closed';

export interface LocationZone {
  id: string;
  code: string;
  nameKm: string;
  nameEn: string;
  floorOrArea: string;
  descriptionKm: string;
  descriptionEn: string;
  icon: string;
  targetCamerasCount: number;
}

export interface Camera {
  id: string;
  code: string; // e.g. CAM-01
  nameKm: string;
  nameEn: string;
  locationId: string;
  ipAddress: string;
  model: string;
  type: CameraType;
  status: CameraStatus;
  installDate: string;
  lastCheckedAt?: string;
  notes?: string;
}

export interface InspectionItem {
  cameraId: string;
  status: 'ok' | 'issue';
  issueType?: IssueType;
  issueSeverity?: IssueSeverity;
  notes?: string;
  snapshotUrl?: string;
}

export interface InspectionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  inspectorName: string;
  inspectorRole: string;
  completedAt: string; // ISO string
  items: InspectionItem[];
  overallNotes?: string;
  weatherCondition?: string;
  totalCamerasChecked: number;
  normalCount: number;
  issueCount: number;
}

export interface IssueTicket {
  id: string;
  ticketNumber: string; // e.g. TKT-2026-001
  cameraId: string;
  locationId: string;
  reportedDate: string;
  shift: ShiftType;
  reportedBy: string;
  issueType: IssueType;
  severity: IssueSeverity;
  status: IssueResolutionStatus;
  description: string;
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedDate?: string;
  repairCost?: number;
  photoUrl?: string;
}

export interface SmartReportCamera {
  number: number;
  nameThai: string;
  nameKm: string;
  nameEn: string;
  dayStatus: 'ok' | 'issue';
  nightStatus: 'ok' | 'issue';
  symptom?: string;
}

export interface SmartInspectionReport {
  id: string;
  formCode: string;
  companyName: string;
  companySubName: string;
  titleKm: string;
  titleTh: string;
  year: number;
  zone: string;
  inspectionDate: string;
  shift: ShiftType;
  screenshotUrl?: string;
  dayScreenshotUrl?: string;
  nightScreenshotUrl?: string;
  cameras: SmartReportCamera[];
  totalCameras: number;
  workingCount: number;
  faultyCount: number;
  faultyListStr: string;
  faultySymptomStr: string;
  dvrCheck: {
    operating: 'ok' | 'issue';
    dateTimeConfig: 'ok' | 'issue';
    recordedDays: number;
    canPlayback: boolean;
    resolution: string;
    harddiskCapacity: string;
    diskCheckStatus: string;
  };
  signOff: {
    itOfficer: string;
    maintenanceLead: string;
    maintenanceHead: string;
    manager: string;
    generalManager: string;
  };
}

export interface DVRCheckStatus {
  operating: 'ok' | 'issue';
  dateTimeConfig: 'ok' | 'issue';
  recordedDays: number;
  canPlayback: boolean;
  resolution: string;
  harddiskCapacity: string;
  diskCheckStatus: string;
}

export interface DVRProfile {
  id: string;
  name: string;
  locationKm: string;
  channelCount: number;
  gridCols: number;
  gridRows: number;
  ipAddress?: string;
  cameras: SmartReportCamera[];
  lastScreenshotUrl?: string;
  dayScreenshotUrl?: string;
  nightScreenshotUrl?: string;
  lastCheckedDate?: string;
  workingCount?: number;
  faultyCount?: number;
  faultySymptomStr?: string;
  dvrCheck?: DVRCheckStatus;
}

export interface WeeklyDVRAttachment {
  id: string;
  weekId: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  dvrId: string;
  dvrName: string;
  locationKm: string;
  channelCount: number;
  dayScreenshotUrl?: string;
  nightScreenshotUrl?: string;
  attachedAt: string;
  inspectorName: string;
  workingCount: number;
  faultyCount: number;
  faultyChannels?: string;
  remarks?: string;
}

export interface ChecklistHeaderConfig {
  logoUrl?: string;
  companyName: string;
  companySubName: string;
  year: number | string;
  formCode: string;
  fitToOnePage?: boolean;
  includeScreenshotsInPrint?: boolean;
}
