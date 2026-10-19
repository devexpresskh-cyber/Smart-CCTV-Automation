import React from 'react';
import { Camera, InspectionRecord, IssueTicket, LocationZone, Language } from '../types';
import { translations } from '../i18n/translations';
import {
  ShieldCheck,
  Video,
  AlertTriangle,
  WifiOff,
  Clock,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Building,
  Eye,
  PlusCircle,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  locations: LocationZone[];
  cameras: Camera[];
  inspections: InspectionRecord[];
  tickets: IssueTicket[];
  lang: Language;
  onNavigateToInspection: (shift?: 'day' | 'night') => void;
  onNavigateToLocations: (locId?: string) => void;
  onNavigateToProblems: () => void;
  onNavigateToWeeklyReport: () => void;
  onNavigateToSmartScanner?: () => void;
  onOpenReportIssueModal: () => void;
  onPreviewCamera: (camera: Camera) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  locations,
  cameras,
  inspections,
  tickets,
  lang,
  onNavigateToInspection,
  onNavigateToLocations,
  onNavigateToProblems,
  onNavigateToWeeklyReport,
  onNavigateToSmartScanner,
  onOpenReportIssueModal,
  onPreviewCamera,
}) => {
  const t = translations[lang];

  // Calculations
  const totalCameras = cameras.length;
  const workingCameras = cameras.filter(c => c.status === 'working').length;
  const faultyCameras = cameras.filter(c => c.status === 'faulty').length;
  const offlineCameras = cameras.filter(c => c.status === 'offline').length;
  const healthRate = totalCameras > 0 ? ((workingCameras / totalCameras) * 100).toFixed(1) : '100';

  // Today inspections
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDayInsp = inspections.find(i => i.date === todayStr && i.shift === 'day');
  const todayNightInsp = inspections.find(i => i.date === todayStr && i.shift === 'night');

  // Open tickets
  const openTickets = tickets.filter(tkt => tkt.status !== 'closed' && tkt.status !== 'resolved');
  const criticalTickets = openTickets.filter(tkt => tkt.severity === 'critical');

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Shift Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.systemStatus}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t.appTitle}
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl">
              {lang === 'km'
                ? 'តាមដានសុវត្ថិភាព ២៤/៧ លើតំបន់ទាំង ១៣ ត្រួតពិនិត្យវេនថ្ងៃ-វេនយប់ និងតាមដានកាមេរ៉ាដែលខូចឱ្យបានទាន់ពេលវេលា។'
                : '24/7 Security surveillance oversight across 13 facility zones. Record shift inspections and coordinate rapid maintenance dispatch.'}
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {onNavigateToSmartScanner && (
              <button
                onClick={onNavigateToSmartScanner}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{lang === 'km' ? '📸 ស្កេន Screenshot (F-IT-002)' : '📸 Scan Screenshot (F-IT-002)'}</span>
              </button>
            )}
            <button
              onClick={() => onNavigateToInspection('day')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sun className="w-4 h-4 text-slate-950" />
              <span>{t.startDayInspection}</span>
            </button>
            <button
              onClick={() => onNavigateToInspection('night')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Moon className="w-4 h-4 text-indigo-200" />
              <span>{t.startNightInspection}</span>
            </button>
            <button
              onClick={onOpenReportIssueModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <PlusCircle className="w-4 h-4 text-rose-400" />
              <span>{t.reportNewIssue}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Security Alert Banner if any */}
      {criticalTickets.length > 0 && (
        <div className="bg-rose-950/40 border-l-4 border-rose-500 p-4 rounded-xl text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{t.criticalAlerts}</span>
                <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-mono">
                  {criticalTickets.length}
                </span>
              </h4>
              <p className="text-xs text-rose-300 mt-0.5">
                {lang === 'km'
                  ? `កាមេរ៉ាសំខាន់ៗចំនួន ${criticalTickets.length} កំពុងដាច់សញ្ញា ឬមានបញ្ហាធ្ងន់ធ្ងរ ត្រូវការអន្តរាគមន៍ជាបន្ទាន់!`
                  : `${criticalTickets.length} critical surveillance cameras currently offline or broken requiring immediate technician attention.`}
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToProblems}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shrink-0 transition"
          >
            <span>{t.viewDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cameras & Uptime */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.totalCameras}</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalCameras}</span>
            <span className="text-xs text-slate-400">
              {lang === 'km' ? 'កាមេរ៉ា' : 'units'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {workingCameras} {t.workingCameras}
            </span>
            <span className="font-mono text-slate-400 text-[11px]">{healthRate}% {t.operationalRate}</span>
          </div>
        </div>

        {/* Faulty & Offline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.faultyCameras}</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {faultyCameras + offlineCameras}
            </span>
            <span className="text-xs text-slate-400">
              {lang === 'km' ? 'គ្រឿងមានបញ្ហា' : 'faulty'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
            <span className="text-amber-400 font-medium">
              {faultyCameras} {lang === 'km' ? 'រូបភាពមិនប្រក្រតី' : 'degraded'}
            </span>
            <span className="text-rose-400 font-medium flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              {offlineCameras} {lang === 'km' ? 'ដាច់សញ្ញា' : 'offline'}
            </span>
          </div>
        </div>

        {/* Today's Shift Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.todayInspection}</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.dayShiftStatus}</span>
              </span>
              {todayDayInsp ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.checked}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {t.pending}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.nightShiftStatus}</span>
              </span>
              {todayNightInsp ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.checked}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-[11px] bg-slate-800 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {t.pending}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            {todayDayInsp ? todayDayInsp.inspectorName : (lang === 'km' ? 'រង់ចាំការកត់ត្រា' : 'Awaiting log')}
          </div>
        </div>

        {/* Open Problem Tickets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.openTickets}</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{openTickets.length}</span>
            <span className="text-xs text-slate-400">
              {lang === 'km' ? 'សំបុត្រកំពុងដោះស្រាយ' : 'tickets'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-slate-800">
            <span className="text-slate-400 text-[11px]">
              {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length} {t.resolvedTickets}
            </span>
            <button
              onClick={onNavigateToProblems}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 text-xs"
            >
              <span>{lang === 'km' ? 'គ្រប់គ្រង' : 'Manage'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 13 Locations Status Overview Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-400" />
              <span>{t.locationHealthSummary}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'km'
                ? 'តាមដានស្ថានភាពកាមេរ៉ាតាមតំបន់ជាក់ស្តែងទាំង ១៣ ក្នុងបរិវេណស្ថាប័ន'
                : 'Live status and camera health across all 13 mapped facility zones'}
            </p>
          </div>
          <button
            onClick={() => onNavigateToLocations()}
            className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            <span>{lang === 'km' ? 'មើលទីតាំងទាំងអស់' : 'View All Zones'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations.map(loc => {
            const locCameras = cameras.filter(c => c.locationId === loc.id);
            const faultyCount = locCameras.filter(c => c.status === 'faulty' || c.status === 'offline').length;
            const isHealthy = faultyCount === 0;

            return (
              <div
                key={loc.id}
                onClick={() => onNavigateToLocations(loc.id)}
                className="group cursor-pointer bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 transition-all duration-200 hover:shadow-xl hover:shadow-sky-950/40 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                      {loc.code}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isHealthy
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isHealthy ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'
                        }`}
                      />
                      {isHealthy ? (lang === 'km' ? 'ល្អ' : 'Normal') : `${faultyCount} ${lang === 'km' ? 'បញ្ហា' : 'Fault'}`}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition line-clamp-1">
                    {lang === 'km' ? loc.nameKm : loc.nameEn}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {lang === 'km' ? loc.descriptionKm : loc.descriptionEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                    <Video className="w-3.5 h-3.5 text-slate-500" />
                    <span>{locCameras.length} {lang === 'km' ? 'កាមេរ៉ា' : 'cams'}</span>
                  </div>
                  <span className="text-[11px] text-sky-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>{lang === 'km' ? 'ពិនិត្យ' : 'Inspect'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column: Recent Inspection Log & Open Faults */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inspection Logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>{t.recentActivity}</span>
            </h3>
            <button
              onClick={() => onNavigateToInspection()}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              {lang === 'km' ? 'មើលទាំងអស់' : 'View Log'}
            </button>
          </div>

          <div className="space-y-3">
            {inspections.slice(0, 4).map(insp => {
              const isDay = insp.shift === 'day';
              return (
                <div
                  key={insp.id}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isDay
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isDay ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {insp.date} • {isDay ? t.shiftDayOnly : t.shiftNightOnly}
                        </span>
                        {insp.issueCount > 0 ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-medium">
                            {insp.issueCount} {lang === 'km' ? 'បញ្ហា' : 'issues'}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-medium">
                            100% OK
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {insp.inspectorName} ({insp.inspectorRole})
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs text-slate-300 font-semibold">
                      {insp.normalCount}/{insp.totalCamerasChecked}
                    </span>
                    <p className="text-[10px] text-slate-500">{t.workingCameras}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Camera Issues & Quick Live Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{t.problemsTitle}</span>
            </h3>
            <button
              onClick={onNavigateToProblems}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              {lang === 'km' ? 'មើលសំបុត្រទាំងអស់' : 'View All'}
            </button>
          </div>

          <div className="space-y-3">
            {openTickets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60" />
                <p>{t.noAlerts}</p>
              </div>
            ) : (
              openTickets.slice(0, 4).map(tkt => {
                const cam = cameras.find(c => c.id === tkt.cameraId);
                const loc = locations.find(l => l.id === tkt.locationId);
                const isCritical = tkt.severity === 'critical';

                return (
                  <div
                    key={tkt.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {cam?.code || tkt.ticketNumber}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {tkt.severity}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {loc ? (lang === 'km' ? loc.nameKm : loc.nameEn) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-1">{tkt.description}</p>
                    </div>

                    {cam && (
                      <button
                        onClick={() => onPreviewCamera(cam)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg shrink-0 transition"
                        title={t.cameraPreview}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
