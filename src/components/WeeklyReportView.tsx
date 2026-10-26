import React, { useState, useRef, useEffect } from 'react';
import { Camera, InspectionRecord, IssueTicket, LocationZone, Language, DVRProfile } from '../types';
import { translations } from '../i18n/translations';
import { exportWeeklyReportToExcel } from '../utils/exportUtils';
import { getStoredDVRProfiles, setStoredDVRProfiles, hydrateDVRProfilesWithIDB } from '../utils/storage';
import { compressImage } from '../utils/idbStorage';
import { initialDVRProfiles } from '../data/smartReportTemplate';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  TrendingUp,
  ShieldCheck,
  Building2,
  PieChart,
  FileText,
  UserCheck,
  ChevronRight,
  Filter,
  Paperclip,
  Upload,
  Eye,
  Download,
  X,
  Zap,
  Maximize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCw,
} from 'lucide-react';

interface WeeklyReportViewProps {
  locations: LocationZone[];
  cameras: Camera[];
  inspections: InspectionRecord[];
  tickets: IssueTicket[];
  lang: Language;
  onOpenPrintModal: (reportData: any) => void;
  onNavigateToSmartScanner?: () => void;
  onSyncFromChecklist?: (shift?: 'day' | 'night') => void;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  locations,
  cameras,
  inspections,
  tickets,
  lang,
  onOpenPrintModal,
  onNavigateToSmartScanner,
  onSyncFromChecklist,
}) => {
  const t = translations[lang];

  // Week selection state (Default: Week 42: Oct 12, 2026 to Oct 18, 2026)
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'prev'>('current');
  const [recommendations, setRecommendations] = useState(t.defaultRecommendation);

  const startDate = selectedWeek === 'current' ? '2026-10-12' : '2026-10-05';
  const endDate = selectedWeek === 'current' ? '2026-10-18' : '2026-10-11';
  const weekLabel = selectedWeek === 'current' ? 'Week 42 (12-18 Oct 2026)' : 'Week 41 (05-11 Oct 2026)';

  // DVR Profiles with attached screenshots for weekly reporting
  const [dvrProfiles, setDvrProfiles] = useState<DVRProfile[]>(() => {
    const saved = getStoredDVRProfiles();
    return saved && saved.length > 0 ? saved : initialDVRProfiles;
  });

  // Hydrate full screenshots from IndexedDB on startup without touching camera configs
  useEffect(() => {
    hydrateDVRProfilesWithIDB(dvrProfiles).then(hydrated => {
      if (hydrated && hydrated.length > 0) {
        setDvrProfiles(current => {
          return current.map(curr => {
            const h = hydrated.find(x => x.id === curr.id);
            if (!h) return curr;
            return {
              ...curr,
              dayScreenshotUrl: curr.dayScreenshotUrl || h.dayScreenshotUrl,
              nightScreenshotUrl: curr.nightScreenshotUrl || h.nightScreenshotUrl,
              cameras: curr.cameras, // explicitly keep camera configurations intact
            };
          });
        });
      }
    });
  }, []);

  // Selected screenshot for Lightbox modal
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    title: string;
    subtitle: string;
    dvrName: string;
    shift: 'day' | 'night';
  } | null>(null);

  // Expanded DVR details in report
  const [expandedDvrId, setExpandedDvrId] = useState<string | null>(null);

  // Filter DVRs in the report view
  const [dvrSearchQuery, setDvrSearchQuery] = useState('');

  // Persist updated DVR profiles
  const updateAndSaveDvrProfiles = (updated: DVRProfile[]) => {
    setDvrProfiles(updated);
    setStoredDVRProfiles(updated);
  };

  // Replace screenshot directly from Weekly Report card with instant compression
  const handleReplaceScreenshot = async (
    dvrId: string,
    shift: 'day' | 'night',
    file: File
  ) => {
    const compressed = await compressImage(file, 800, 0.65);
    const updated = dvrProfiles.map(d => {
      if (d.id === dvrId) {
        return {
          ...d,
          dayScreenshotUrl: shift === 'day' ? compressed : d.dayScreenshotUrl,
          nightScreenshotUrl: shift === 'night' ? compressed : d.nightScreenshotUrl,
          lastCheckedDate: endDate,
        };
      }
      return d;
    });
    updateAndSaveDvrProfiles(updated);
  };

  // Helper to generate compact ~25KB sample monitor for any DVR
  const generateSampleMonitor = (chCount: number, dvrName: string, shift: 'day' | 'night'): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#1e2124';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, canvas.width, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(
      `SMART PSS | ${shift === 'day' ? 'Live View' : 'Playback CPS'} - [${dvrName}]`,
      10,
      18
    );

    const { cols, rows } = ((): { cols: number; rows: number } => {
      if (chCount <= 4) return { cols: 2, rows: 2 };
      if (chCount <= 8) return { cols: 4, rows: 2 };
      if (chCount <= 9) return { cols: 3, rows: 3 };
      if (chCount <= 16) return { cols: 4, rows: 4 };
      if (chCount <= 24) return { cols: 6, rows: 4 };
      if (chCount <= 32) return { cols: 8, rows: 4 };
      const c = Math.ceil(Math.sqrt(chCount));
      return { cols: c, rows: Math.ceil(chCount / c) };
    })();

    const marginX = 90;
    const marginY = 32;
    const availW = canvas.width - marginX - 6;
    const availH = canvas.height - marginY - (shift === 'night' ? 26 : 6);
    const cellW = Math.floor(availW / cols);
    const cellH = Math.floor(availH / rows);

    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 28, marginX, canvas.height - 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Default Group', 6, 44);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`▾ ${dvrName.slice(0, 10)}`, 8, 60);

    for (let i = 0; i < chCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = marginX + col * cellW;
      const y = marginY + row * cellH;

      let isFaulty = false;
      if (dvrName === 'Around Building' && (i === 1 || i === 4 || i === 15)) isFaulty = true;
      if (dvrName === 'Maintenance' && (i === 1 || i === 3)) isFaulty = true;
      if (dvrName === 'SIP Real estate' && i === 5) isFaulty = true;

      if (isFaulty) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(`CAM ${i + 1}`, x + 8, y + cellH - 8);
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText('NO VIDEO SIGNAL', x + cellW / 2 - 40, y + cellH / 2);
      } else {
        if (shift === 'night') {
          const brightness = 20 + ((i * 19) % 35);
          ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 8})`;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        } else {
          const hue = (i * 47) % 360;
          ctx.fillStyle = `hsl(${hue}, 25%, 38%)`;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`CAM ${i + 1}`, x + 6, y + cellH - 6);
      }
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellW, cellH);
    }

    return canvas.toDataURL('image/jpeg', 0.65);
  };

  // Pre-load all screenshots with 1-click
  const handlePreloadAllSamples = () => {
    const updated = dvrProfiles.map(dvr => ({
      ...dvr,
      dayScreenshotUrl: dvr.dayScreenshotUrl || generateSampleMonitor(dvr.channelCount, dvr.name, 'day'),
      nightScreenshotUrl: dvr.nightScreenshotUrl || generateSampleMonitor(dvr.channelCount, dvr.name, 'night'),
    }));
    updateAndSaveDvrProfiles(updated);
  };

  // Calculate 7 days in the week
  const daysOfWeek = [
    { key: 'monday', label: t.monday, date: selectedWeek === 'current' ? '2026-10-12' : '2026-10-05' },
    { key: 'tuesday', label: t.tuesday, date: selectedWeek === 'current' ? '2026-10-13' : '2026-10-06' },
    { key: 'wednesday', label: t.wednesday, date: selectedWeek === 'current' ? '2026-10-14' : '2026-10-07' },
    { key: 'thursday', label: t.thursday, date: selectedWeek === 'current' ? '2026-10-15' : '2026-10-08' },
    { key: 'friday', label: t.friday, date: selectedWeek === 'current' ? '2026-10-16' : '2026-10-09' },
    { key: 'saturday', label: t.saturday, date: selectedWeek === 'current' ? '2026-10-17' : '2026-10-10' },
    { key: 'sunday', label: t.sunday, date: selectedWeek === 'current' ? '2026-10-18' : '2026-10-11' },
  ];

  // Filter inspections within the week
  const weekInspections = inspections.filter(
    i => i.date >= startDate && i.date <= endDate
  );

  const dayInspections = weekInspections.filter(i => i.shift === 'day');
  const nightInspections = weekInspections.filter(i => i.shift === 'night');

  const totalPossibleShifts = 14;
  const completedShifts = weekInspections.length;
  const complianceRate = ((completedShifts / totalPossibleShifts) * 100).toFixed(1);

  // Tickets in this week
  const weekTickets = tickets.filter(
    tkt => tkt.reportedDate >= startDate && tkt.reportedDate <= endDate
  );
  const resolvedWeekTickets = weekTickets.filter(
    tkt => tkt.status === 'resolved' || tkt.status === 'closed'
  );

  const totalCams = cameras.length;
  const workingCams = cameras.filter(c => c.status === 'working').length;
  const healthRate = totalCams > 0 ? ((workingCams / totalCams) * 100).toFixed(1) : '100';

  // Issue types breakdown
  const issueTypesCount: Record<string, number> = {};
  weekTickets.forEach(tkt => {
    issueTypesCount[tkt.issueType] = (issueTypesCount[tkt.issueType] || 0) + 1;
  });

  // Location fault count
  const locationFaultsCount: Record<string, number> = {};
  weekTickets.forEach(tkt => {
    locationFaultsCount[tkt.locationId] = (locationFaultsCount[tkt.locationId] || 0) + 1;
  });

  const sortedFaultyLocations = Object.entries(locationFaultsCount)
    .sort((a, b) => b[1] - a[1])
    .map(([locId, count]) => {
      const loc = locations.find(l => l.id === locId);
      return { loc, count };
    });

  // Calculate attached screenshots statistics
  const totalDvrs = dvrProfiles.length;
  const attachedScreenshotsCount = dvrProfiles.filter(
    d => d.dayScreenshotUrl && d.nightScreenshotUrl
  ).length;
  const totalChannels = dvrProfiles.reduce((acc, d) => acc + d.channelCount, 0);

  // Filter DVRs
  const filteredDvrs = dvrProfiles.filter(
    d =>
      d.name.toLowerCase().includes(dvrSearchQuery.toLowerCase()) ||
      d.locationKm.toLowerCase().includes(dvrSearchQuery.toLowerCase())
  );

  const reportData = {
    weekLabel,
    startDate,
    endDate,
    complianceRate,
    completedShifts,
    totalPossibleShifts,
    totalCams,
    workingCams,
    healthRate,
    weekInspections,
    weekTickets,
    resolvedWeekTickets,
    recommendations,
    locations,
    cameras,
    dvrProfiles,
  };

  const handleExportExcel = () => {
    exportWeeklyReportToExcel(
      weekLabel,
      startDate,
      endDate,
      locations,
      cameras,
      inspections,
      tickets,
      lang
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.weeklyReportTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {lang === 'km' ? 'របាយការណ៍សង្ខេបស្វ័យប្រវត្តិនៃការត្រួតពិនិត្យ' : 'Surveillance Operational Audit Report'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {t.weekPeriod}: <span className="text-sky-400 font-mono font-bold">{startDate} ~ {endDate}</span> ({weekLabel})
          </p>
        </div>

        {/* Week Selector and Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setSelectedWeek('current')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedWeek === 'current'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.currentWeek}
            </button>
            <button
              onClick={() => setSelectedWeek('prev')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedWeek === 'prev'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.previousWeek}
            </button>
          </div>

          {onSyncFromChecklist && (
            <button
              onClick={() => onSyncFromChecklist()}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/25"
              title="Sync all cameras, inspection logs, and fault tracking tickets directly from weekly checklist"
            >
              <RotateCw className="w-4 h-4 text-white" />
              <span>{lang === 'km' ? '🔄 Sync CAMERA Inspection & Fault ពី Checklist' : '🔄 Sync CAMERA Inspection & Fault from checklist'}</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            onClick={() => onOpenPrintModal(reportData)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{t.exportPdf}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Inspection Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.inspectionRate}</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{complianceRate}%</span>
            <span className="text-xs text-slate-400">
              ({completedShifts}/{totalPossibleShifts} {lang === 'km' ? 'វេន' : 'shifts'})
            </span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-400 font-medium">
            {dayInspections.length} {t.shiftDayOnly} + {nightInspections.length} {t.shiftNightOnly}
          </p>
        </div>

        {/* Fleet Availability */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.operationalRate}</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">{healthRate}%</span>
            <span className="text-xs text-slate-400">
              {workingCams}/{totalCams} {t.workingCameras}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {lang === 'km' ? 'គ្របដណ្តប់លើទីតាំងទាំង ១៣' : 'Across all 13 mapped zones'}
          </p>
        </div>

        {/* Issues Logged This Week */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.issuesDiscovered}</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">{weekTickets.length}</span>
            <span className="text-xs text-slate-400">
              {lang === 'km' ? 'បញ្ហារកឃើញ' : 'incidents'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {weekTickets.filter(t => t.severity === 'critical').length} {lang === 'km' ? 'កម្រិតធ្ងន់ធ្ងរខ្លាំង' : 'critical tier'}
          </p>
        </div>

        {/* Repaired / Resolution Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.issuesResolvedThisWeek}</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{resolvedWeekTickets.length}</span>
            <span className="text-xs text-slate-400">
              {lang === 'km' ? 'ជួសជុលរួច' : 'fixed'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-indigo-300 font-medium">
            {t.resolutionRate}: {weekTickets.length > 0 ? ((resolvedWeekTickets.length / weekTickets.length) * 100).toFixed(0) : '100'}%
          </p>
        </div>
      </div>

      {/* 📸 ATTACHED DVR SCREENSHOTS & WEEKLY CHECKLIST EVIDENCE (Core User Request) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Paperclip className="w-4 h-4" />
              <span>ភស្តុតាងរូបថតអេក្រង់ DVR ភ្ជាប់ជាមួយ Checklist ប្រចាំសប្តាហ៍</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Attached DVR Screenshots Evidence ({totalDvrs} DVRs • {totalChannels} Channels)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'km'
                ? `រូបភាពអេក្រង់កាមេរ៉ាពេលថ្ងៃ (Day) និងពេលយប់ (Night) ភ្ជាប់ជាមួយ Checklists សម្រាប់សប្តាហ៍ទី ${weekLabel}`
                : `Verified Day & Night DVR surveillance screenshots attached to ${weekLabel} audit checklist`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handlePreloadAllSamples}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition"
              title="Preload sample Day & Night screenshots for any empty DVRs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Auto-fill Samples</span>
            </button>

            {onNavigateToSmartScanner && (
              <button
                onClick={onNavigateToSmartScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Screenshot Hub</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar and summary banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-semibold">
                {attachedScreenshotsCount}/{totalDvrs} DVRs Attached
              </span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400 font-mono">
              Total {totalChannels} Monitored Channels
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search DVR / Location..."
              value={dvrSearchQuery}
              onChange={e => setDvrSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full sm:w-60"
            />
          </div>
        </div>

        {/* DVR Cards Grid with Side-by-Side Screenshots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDvrs.map((dvr, idx) => {
            const hasDay = Boolean(dvr.dayScreenshotUrl);
            const hasNight = Boolean(dvr.nightScreenshotUrl);
            const isExpanded = expandedDvrId === dvr.id;

            const faultyCount =
              dvr.faultyCount ??
              dvr.cameras?.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length ??
              0;
            const workingCount = dvr.workingCount ?? (dvr.channelCount - faultyCount);

            return (
              <div
                key={dvr.id}
                className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3.5 transition hover:border-slate-700 shadow-xs"
              >
                {/* DVR Card Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{dvr.name}</h4>
                      <p className="text-[11px] text-slate-400">{dvr.locationKm}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded">
                      {dvr.channelCount} CH
                    </span>

                    {faultyCount > 0 ? (
                      <span className="text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded">
                        ⚠ {faultyCount} Faulty
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded">
                        ✓ {workingCount} OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Screenshots Side-by-Side Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Day Screenshot Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Sun className="w-3.5 h-3.5" />
                        <span>Day Shift</span>
                      </span>

                      <label className="text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1 font-semibold">
                        <Upload className="w-2.5 h-2.5" />
                        <span>Replace</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e =>
                            e.target.files?.[0] &&
                            handleReplaceScreenshot(dvr.id, 'day', e.target.files[0])
                          }
                        />
                      </label>
                    </div>

                    <div className="relative aspect-video rounded-lg bg-black border border-slate-800 overflow-hidden group">
                      {dvr.dayScreenshotUrl ? (
                        <>
                          <img
                            src={dvr.dayScreenshotUrl}
                            alt={`${dvr.name} Day`}
                            className="w-full h-full object-contain"
                          />
                          <div
                            onClick={() =>
                              setLightboxData({
                                url: dvr.dayScreenshotUrl!,
                                title: `${dvr.name} - Day Shift Screenshot`,
                                subtitle: `${dvr.locationKm} • ${dvr.channelCount} Channels`,
                                dvrName: dvr.name,
                                shift: 'day',
                              })
                            }
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer gap-1 text-xs text-white font-semibold"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>Zoom</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[10px] p-2 text-center">
                          <Sun className="w-5 h-5 mb-1 opacity-40 text-amber-400" />
                          <span>No Day Screenshot</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Night Screenshot Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                        <Moon className="w-3.5 h-3.5" />
                        <span>Night Shift</span>
                      </span>

                      <label className="text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1 font-semibold">
                        <Upload className="w-2.5 h-2.5" />
                        <span>Replace</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e =>
                            e.target.files?.[0] &&
                            handleReplaceScreenshot(dvr.id, 'night', e.target.files[0])
                          }
                        />
                      </label>
                    </div>

                    <div className="relative aspect-video rounded-lg bg-black border border-slate-800 overflow-hidden group">
                      {dvr.nightScreenshotUrl ? (
                        <>
                          <img
                            src={dvr.nightScreenshotUrl}
                            alt={`${dvr.name} Night`}
                            className="w-full h-full object-contain"
                          />
                          <div
                            onClick={() =>
                              setLightboxData({
                                url: dvr.nightScreenshotUrl!,
                                title: `${dvr.name} - Night Shift Playback Screenshot`,
                                subtitle: `${dvr.locationKm} • ${dvr.channelCount} Channels`,
                                dvrName: dvr.name,
                                shift: 'night',
                              })
                            }
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer gap-1 text-xs text-white font-semibold"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>Zoom</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[10px] p-2 text-center">
                          <Moon className="w-5 h-5 mb-1 opacity-40 text-indigo-400" />
                          <span>No Night Screenshot</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle details: Channel breakdown */}
                <div className="pt-1">
                  <button
                    onClick={() => setExpandedDvrId(isExpanded ? null : dvr.id)}
                    className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-white pt-1.5 border-t border-slate-800/80 transition"
                  >
                    <span>
                      {isExpanded ? 'Hide Channel Checklist' : 'Show Channel Breakdown'} ({dvr.cameras?.length || dvr.channelCount} cameras)
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && dvr.cameras && (
                    <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {dvr.cameras.map(c => {
                        const isDayOk = c.dayStatus === 'ok';
                        const isNightOk = c.nightStatus === 'ok';

                        return (
                          <div
                            key={c.number}
                            className="flex items-center justify-between p-1.5 rounded bg-slate-900 text-[10px]"
                          >
                            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                              <span className="font-mono font-bold text-slate-400">#{c.number}</span>
                              <span className="text-slate-200 truncate">{c.nameThai || c.nameKm}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono">
                              <span
                                className={`px-1.5 py-0.2 rounded ${
                                  isDayOk ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                                }`}
                              >
                                Day: {isDayOk ? 'OK' : 'FAIL'}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded ${
                                  isNightOk ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                                }`}
                              >
                                Night: {isNightOk ? 'OK' : 'FAIL'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-Day Day & Night Inspection Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>{t.inspectionMatrix}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'km'
              ? 'ការផ្ទៀងផ្ទាត់ការត្រួតពិនិត្យទាំង ៧ ថ្ងៃ រវាងវេនថ្ងៃ (Day Shift) និងវេនយប់ (Night Shift)'
              : 'Audit matrix tracking daily day and night surveillance shift compliance'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-3 text-left rounded-l-xl w-32">{t.selectShift}</th>
                {daysOfWeek.map(d => (
                  <th key={d.key} className="py-3 px-3">
                    <div className="font-bold text-slate-200">{d.label}</div>
                    <div className="text-[10px] text-slate-500">{d.date.slice(5)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* Day Shift Row */}
              <tr className="hover:bg-slate-850/40 transition">
                <td className="py-3.5 px-3 text-left font-semibold text-amber-300 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>{t.shiftDayOnly}</span>
                  </div>
                </td>
                {daysOfWeek.map(d => {
                  const record = weekInspections.find(i => i.date === d.date && i.shift === 'day');
                  if (record) {
                    const hasIssues = record.issueCount > 0;
                    return (
                      <td key={d.key} className="py-3.5 px-3">
                        <div
                          className={`p-2 rounded-xl text-center border ${
                            hasIssues
                              ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          }`}
                        >
                          <div className="font-bold text-[11px] flex items-center justify-center gap-1">
                            {hasIssues ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{hasIssues ? `${record.issueCount} Issue` : '100% OK'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[100px] mt-0.5 mx-auto">
                            {record.inspectorName.split(' ')[0]}
                          </div>
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={d.key} className="py-3.5 px-3">
                      <div className="p-2 rounded-xl text-center bg-slate-950/40 border border-slate-800/60 text-slate-500 text-[11px]">
                        {t.pending}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Night Shift Row */}
              <tr className="hover:bg-slate-850/40 transition">
                <td className="py-3.5 px-3 text-left font-semibold text-indigo-300 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>{t.shiftNightOnly}</span>
                  </div>
                </td>
                {daysOfWeek.map(d => {
                  const record = weekInspections.find(i => i.date === d.date && i.shift === 'night');
                  if (record) {
                    const hasIssues = record.issueCount > 0;
                    return (
                      <td key={d.key} className="py-3.5 px-3">
                        <div
                          className={`p-2 rounded-xl text-center border ${
                            hasIssues
                              ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          }`}
                        >
                          <div className="font-bold text-[11px] flex items-center justify-center gap-1">
                            {hasIssues ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{hasIssues ? `${record.issueCount} Issue` : '100% OK'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[100px] mt-0.5 mx-auto">
                            {record.inspectorName.split(' ')[0]}
                          </div>
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={d.key} className="py-3.5 px-3">
                      <div className="p-2 rounded-xl text-center bg-slate-950/40 border border-slate-800/60 text-slate-500 text-[11px]">
                        {t.pending}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Column Breakdown: Location Faults & Problem Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Faults Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>{t.topFaultyLocations}</span>
            </h3>
            <span className="text-xs text-slate-400">{sortedFaultyLocations.length} ទីតាំងមានបញ្ហា</span>
          </div>

          <div className="space-y-3">
            {sortedFaultyLocations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                {lang === 'km' ? 'គ្មានកំណត់ត្រាខូចខាតក្នុងសប្តាហ៍នេះទេ' : 'No faults logged this week'}
              </div>
            ) : (
              sortedFaultyLocations.map(({ loc, count }, idx) => (
                <div key={loc?.id || idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[250px]">
                      {loc ? (lang === 'km' ? loc.nameKm : loc.nameEn) : 'Unknown Location'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {count} {lang === 'km' ? 'បញ្ហា' : 'issues'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, count * 25)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Issue Types Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <span>{t.issueTypesBreakdown}</span>
            </h3>
            <span className="text-xs text-slate-400">{weekTickets.length} សរុប</span>
          </div>

          <div className="space-y-2.5">
            {Object.keys(issueTypesCount).length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                {t.noDataFound}
              </div>
            ) : (
              Object.entries(issueTypesCount).map(([type, count]) => {
                const label = t[`issue_${type}` as keyof typeof t] || type;
                const percent = ((count / weekTickets.length) * 100).toFixed(0);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-mono font-bold text-sky-400">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Official Recommendations and Sign-off */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-sky-400" />
          <span>{t.weeklyRecommendations}</span>
        </h3>

        <textarea
          value={recommendations}
          onChange={e => setRecommendations(e.target.value)}
          rows={4}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-sky-500"
        />

        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <UserCheck className="w-4 h-4 text-sky-400" />
              <span>{lang === 'km' ? 'មន្ត្រីត្រួតពិនិត្យទទួលបន្ទុក' : 'Surveillance Officer-In-Charge'}</span>
            </div>
            <div className="pt-6 border-b border-dashed border-slate-700" />
            <p className="text-[10px] text-slate-400 font-mono">{lang === 'km' ? '( ហត្ថលេខា & ឈ្មោះមន្ត្រីត្រួតពិនិត្យ / Signature & Name )' : '( Signature & Inspector Name )'}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'km' ? 'ប្រធានផ្នែកសន្តិសុខ & បច្ចេកវិទ្យា' : 'Head of Security & Surveillance'}</span>
            </div>
            <div className="pt-6 border-b border-dashed border-slate-700" />
            <p className="text-[10px] text-slate-400 font-mono">{lang === 'km' ? '( ហត្ថលេខា & ត្រាអនុម័ត / Approval Seal & Signature )' : '( Approval Seal & Signature )'}</p>
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Modal for Screenshot Previews */}
      {lightboxData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xs">
          <div className="relative max-w-5xl w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>{lightboxData.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                      lightboxData.shift === 'day' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {lightboxData.shift === 'day' ? 'Day Live View' : 'Night Playback'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{lightboxData.subtitle}</p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={lightboxData.url}
                  download={`${lightboxData.dvrName}_${lightboxData.shift}_Screenshot.png`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  onClick={() => setLightboxData(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-black overflow-auto p-2 flex items-center justify-center min-h-[300px]">
              <img
                src={lightboxData.url}
                alt={lightboxData.title}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
