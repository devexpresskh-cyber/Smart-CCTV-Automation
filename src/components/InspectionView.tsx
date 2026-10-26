import React, { useState } from 'react';
import {
  Camera,
  InspectionRecord,
  InspectionItem,
  IssueTicket,
  LocationZone,
  Language,
  ShiftType,
  IssueType,
  IssueSeverity,
} from '../types';
import { translations } from '../i18n/translations';
import { exportInspectionsToExcel } from '../utils/exportUtils';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  Filter,
  Eye,
  FileSpreadsheet,
  Check,
  Calendar,
  User,
  Shield,
  Search,
  ChevronDown,
  Layers,
  Sparkles,
  Clock,
  RotateCw,
  RefreshCw,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  isCameraOverdue,
  getCameraOverdueHours,
  formatOverdueTime,
} from '../utils/healthAlerts';
import { getStoredDVRProfiles } from '../utils/storage';
import { initialDVRProfiles } from '../data/smartReportTemplate';

interface InspectionViewProps {
  locations: LocationZone[];
  cameras: Camera[];
  inspections: InspectionRecord[];
  tickets: IssueTicket[];
  lang: Language;
  presetShift?: ShiftType;
  onSaveInspection: (record: InspectionRecord, newTickets: IssueTicket[]) => void;
  onPreviewCamera: (camera: Camera) => void;
  onSyncFromChecklist?: (shift?: ShiftType) => void;
  onUpdateInspections?: (inspections: InspectionRecord[]) => void;
}

export const InspectionView: React.FC<InspectionViewProps> = ({
  locations,
  cameras,
  inspections,
  lang,
  presetShift,
  onSaveInspection,
  onPreviewCamera,
  onSyncFromChecklist,
  onUpdateInspections,
}) => {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState<'new' | 'history'>('new');

  // Form states for New Inspection
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [shift, setShift] = useState<ShiftType>(presetShift || 'day');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorRole, setInspectorRole] = useState(lang === 'km' ? 'មន្ត្រីត្រួតពិនិត្យ CCTV' : 'Surveillance Officer');
  const [weatherCondition, setWeatherCondition] = useState(lang === 'km' ? 'មេឃស្រឡះ ពន្លឺធម្មតា' : 'Clear conditions');
  const [overallNotes, setOverallNotes] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedCameraCode, setSelectedCameraCode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Per-camera status state
  const [cameraChecks, setCameraChecks] = useState<
    Record<
      string,
      {
        status: 'ok' | 'issue';
        issueType?: IssueType;
        issueSeverity?: IssueSeverity;
        notes?: string;
      }
    >
  >(() => {
    const initial: Record<string, any> = {};
    cameras.forEach(c => {
      if (c.status === 'faulty') {
        initial[c.id] = {
          status: 'issue',
          issueType: 'blur_lens',
          issueSeverity: 'low',
          notes: c.notes || 'ពិនិត្យឃើញរូបភាពមិនច្បាស់',
        };
      } else if (c.status === 'offline') {
        initial[c.id] = {
          status: 'issue',
          issueType: 'no_signal',
          issueSeverity: 'critical',
          notes: c.notes || 'គ្មានសញ្ញារូបភាព (Offline)',
        };
      } else {
        initial[c.id] = {
          status: 'ok',
        };
      }
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Multi-select and clear state for Inspection History
  const [selectedInspectionIds, setSelectedInspectionIds] = useState<string[]>([]);

  const handleToggleSelectInspection = (id: string) => {
    setSelectedInspectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllInspections = () => {
    if (selectedInspectionIds.length === inspections.length) {
      setSelectedInspectionIds([]);
    } else {
      setSelectedInspectionIds(inspections.map(i => i.id));
    }
  };

  const handleDeleteSelectedInspections = () => {
    if (selectedInspectionIds.length === 0 || !onUpdateInspections) return;
    const count = selectedInspectionIds.length;
    const confirmMsg =
      lang === 'km'
        ? `តើអ្នកពិតជាចង់លុបកំណត់ត្រាត្រួតពិនិត្យចំនួន ${count} ដែលបានជ្រើសរើសនេះមែនទេ?`
        : `Are you sure you want to delete ${count} selected inspection log record(s)?`;

    if (window.confirm(confirmMsg)) {
      const remaining = inspections.filter(i => !selectedInspectionIds.includes(i.id));
      onUpdateInspections(remaining);
      setSelectedInspectionIds([]);
    }
  };

  const handleDeleteSingleInspection = (id: string) => {
    if (!onUpdateInspections) return;
    const rec = inspections.find(i => i.id === id);
    const confirmMsg =
      lang === 'km'
        ? `តើអ្នកពិតជាចង់លុបកំណត់ត្រាត្រួតពិនិត្យកាលបរិច្ឆេទ ${rec?.date || ''} (${rec?.shift === 'day' ? 'វេនថ្ងៃ' : 'វេនយប់'}) នេះមែនទេ?`
        : `Are you sure you want to delete inspection log for ${rec?.date || ''} (${rec?.shift || ''})?`;

    if (window.confirm(confirmMsg)) {
      const remaining = inspections.filter(i => i.id !== id);
      onUpdateInspections(remaining);
      setSelectedInspectionIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleClearAllInspections = () => {
    if (inspections.length === 0 || !onUpdateInspections) return;
    const count = inspections.length;
    const confirmMsg =
      lang === 'km'
        ? `⚠️ តើអ្នកពិតជាចង់សម្អាតកំណត់ត្រាត្រួតពិនិត្យ CCTV ទាំងអស់ (${count} កំណត់ត្រា) មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`
        : `⚠️ Are you sure you want to clear all ${count} CCTV inspection log records? This action cannot be undone.`;

    if (window.confirm(confirmMsg)) {
      onUpdateInspections([]);
      setSelectedInspectionIds([]);
    }
  };

  // Clear / Reset form checklist
  const handleClearChecklistForm = () => {
    const confirmMsg =
      lang === 'km'
        ? 'តើអ្នកចង់កំណត់ទម្រង់ត្រួតពិនិត្យនេះឡើងវិញ (Reset Checklist) មែនទេ?'
        : 'Reset the checklist form to default values?';

    if (window.confirm(confirmMsg)) {
      const initial: Record<string, any> = {};
      cameras.forEach(c => {
        initial[c.id] = { status: 'ok' };
      });
      setCameraChecks(initial);
      setOverallNotes('');
      setWeatherCondition(lang === 'km' ? 'មេឃស្រឡះ ពន្លឺធម្មតា' : 'Clear conditions');
    }
  };

  // Sync camera inspection statuses directly from the latest Weekly Checklist / DVR profiles
  const handleSyncFromChecklist = () => {
    setIsSyncing(true);
    const profiles = getStoredDVRProfiles();
    const dvrList = profiles && profiles.length > 0 ? profiles : initialDVRProfiles;
    const allChecklistCams = dvrList.flatMap(d => d.cameras || []);

    let normalCount = 0;
    let issueCount = 0;

    setCameraChecks(prev => {
      const next = { ...prev };
      cameras.forEach((cam, idx) => {
        const camNum = parseInt(cam.code.replace(/[^0-9]/g, ''), 10) || (idx + 1);
        const matched =
          allChecklistCams.find(c => c.number === camNum) ||
          allChecklistCams[idx % allChecklistCams.length];

        const hasIssue = matched
          ? shift === 'day'
            ? matched.dayStatus === 'issue'
            : matched.nightStatus === 'issue'
          : cam.status === 'faulty' || cam.status === 'offline';

        if (hasIssue) {
          issueCount++;
          next[cam.id] = {
            status: 'issue',
            issueType: 'no_signal',
            issueSeverity: 'critical',
            notes: matched?.symptom || 'នៅអេក្រង់មិនបង្ហាញរូបភាព (Black screen)',
          };
        } else {
          normalCount++;
          next[cam.id] = {
            status: 'ok',
          };
        }
      });
      return next;
    });

    setIsSyncing(false);
    setSyncFeedback(
      lang === 'km'
        ? `✓ បាន Sync ការត្រួតពិនិត្យកាមេរ៉ាពី Checklist (${shift === 'day' ? 'វេនថ្ងៃ' : 'វេនយប់'}): ${normalCount} ធម្មតា (OK), ${issueCount} មានបញ្ហា!`
        : `✓ Synced CAMERA Inspection from checklist (${shift.toUpperCase()} Shift): ${normalCount} OK, ${issueCount} issues detected!`
    );
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  // Filtered cameras based on location filter, overdue filter, and search query
  const filteredCameras = cameras.filter(cam => {
    if (filterOverdueOnly && !isCameraOverdue(cam)) {
      return false;
    }
    if (selectedLocationId !== 'all' && cam.locationId !== selectedLocationId) {
      return false;
    }
    if (selectedCameraCode !== 'all') {
      const matchCam = cam.id === selectedCameraCode || cam.code === selectedCameraCode;
      if (!matchCam) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const loc = locations.find(l => l.id === cam.locationId);
      return (
        cam.code.toLowerCase().includes(q) ||
        cam.nameKm.toLowerCase().includes(q) ||
        cam.nameEn.toLowerCase().includes(q) ||
        cam.ipAddress.includes(q) ||
        (loc && (loc.nameKm.toLowerCase().includes(q) || loc.nameEn.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  // Bulk action: Mark all visible OK
  const handleMarkAllVisibleOk = () => {
    setCameraChecks(prev => {
      const next = { ...prev };
      filteredCameras.forEach(cam => {
        next[cam.id] = { status: 'ok' };
      });
      return next;
    });
  };

  const handleToggleStatus = (cameraId: string, newStatus: 'ok' | 'issue') => {
    setCameraChecks(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        status: newStatus,
        issueType: newStatus === 'issue' ? (prev[cameraId]?.issueType || 'no_signal') : undefined,
        issueSeverity: newStatus === 'issue' ? (prev[cameraId]?.issueSeverity || 'medium') : undefined,
      },
    }));
  };

  const handleUpdateIssueDetails = (
    cameraId: string,
    field: 'issueType' | 'issueSeverity' | 'notes',
    value: any
  ) => {
    setCameraChecks(prev => ({
      ...prev,
      [cameraId]: {
        ...prev[cameraId],
        [field]: value,
      },
    }));
  };

  // Submit Inspection Record
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectorName.trim()) {
      alert(t.fillRequiredFields);
      return;
    }

    setSaving(true);

    const items: InspectionItem[] = cameras.map(cam => {
      const check = cameraChecks[cam.id] || { status: 'ok' };
      return {
        cameraId: cam.id,
        status: check.status,
        issueType: check.issueType,
        issueSeverity: check.issueSeverity,
        notes: check.notes,
      };
    });

    const normalCount = items.filter(i => i.status === 'ok').length;
    const issueCount = items.filter(i => i.status === 'issue').length;

    const newRecord: InspectionRecord = {
      id: `insp-${date}-${shift}-${Date.now()}`,
      date,
      shift,
      inspectorName: inspectorName.trim(),
      inspectorRole: inspectorRole.trim(),
      completedAt: new Date().toISOString(),
      items,
      overallNotes: overallNotes.trim(),
      weatherCondition: weatherCondition.trim(),
      totalCamerasChecked: items.length,
      normalCount,
      issueCount,
    };

    // Auto-generate tickets for newly detected problems
    const newTickets: IssueTicket[] = [];
    items.forEach((item, idx) => {
      if (item.status === 'issue') {
        const cam = cameras.find(c => c.id === item.cameraId);
        if (cam) {
          newTickets.push({
            id: `tkt-${Date.now()}-${idx}`,
            ticketNumber: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
            cameraId: cam.id,
            locationId: cam.locationId,
            reportedDate: date,
            shift,
            reportedBy: inspectorName.trim(),
            issueType: item.issueType || 'other',
            severity: item.issueSeverity || 'medium',
            status: 'reported',
            description: item.notes || `បញ្ហាកត់ត្រាក្នុងការត្រួតពិនិត្យ (${shift === 'day' ? 'វេនថ្ងៃ' : 'វេនយប់'})`,
            assignedTo: 'ជាងជួសជុលបន្ទាន់ (On-call Technician)',
            repairCost: 0,
          });
        }
      }
    });

    onSaveInspection(newRecord, newTickets);
    setSaving(false);
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 5000);
  };

  const totalChecked = cameras.length;
  const currentOkCount = Object.values(cameraChecks).filter(c => c.status === 'ok').length;
  const currentIssueCount = Object.values(cameraChecks).filter(c => c.status === 'issue').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Subtabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>{t.inspectionTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {activeSubTab === 'new' ? t.newInspection : t.inspectionHistory}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'km'
              ? 'កត់ត្រាលទ្ធផលត្រួតពិនិត្យកាមេរ៉ាទាំងពេលថ្ងៃ (Day) និងពេលយប់ (Night) លើតំបន់ទាំង ១៣'
              : 'Log visual, lens clarity, IR illumination and network health for all cameras'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('new')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'new'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.newInspection}
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'history'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.inspectionHistory} ({inspections.length})
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-xl text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{t.inspectionSavedSuccess}</span>
        </div>
      )}

      {/* Subtab 1: Conduct New Inspection */}
      {activeSubTab === 'new' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inspection Metadata Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>{lang === 'km' ? 'ព័ត៌មាននៃការត្រួតពិនិត្យ' : 'Inspection Shift Details'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.selectDate}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              {/* Shift Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.selectShift}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShift('day')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      shift === 'day'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.shiftDayOnly}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShift('night')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      shift === 'night'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.shiftNightOnly}</span>
                  </button>
                </div>
              </div>

              {/* Inspector Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.inspectorName}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    placeholder="ឈ្មោះអ្នកត្រួតពិនិត្យ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Inspector Role */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.inspectorRole}
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={inspectorRole}
                    onChange={e => setInspectorRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.weatherCondition}
                </label>
                <input
                  type="text"
                  value={weatherCondition}
                  onChange={e => setWeatherCondition(e.target.value)}
                  placeholder={t.weatherPlaceholder}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.notes}
                </label>
                <input
                  type="text"
                  value={overallNotes}
                  onChange={e => setOverallNotes(e.target.value)}
                  placeholder={lang === 'km' ? 'ចំណាំរួមនៃការត្រួតពិនិត្យវេននេះ...' : 'Overall observations for this shift...'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Camera Checklist Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-400" />
                  <span>{lang === 'km' ? 'បញ្ជីកាមេរ៉ាត្រូវត្រួតពិនិត្យ' : 'Surveillance Checklist'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'km'
                    ? `កំពុងបង្ហាញ ${filteredCameras.length} ក្នុងចំណោម ${cameras.length} កាមេរ៉ា`
                    : `Showing ${filteredCameras.length} of ${cameras.length} cameras`}
                </p>
              </div>

              {/* Action Buttons: Sync from Checklist + Mark All OK */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSyncFromChecklist}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-sky-600/30 hover:scale-[1.01]"
                  title="Sync camera status with latest weekly checklist results"
                >
                  <RotateCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>
                    {lang === 'km'
                      ? `🔄 Sync CAMERA & Faults ពី Checklist (${shift === 'day' ? 'វេនថ្ងៃ' : 'វេនយប់'})`
                      : `🔄 Sync CAMERA & Faults from checklist (${shift.toUpperCase()})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllVisibleOk}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{t.markAllOk}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearChecklistForm}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                  title={lang === 'km' ? 'សម្អាតទម្រង់ត្រួតពិនិត្យ / Reset' : 'Clear / Reset Checklist Form'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lang === 'km' ? 'សម្អាតទម្រង់' : 'Clear Form'}</span>
                </button>
              </div>
            </div>

            {/* Sync Feedback Toast inside card */}
            {syncFeedback && (
              <div className="bg-sky-950/80 border border-sky-500/50 p-3 rounded-xl text-sky-200 flex items-center gap-2.5 shadow-lg shadow-sky-950/40">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold">{syncFeedback}</span>
              </div>
            )}

            {/* Filters bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {/* Location Zone Filter */}
              <div className="relative">
                <select
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="all">{t.allLocations}</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code}: {lang === 'km' ? loc.nameKm : loc.nameEn}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Camera Code Filter (Synced from Checklist Cameras) */}
              <div className="relative">
                <select
                  value={selectedCameraCode}
                  onChange={e => setSelectedCameraCode(e.target.value)}
                  className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="all">
                    {lang === 'km' ? 'គ្រប់កូដកាមេរ៉ា (All Camera Codes)' : 'All Camera Codes'}
                  </option>
                  {locations.map(loc => {
                    const locCams = cameras.filter(c => c.locationId === loc.id);
                    if (locCams.length === 0) return null;
                    return (
                      <optgroup
                        key={loc.id}
                        label={`[${loc.code}] ${loc.nameEn} (${loc.nameKm})`}
                        className="bg-slate-900 text-sky-400 font-semibold"
                      >
                        {locCams.map(cam => (
                          <option key={cam.id} value={cam.id} className="bg-slate-950 text-white font-normal">
                            {cam.code} - {cam.nameEn} ({cam.nameKm})
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {cameras.filter(c => !locations.some(l => l.id === c.locationId)).length > 0 && (
                    <optgroup label="Other Cameras" className="bg-slate-900 text-slate-400 font-semibold">
                      {cameras
                        .filter(c => !locations.some(l => l.id === c.locationId))
                        .map(cam => (
                          <option key={cam.id} value={cam.id} className="bg-slate-950 text-white font-normal">
                            {cam.code} - {cam.nameEn}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Overdue (>72h) Filter Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs font-bold transition border ${
                    filterOverdueOnly
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lang === 'km' ? 'កាមេរ៉ាហួស ៧២ ម៉ោង' : 'Overdue (>72h)'}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold ${
                    filterOverdueOnly ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {cameras.filter(c => isCameraOverdue(c)).length}
                  </span>
                </button>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3 pt-2">
              {filteredCameras.map(camera => {
                const check = cameraChecks[camera.id] || { status: 'ok' };
                const loc = locations.find(l => l.id === camera.locationId);
                const isIssue = check.status === 'issue';
                const isOverdue = isCameraOverdue(camera);
                const overdueHours = getCameraOverdueHours(camera);

                return (
                  <div
                    key={camera.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isIssue
                        ? 'bg-rose-950/20 border-rose-800/60 shadow-xs'
                        : isOverdue
                        ? 'bg-amber-950/15 border-amber-500/40 hover:border-amber-500/70'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onPreviewCamera(camera)}
                          className="p-2 bg-slate-800 hover:bg-sky-600/30 text-sky-400 rounded-lg transition shrink-0"
                          title={t.cameraPreview}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                              {camera.code}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {lang === 'km' ? camera.nameKm : camera.nameEn}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              • {loc ? (lang === 'km' ? loc.nameKm : loc.nameEn) : ''}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>{lang === 'km' ? 'ហួស ៧២ ម៉ោង' : 'Overdue (>72h)'} ({formatOverdueTime(overdueHours, lang === 'km')})</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            IP: {camera.ipAddress} • {camera.type.toUpperCase()} • {camera.model}
                            {camera.lastCheckedAt && (
                              <span className="ml-2 text-slate-400">
                                • {lang === 'km' ? 'ត្រួតពិនិត្យចុងក្រោយ:' : 'Last inspected:'} {new Date(camera.lastCheckedAt).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Status Toggle buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(camera.id, 'ok')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            !isIssue
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.normal}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(camera.id, 'issue')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isIssue
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-rose-400'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{t.abnormal}</span>
                        </button>
                      </div>
                    </div>

                    {/* Detailed Issue Entry if Abnormal is Selected */}
                    {isIssue && (
                      <div className="mt-3.5 pt-3.5 border-t border-rose-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-rose-950/30 p-3 rounded-lg">
                        {/* Issue Type */}
                        <div>
                          <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                            {t.issueDetails}
                          </label>
                          <select
                            value={check.issueType || 'no_signal'}
                            onChange={e =>
                              handleUpdateIssueDetails(camera.id, 'issueType', e.target.value)
                            }
                            className="w-full bg-slate-900 border border-rose-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="no_signal">{t.issue_no_signal}</option>
                            <option value="blur_lens">{t.issue_blur_lens}</option>
                            <option value="angle_shift">{t.issue_angle_shift}</option>
                            <option value="ir_night_fail">{t.issue_ir_night_fail}</option>
                            <option value="recording_error">{t.issue_recording_error}</option>
                            <option value="power_issue">{t.issue_power_issue}</option>
                            <option value="physical_damage">{t.issue_physical_damage}</option>
                            <option value="network_lag">{t.issue_network_lag}</option>
                            <option value="other">{t.issue_other}</option>
                          </select>
                        </div>

                        {/* Issue Severity */}
                        <div>
                          <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                            {t.severity}
                          </label>
                          <select
                            value={check.issueSeverity || 'medium'}
                            onChange={e =>
                              handleUpdateIssueDetails(camera.id, 'issueSeverity', e.target.value)
                            }
                            className="w-full bg-slate-900 border border-rose-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                          >
                            <option value="critical">{t.severity_critical}</option>
                            <option value="medium">{t.severity_medium}</option>
                            <option value="low">{t.severity_low}</option>
                          </select>
                        </div>

                        {/* Note */}
                        <div>
                          <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                            {t.notes}
                          </label>
                          <input
                            type="text"
                            value={check.notes || ''}
                            onChange={e =>
                              handleUpdateIssueDetails(camera.id, 'notes', e.target.value)
                            }
                            placeholder={lang === 'km' ? 'បញ្ជាក់ស្ថានភាពជាក់ស្តែង...' : 'Describe fault observation...'}
                            className="w-full bg-slate-900 border border-rose-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Submission Bar */}
          <div className="sticky bottom-4 z-30 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-slate-300">
                {t.totalCameras}: <strong className="text-white font-mono">{totalChecked}</strong>
              </span>
              <span className="text-emerald-400">
                {t.normal}: <strong className="font-mono">{currentOkCount}</strong>
              </span>
              <span className="text-rose-400">
                {t.faultyCameras}: <strong className="font-mono">{currentIssueCount}</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{saving ? t.saving : t.saveInspection}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Subtab 2: Inspection History */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">{t.inspectionHistory}</h3>
              <p className="text-xs text-slate-400">
                {lang === 'km'
                  ? 'កំណត់ត្រានៃការត្រួតពិនិត្យវេនថ្ងៃ និងវេនយប់កន្លងមក'
                  : 'Historical shift audit records and inspector sign-offs'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedInspectionIds.length > 0 && (
                <button
                  onClick={handleDeleteSelectedInspections}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm animate-pulse"
                  title={lang === 'km' ? 'លុបកំណត់ត្រាដែលបានជ្រើស' : 'Delete Selected Logs'}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {lang === 'km'
                      ? `លុប (${selectedInspectionIds.length})`
                      : `Delete (${selectedInspectionIds.length})`}
                  </span>
                </button>
              )}

              {inspections.length > 0 && (
                <button
                  onClick={handleClearAllInspections}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition shadow-xs"
                  title={lang === 'km' ? 'សម្អាតកំណត់ត្រាត្រួតពិនិត្យទាំងអស់' : 'Clear All CCTV Inspection Logs'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{lang === 'km' ? 'សម្អាតទាំងអស់' : 'Clear All'}</span>
                </button>
              )}

              <button
                onClick={() => exportInspectionsToExcel(inspections, cameras, locations, lang)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{t.exportExcel}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedInspectionIds.length === inspections.length && inspections.length > 0}
                      onChange={handleToggleSelectAllInspections}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer accent-sky-500"
                      title={selectedInspectionIds.length === inspections.length ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th className="py-3 px-4">{t.selectDate}</th>
                  <th className="py-3 px-4">{t.selectShift}</th>
                  <th className="py-3 px-4">{t.inspectorName}</th>
                  <th className="py-3 px-4">{t.weatherCondition}</th>
                  <th className="py-3 px-4 text-center">{t.status}</th>
                  <th className="py-3 px-4">{t.notes}</th>
                  <th className="py-3 px-4 text-right">{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60" />
                      <p>{lang === 'km' ? 'មិនមានកំណត់ត្រាត្រួតពិនិត្យ CCTV ទេ' : 'No CCTV inspection records found'}</p>
                    </td>
                  </tr>
                ) : (
                  inspections.map(rec => {
                    const isDay = rec.shift === 'day';
                    const isRowSelected = selectedInspectionIds.includes(rec.id);
                    return (
                      <tr
                        key={rec.id}
                        className={`transition ${
                          isRowSelected
                            ? 'bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-l-rose-500'
                            : 'hover:bg-slate-850/50'
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleToggleSelectInspection(rec.id)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 cursor-pointer accent-rose-500"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isDay
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {isDay ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
                            <span>{isDay ? t.shiftDayOnly : t.shiftNightOnly}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">{rec.inspectorName}</div>
                          <div className="text-[11px] text-slate-400">{rec.inspectorRole}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {rec.weatherCondition || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {rec.issueCount === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>100% OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{rec.issueCount} {lang === 'km' ? 'បញ្ហា' : 'issues'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                          {rec.overallNotes || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteSingleInspection(rec.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title={lang === 'km' ? 'លុបកំណត់ត្រានេះ' : 'Delete log entry'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
