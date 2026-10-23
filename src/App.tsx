import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  InspectionItem,
  InspectionRecord,
  IssueTicket,
  LocationZone,
  Language,
  ShiftType,
  SmartInspectionReport,
} from './types';
import {
  getStoredLanguage,
  setStoredLanguage,
  getStoredLocations,
  setStoredLocations,
  getStoredCameras,
  setStoredCameras,
  getStoredInspections,
  setStoredInspections,
  getStoredTickets,
  setStoredTickets,
  resetAllToDefault,
  getStoredDVRProfiles,
} from './utils/storage';
import { initialDVRProfiles } from './data/smartReportTemplate';
import { getOverdueCameraAlerts, getDVRHealthAlerts } from './utils/healthAlerts';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InspectionView } from './components/InspectionView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { ProblemTrackingView } from './components/ProblemTrackingView';
import { SmartScannerView } from './components/SmartScannerView';
import { CameraPreviewModal } from './components/CameraPreviewModal';
import { PrintReportModal } from './components/PrintReportModal';
import { HealthAlertModal } from './components/HealthAlertModal';
import { translations } from './i18n/translations';

export default function App() {
  const [lang, setLang] = useState<Language>(getStoredLanguage);
  const [locations, setLocations] = useState<LocationZone[]>(getStoredLocations);
  const [cameras, setCameras] = useState<Camera[]>(getStoredCameras);
  const [inspections, setInspections] = useState<InspectionRecord[]>(getStoredInspections);
  const [tickets, setTickets] = useState<IssueTicket[]>(getStoredTickets);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [presetShift, setPresetShift] = useState<ShiftType | undefined>(undefined);
  const [targetDvrId, setTargetDvrId] = useState<string | undefined>(undefined);

  // Health alerts modal
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Modals
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);
  const [printReportData, setPrintReportData] = useState<any | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Language switch
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    setStoredLanguage(newLang);
  };

  // Reset sample data
  const handleResetData = () => {
    const fresh = resetAllToDefault();
    setLocations(fresh.locations);
    setCameras(fresh.cameras);
    setInspections(fresh.inspections);
    setTickets(fresh.tickets);
    showToast(
      lang === 'km'
        ? 'បានកំណត់ទិន្នន័យគំរូឡើងវិញដោយជោគជ័យ!'
        : 'Sample data restored successfully!'
    );
  };

  // Handlers for data updates
  const handleUpdateLocations = (newLocs: LocationZone[]) => {
    setLocations(newLocs);
    setStoredLocations(newLocs);
    showToast(
      lang === 'km' ? 'បានរក្សាទុកទីតាំងដោយជោគជ័យ' : 'Location updated successfully'
    );
  };

  const handleUpdateCameras = (newCams: Camera[]) => {
    setCameras(newCams);
    setStoredCameras(newCams);
    showToast(
      lang === 'km' ? 'បានកែប្រែកាមេរ៉ាដោយជោគជ័យ' : 'Camera updated successfully'
    );
  };

  const handleUpdateTickets = (newTickets: IssueTicket[]) => {
    setTickets(newTickets);
    setStoredTickets(newTickets);
    showToast(
      lang === 'km' ? 'បានធ្វើបច្ចុប្បន្នភាពសំបុត្របញ្ហា' : 'Issue tickets updated'
    );
  };

  const handleUpdateCameraStatus = (
    cameraId: string,
    status: 'working' | 'faulty' | 'offline'
  ) => {
    const updated = cameras.map(c => (c.id === cameraId ? { ...c, status } : c));
    setCameras(updated);
    setStoredCameras(updated);
  };

  // Save new Inspection Record
  const handleSaveInspection = (record: InspectionRecord, newTickets: IssueTicket[]) => {
    const updatedInspections = [record, ...inspections];
    setInspections(updatedInspections);
    setStoredInspections(updatedInspections);

    // Update cameras live statuses based on inspection items
    const updatedCameras = cameras.map(cam => {
      const item = record.items.find(i => i.cameraId === cam.id);
      if (item) {
        if (item.status === 'issue') {
          return {
            ...cam,
            status: item.issueSeverity === 'critical' ? ('offline' as const) : ('faulty' as const),
            notes: item.notes || cam.notes,
            lastCheckedAt: record.completedAt,
          };
        } else {
          return {
            ...cam,
            status: 'working' as const,
            notes: undefined,
            lastCheckedAt: record.completedAt,
          };
        }
      }
      return cam;
    });

    setCameras(updatedCameras);
    setStoredCameras(updatedCameras);

    // If new tickets generated, prepend them
    if (newTickets.length > 0) {
      const updatedTickets = [...newTickets, ...tickets];
      setTickets(updatedTickets);
      setStoredTickets(updatedTickets);
    }

    showToast(translations[lang].inspectionSavedSuccess);
  };

  // Sync Smart Inspection Report from Screenshot Scanner & Weekly Checklist
  const handleSyncSmartReport = (smartReport: SmartInspectionReport) => {
    // Standardize inspection date
    let formattedDate = smartReport.inspectionDate;
    if (formattedDate && formattedDate.includes('/')) {
      const parts = formattedDate.split('/');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (!formattedDate || formattedDate.length !== 10) {
      formattedDate = new Date().toISOString().slice(0, 10);
    }

    const nowIso = new Date().toISOString();
    const inspectorName =
      smartReport.signOff?.itOfficer?.trim() ||
      (lang === 'km' ? 'មន្ត្រីសន្តិសុខ IT' : 'IT Security Officer');

    // 1. Update camera statuses & lastCheckedAt
    const updatedCameras = cameras.map((cam, idx) => {
      const reportCam =
        smartReport.cameras.find(c => c.number === idx + 1) ||
        smartReport.cameras[idx % smartReport.cameras.length];

      if (reportCam && (reportCam.dayStatus === 'issue' || reportCam.nightStatus === 'issue')) {
        return {
          ...cam,
          status: 'faulty' as const,
          notes: reportCam.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)',
          lastCheckedAt: nowIso,
        };
      }
      return {
        ...cam,
        status: 'working' as const,
        lastCheckedAt: nowIso,
      };
    });
    setCameras(updatedCameras);
    setStoredCameras(updatedCameras);

    // 2. Automatically create & persist InspectionRecord in CCTV Inspection Log
    const items: InspectionItem[] = cameras.map((cam, idx) => {
      const reportCam =
        smartReport.cameras.find(c => c.number === idx + 1) ||
        smartReport.cameras[idx % smartReport.cameras.length];
      const hasIssue =
        reportCam && (reportCam.dayStatus === 'issue' || reportCam.nightStatus === 'issue');

      return {
        cameraId: cam.id,
        status: hasIssue ? 'issue' : 'ok',
        issueType: hasIssue ? ('no_signal' as const) : undefined,
        issueSeverity: hasIssue ? ('critical' as const) : undefined,
        notes: hasIssue
          ? reportCam?.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)'
          : undefined,
      };
    });

    const normalCount = items.filter(i => i.status === 'ok').length;
    const issueCount = items.filter(i => i.status === 'issue').length;

    const newRecord: InspectionRecord = {
      id: `insp-smart-${Date.now()}`,
      date: formattedDate,
      shift: smartReport.shift || 'day',
      inspectorName,
      inspectorRole: 'IT Security & Surveillance Lead',
      completedAt: nowIso,
      items,
      overallNotes: `Weekly Checklist Audit [${smartReport.zone || 'DVR'}] - ${
        issueCount > 0
          ? `${issueCount} cameras reported faulty (${smartReport.faultyListStr || ''})`
          : 'All channels verified working 100%'
      }`,
      weatherCondition: 'Normal / Indoor DVR Monitoring',
      totalCamerasChecked: items.length,
      normalCount,
      issueCount,
    };

    const updatedInspections = [newRecord, ...inspections];
    setInspections(updatedInspections);
    setStoredInspections(updatedInspections);

    // 3. Auto-generate & persist IssueTickets in Fault Tracking & Maintenance Dispatch
    const faultyReportCameras = smartReport.cameras.filter(
      c => c.dayStatus === 'issue' || c.nightStatus === 'issue'
    );

    const newTickets: IssueTicket[] = faultyReportCameras.map((c, i) => {
      const cam =
        cameras.find(camItem => camItem.code === `CAM-${String(c.number).padStart(2, '0')}`) ||
        cameras[c.number - 1] ||
        cameras[0];

      return {
        id: `tkt-smart-${Date.now()}-${i}`,
        ticketNumber: `TKT-2026-${String(Math.floor(100 + Math.random() * 899))}`,
        cameraId: cam?.id || `cam-${c.number}`,
        locationId: cam?.locationId || 'loc-01',
        reportedDate: formattedDate,
        shift: smartReport.shift || 'day',
        reportedBy: inspectorName,
        issueType: 'no_signal' as const,
        severity: 'critical' as const,
        status: 'reported' as const,
        description: `[${smartReport.zone || 'DVR'}] CAM ${c.number} (${
          c.nameThai || c.nameKm || cam?.nameKm || 'Camera'
        }): ${c.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)'}`,
        assignedTo:
          smartReport.signOff?.maintenanceLead?.trim() ||
          (lang === 'km' ? 'ក្រុមជាងជួសជុលបន្ទាន់' : 'Emergency Maintenance Tech'),
        repairCost: 0,
      };
    });

    if (newTickets.length > 0) {
      const combined = [...newTickets, ...tickets];
      setTickets(combined);
      setStoredTickets(combined);
    }

    showToast(
      lang === 'km'
        ? `✓ បានរក្សាទុក Weekly Checklist និង Auto-Save ចូល CCTV Inspection Log & Fault Tracking (${newTickets.length} សំបុត្រ)!`
        : `✓ Saved Weekly Checklist & auto-saved to CCTV Inspection Log & Fault Tracking (${newTickets.length} tickets created)!`
    );
  };

  // Sync CAMERA Inspection directly from all DVR checklists
  const handleSyncCameraInspectionFromChecklist = (targetShift?: ShiftType) => {
    const profiles = getStoredDVRProfiles();
    const dvrList = profiles && profiles.length > 0 ? profiles : initialDVRProfiles;
    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeShift: ShiftType = targetShift || presetShift || 'day';

    // Collect all checklist cameras across all DVRs
    const allChecklistCams = dvrList.flatMap(d => d.cameras || []);

    // 1. Update camera statuses & lastCheckedAt
    const updatedCameras = cameras.map((cam, idx) => {
      const camNum = parseInt(cam.code.replace(/[^0-9]/g, ''), 10) || (idx + 1);
      const matched =
        allChecklistCams.find(c => c.number === camNum) ||
        allChecklistCams[idx % allChecklistCams.length];

      const hasIssue = matched
        ? activeShift === 'day'
          ? matched.dayStatus === 'issue'
          : matched.nightStatus === 'issue'
        : false;

      if (hasIssue) {
        return {
          ...cam,
          status: 'faulty' as const,
          notes: matched?.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)',
          lastCheckedAt: nowIso,
        };
      }
      return {
        ...cam,
        status: 'working' as const,
        lastCheckedAt: nowIso,
      };
    });
    setCameras(updatedCameras);
    setStoredCameras(updatedCameras);

    // 2. Generate and save InspectionRecord in CCTV Inspection Log
    const items: InspectionItem[] = cameras.map((cam, idx) => {
      const camNum = parseInt(cam.code.replace(/[^0-9]/g, ''), 10) || (idx + 1);
      const matched =
        allChecklistCams.find(c => c.number === camNum) ||
        allChecklistCams[idx % allChecklistCams.length];
      const hasIssue = matched
        ? activeShift === 'day'
          ? matched.dayStatus === 'issue'
          : matched.nightStatus === 'issue'
        : false;

      return {
        cameraId: cam.id,
        status: hasIssue ? 'issue' : 'ok',
        issueType: hasIssue ? ('no_signal' as const) : undefined,
        issueSeverity: hasIssue ? ('critical' as const) : undefined,
        notes: hasIssue
          ? matched?.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)'
          : undefined,
      };
    });

    const normalCount = items.filter(i => i.status === 'ok').length;
    const issueCount = items.filter(i => i.status === 'issue').length;

    const newRecord: InspectionRecord = {
      id: `insp-sync-${Date.now()}`,
      date: todayStr,
      shift: activeShift,
      inspectorName: lang === 'km' ? 'មន្ត្រីសន្តិសុខ IT' : 'IT Surveillance Lead',
      inspectorRole: 'Surveillance Audit Lead',
      completedAt: nowIso,
      items,
      overallNotes: `Synced from Weekly Checklist (${activeShift === 'day' ? 'Day' : 'Night'} Shift) - ${issueCount} issues detected across ${dvrList.length} DVRs`,
      weatherCondition: 'Clear / Indoor Surveillance Room',
      totalCamerasChecked: items.length,
      normalCount,
      issueCount,
    };

    const updatedInspections = [newRecord, ...inspections];
    setInspections(updatedInspections);
    setStoredInspections(updatedInspections);

    // 3. Auto-generate IssueTickets for faulty cameras if any
    const faultyItems = items.filter(i => i.status === 'issue');
    const newTickets: IssueTicket[] = faultyItems.map((item, i) => {
      const cam = cameras.find(c => c.id === item.cameraId) || cameras[0];
      const matched = allChecklistCams.find(
        c => c.number === (parseInt(cam.code.replace(/[^0-9]/g, ''), 10) || i + 1)
      );

      return {
        id: `tkt-sync-${Date.now()}-${i}`,
        ticketNumber: `TKT-2026-${String(Math.floor(200 + Math.random() * 799))}`,
        cameraId: cam.id,
        locationId: cam.locationId || 'loc-01',
        reportedDate: todayStr,
        shift: activeShift,
        reportedBy: lang === 'km' ? 'មន្ត្រីសន្តិសុខ IT' : 'IT Surveillance Lead',
        issueType: 'no_signal' as const,
        severity: 'critical' as const,
        status: 'reported' as const,
        description: `CAM ${cam.code} (${matched?.nameThai || cam.nameKm}): ${item.notes || 'Black screen'} [Synced from Checklist]`,
        assignedTo: lang === 'km' ? 'ក្រុមជាងជួសជុលបន្ទាន់' : 'Emergency Maintenance Tech',
        repairCost: 0,
      };
    });

    if (newTickets.length > 0) {
      const combined = [...newTickets, ...tickets];
      setTickets(combined);
      setStoredTickets(combined);
    }

    showToast(
      lang === 'km'
        ? `✓ បាន Sync ការត្រួតពិនិត្យកាមេរ៉ាពី Checklist (${activeShift === 'day' ? 'វេនថ្ងៃ' : 'វេនយប់'}) ជោគជ័យ! (${normalCount} OK, ${issueCount} បញ្ហា)`
        : `✓ Synced CAMERA Inspection from checklist (${activeShift.toUpperCase()} Shift): ${normalCount} OK, ${issueCount} issues!`
    );
  };

  // Navigations from Dashboard
  const handleNavigateToInspection = (shift?: ShiftType) => {
    setPresetShift(shift);
    setCurrentTab('inspection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTicketsCount = tickets.filter(
    t => t.status !== 'closed' && t.status !== 'resolved'
  ).length;

  const previewCameraLocation = previewCamera
    ? locations.find(l => l.id === previewCamera.locationId)
    : undefined;

  // 🚨 Automated Health Alert Monitoring (72h inspection threshold & DVR fleet health)
  const cameraAlerts = useMemo(() => getOverdueCameraAlerts(cameras), [cameras]);

  const dvrAlerts = useMemo(() => {
    const profiles = getStoredDVRProfiles();
    const list = profiles && profiles.length > 0 ? profiles : initialDVRProfiles;
    return list.flatMap(p => getDVRHealthAlerts(p));
  }, []);

  const handleMarkCameraInspected = (cameraId: string) => {
    const now = new Date().toISOString();
    const updated = cameras.map(c => (c.id === cameraId ? { ...c, lastCheckedAt: now } : c));
    setCameras(updated);
    setStoredCameras(updated);
    showToast(
      lang === 'km'
        ? '✓ បានសម្គាល់កាមេរ៉ាត្រួតពិនិត្យរួចរាល់ (បាន Reset រយៈពេល ៧២ ម៉ោង)'
        : '✓ Camera marked as inspected (72h timer reset)'
    );
  };

  const handleMarkAllCamerasInspected = () => {
    const now = new Date().toISOString();
    const updated = cameras.map(c => ({ ...c, lastCheckedAt: now }));
    setCameras(updated);
    setStoredCameras(updated);
    showToast(
      lang === 'km'
        ? '✓ បានសម្គាល់កាមេរ៉ាទាំងអស់ត្រួតពិនិត្យរួចរាល់!'
        : '✓ All cameras marked as inspected successfully!'
    );
  };

  const handleNavigateToDvr = (dvrId: string) => {
    setTargetDvrId(dvrId);
    setCurrentTab('smart-scanner');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-sky-500 selection:text-white">
      {/* Sidebar Navigation with Live Health Alerts */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={tab => {
          setCurrentTab(tab);
          setPresetShift(undefined);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onResetData={handleResetData}
        openTicketsCount={openTicketsCount}
        cameraOverdueCount={cameraAlerts.length}
        dvrHealthAlertsCount={dvrAlerts.length}
        onOpenHealthModal={() => setIsHealthModalOpen(true)}
      />

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-sky-900 border border-sky-500 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
          {currentTab === 'dashboard' && (
            <DashboardView
              locations={locations}
              cameras={cameras}
              inspections={inspections}
              tickets={tickets}
              lang={lang}
              onNavigateToInspection={handleNavigateToInspection}
              onNavigateToProblems={() => {
                setCurrentTab('problems');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateToWeeklyReport={() => {
                setCurrentTab('weekly-report');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenReportIssueModal={() => {
                setCurrentTab('problems');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateToSmartScanner={() => {
                setCurrentTab('smart-scanner');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPreviewCamera={setPreviewCamera}
            />
          )}

          {currentTab === 'inspection' && (
            <InspectionView
              locations={locations}
              cameras={cameras}
              inspections={inspections}
              tickets={tickets}
              lang={lang}
              presetShift={presetShift}
              onSaveInspection={handleSaveInspection}
              onPreviewCamera={setPreviewCamera}
              onSyncFromChecklist={handleSyncCameraInspectionFromChecklist}
            />
          )}

          {currentTab === 'smart-scanner' && (
            <SmartScannerView
              lang={lang}
              onSyncWithSystem={handleSyncSmartReport}
              onNavigateToWeeklyReport={() => {
                setCurrentTab('weekly-report');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              targetDvrId={targetDvrId}
              onOpenHealthModal={() => setIsHealthModalOpen(true)}
            />
          )}

          {currentTab === 'weekly-report' && (
            <WeeklyReportView
              locations={locations}
              cameras={cameras}
              inspections={inspections}
              tickets={tickets}
              lang={lang}
              onOpenPrintModal={setPrintReportData}
              onNavigateToSmartScanner={() => {
                setCurrentTab('smart-scanner');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSyncFromChecklist={handleSyncCameraInspectionFromChecklist}
            />
          )}

          {currentTab === 'problems' && (
            <ProblemTrackingView
              locations={locations}
              cameras={cameras}
              tickets={tickets}
              lang={lang}
              onUpdateTickets={handleUpdateTickets}
              onUpdateCameraStatus={handleUpdateCameraStatus}
              onPreviewCamera={setPreviewCamera}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="no-print mt-auto border-t border-slate-900 bg-slate-950/80 py-5 text-center text-xs text-slate-500">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 CCTV Sentinel • {translations[lang].appTitle}</p>
            <p className="font-mono text-[11px] text-slate-600">
              13 Surveillance Zones • Day & Night Shifts • Enterprise Audit Standard
            </p>
          </div>
        </footer>
      </div>

      {/* Camera Live Preview Simulation Modal */}
      <CameraPreviewModal
        camera={previewCamera}
        location={previewCameraLocation}
        lang={lang}
        onClose={() => setPreviewCamera(null)}
      />

      {/* Printable Weekly Audit Report Modal */}
      <PrintReportModal
        data={printReportData}
        lang={lang}
        onClose={() => setPrintReportData(null)}
      />

      {/* Automated Camera & DVR Fleet Health Alert Diagnostics Modal */}
      <HealthAlertModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        lang={lang}
        cameraAlerts={cameraAlerts}
        dvrAlerts={dvrAlerts}
        locations={locations}
        onMarkCameraInspected={handleMarkCameraInspected}
        onMarkAllCamerasInspected={handleMarkAllCamerasInspected}
        onNavigateToInspection={() => {
          setCurrentTab('inspection');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateToDvr={handleNavigateToDvr}
      />
    </div>
  );
}
