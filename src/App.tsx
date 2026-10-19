import React, { useState, useEffect } from 'react';
import {
  Camera,
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
} from './utils/storage';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InspectionView } from './components/InspectionView';
import { LocationView } from './components/LocationView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { ProblemTrackingView } from './components/ProblemTrackingView';
import { SmartScannerView } from './components/SmartScannerView';
import { CameraPreviewModal } from './components/CameraPreviewModal';
import { PrintReportModal } from './components/PrintReportModal';
import { translations } from './i18n/translations';

export default function App() {
  const [lang, setLang] = useState<Language>(getStoredLanguage);
  const [locations, setLocations] = useState<LocationZone[]>(getStoredLocations);
  const [cameras, setCameras] = useState<Camera[]>(getStoredCameras);
  const [inspections, setInspections] = useState<InspectionRecord[]>(getStoredInspections);
  const [tickets, setTickets] = useState<IssueTicket[]>(getStoredTickets);

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [presetShift, setPresetShift] = useState<ShiftType | undefined>(undefined);
  const [targetLocationId, setTargetLocationId] = useState<string | undefined>(undefined);

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
      lang === 'km' ? 'បានធ្វើបច្ចុប្បន្នភាពសំបុត្របញ្ហា' : 'Issue ticket updated'
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

  // Sync Smart Inspection Report from Screenshot Scanner
  const handleSyncSmartReport = (smartReport: SmartInspectionReport) => {
    // 1. Update camera statuses
    const updatedCameras = cameras.map((cam, idx) => {
      const reportCam = smartReport.cameras[idx % smartReport.cameras.length];
      if (reportCam && reportCam.dayStatus === 'issue') {
        return {
          ...cam,
          status: 'faulty' as const,
          notes: reportCam.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)',
          lastCheckedAt: new Date().toISOString(),
        };
      }
      return cam;
    });
    setCameras(updatedCameras);
    setStoredCameras(updatedCameras);

    // 2. Generate new tickets for faulty cameras (e.g. CAM 2, 5, 16)
    const newTickets: IssueTicket[] = smartReport.cameras
      .filter(c => c.dayStatus === 'issue')
      .map((c, i) => ({
        id: `tkt-smart-${Date.now()}-${i}`,
        ticketNumber: `TKT-2026-0${c.number + 50}`,
        cameraId: cameras[c.number - 1]?.id || `cam-${c.number}`,
        locationId: 'loc-01',
        reportedDate: smartReport.inspectionDate.split('/').reverse().join('-') || new Date().toISOString().slice(0, 10),
        shift: smartReport.shift,
        reportedBy: smartReport.signOff.itOfficer,
        issueType: 'no_signal' as const,
        severity: 'critical' as const,
        status: 'reported' as const,
        description: `CAM ${c.number} (${c.nameThai}): ${c.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)'}`,
        assignedTo: smartReport.signOff.maintenanceLead,
        repairCost: 0,
      }));

    if (newTickets.length > 0) {
      const combined = [...newTickets, ...tickets];
      setTickets(combined);
      setStoredTickets(combined);
    }

    showToast(
      lang === 'km'
        ? 'បាន Update របាយការណ៍ស្វ័យប្រវត្តិ និង Sync ចូលប្រព័ន្ធជោគជ័យ!'
        : 'Report updated and synced to system successfully!'
    );
  };

  // Navigations from Dashboard
  const handleNavigateToInspection = (shift?: ShiftType) => {
    setPresetShift(shift);
    setCurrentTab('inspection');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToLocations = (locId?: string) => {
    setTargetLocationId(locId);
    setCurrentTab('locations');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTicketsCount = tickets.filter(
    t => t.status !== 'closed' && t.status !== 'resolved'
  ).length;

  const previewCameraLocation = previewCamera
    ? locations.find(l => l.id === previewCamera.locationId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-sky-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={tab => {
          setCurrentTab(tab);
          setPresetShift(undefined);
          setTargetLocationId(undefined);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onResetData={handleResetData}
        openTicketsCount={openTicketsCount}
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
              onNavigateToLocations={handleNavigateToLocations}
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
            />
          )}

          {currentTab === 'locations' && (
            <LocationView
              locations={locations}
              cameras={cameras}
              lang={lang}
              initialSelectedLocationId={targetLocationId}
              onUpdateLocations={handleUpdateLocations}
              onUpdateCameras={handleUpdateCameras}
              onPreviewCamera={setPreviewCamera}
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
    </div>
  );
}
