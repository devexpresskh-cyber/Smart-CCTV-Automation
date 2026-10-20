import React, { useState } from 'react';
import { Camera, DVRProfile, Language, LocationZone } from '../types';
import {
  CameraHealthAlert,
  DVRHealthAlert,
  formatOverdueTime,
} from '../utils/healthAlerts';
import {
  AlertTriangle,
  X,
  Camera as CameraIcon,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  Check,
  RefreshCw,
} from 'lucide-react';

interface HealthAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  cameraAlerts: CameraHealthAlert[];
  dvrAlerts: DVRHealthAlert[];
  locations: LocationZone[];
  onMarkCameraInspected: (cameraId: string) => void;
  onMarkAllCamerasInspected: () => void;
  onNavigateToInspection: () => void;
  onNavigateToDvr: (dvrId: string) => void;
}

export const HealthAlertModal: React.FC<HealthAlertModalProps> = ({
  isOpen,
  onClose,
  lang,
  cameraAlerts,
  dvrAlerts,
  locations,
  onMarkCameraInspected,
  onMarkAllCamerasInspected,
  onNavigateToInspection,
  onNavigateToDvr,
}) => {
  const [activeTab, setActiveTab] = useState<'cameras' | 'dvrs'>('cameras');
  const isKm = lang === 'km';

  if (!isOpen) return null;

  const getLocationName = (locId: string) => {
    const loc = locations.find(l => l.id === locId);
    if (!loc) return locId;
    return isKm ? loc.nameKm : loc.nameEn;
  };

  const totalAlerts = cameraAlerts.length + dvrAlerts.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isKm ? 'ប្រព័ន្ធតាមដានសុខភាព & ការជូនដំណឹង' : 'Camera & DVR Health Alert Monitor'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white">
                  {totalAlerts} {isKm ? 'ការជូនដំណឹង' : 'Active Alerts'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKm
                  ? 'តាមដានស្វ័យប្រវត្តិនូវកាមេរ៉ាដែលមិនទាន់ត្រួតពិនិត្យលើសពី ៧២ ម៉ោង និងបញ្ហាផ្នែករឹង DVR'
                  : 'Automated 72-hour inspection monitoring & real-time DVR hardware diagnostics'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('cameras')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'cameras'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <CameraIcon className="w-4 h-4" />
              <span>{isKm ? 'កាមេរ៉ាហួស ៧២ ម៉ោង' : 'Cameras Overdue (>72h)'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'cameras' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {cameraAlerts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dvrs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'dvrs'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>{isKm ? 'សុខភាព & បញ្ហា DVR' : 'DVR Fleet Health & Alerts'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'dvrs' ? 'bg-white text-rose-700' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {dvrAlerts.length}
              </span>
            </button>
          </div>

          {activeTab === 'cameras' && cameraAlerts.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllCamerasInspected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                title="Mark all overdue cameras as inspected right now"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isKm ? 'សម្គាល់ទាំងអស់បានត្រួតពិនិត្យ (Clear All)' : 'Mark All Inspected'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onNavigateToInspection();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <span>{isKm ? 'ចុះត្រួតពិនិត្យពេញលេញ' : 'Go to Inspection'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'cameras' && (
            <>
              {cameraAlerts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    {isKm ? 'កាមេរ៉ាទាំងអស់ស្ថិតក្នុងស្ថានភាពល្អ!' : 'All Cameras Checked Within 72 Hours!'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isKm
                      ? 'គ្មានកាមេរ៉ាណាមួយដែលខកខានការត្រួតពិនិត្យលើសពី ៧២ ម៉ោងនោះទេ។ ប្រព័ន្ធសុវត្ថិភាពត្រូវបានថែទាំយ៉ាងទៀងទាត់។'
                      : 'Every security camera has been verified within the required 72-hour audit cycle.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                    <span>
                      {isKm
                        ? `រកឃើញកាមេរ៉ាចំនួន ${cameraAlerts.length} គ្រឿងមិនទាន់ត្រួតពិនិត្យលើសពី ៧២ ម៉ោង:`
                        : `Found ${cameraAlerts.length} camera(s) uninspected for over 72 hours:`}
                    </span>
                    <span className="text-amber-400 font-mono text-[11px]">Threshold: 72 Hours (3 Days)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cameraAlerts.map(({ camera, overdueHours, isNeverChecked }) => (
                      <div
                        key={camera.id}
                        className="bg-slate-950/70 border border-amber-500/30 hover:border-amber-500/60 rounded-xl p-3.5 transition space-y-2.5 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-extrabold bg-amber-500 text-slate-950">
                              {camera.code}
                            </span>
                            <div>
                              <h5 className="font-bold text-xs sm:text-sm text-white">
                                {isKm ? camera.nameKm : camera.nameEn}
                              </h5>
                              <p className="text-[11px] text-slate-400">
                                {getLocationName(camera.locationId)}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              camera.status === 'working'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : camera.status === 'faulty'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {camera.status}
                          </span>
                        </div>

                        {/* Overdue alert badge */}
                        <div className="bg-amber-950/50 border border-amber-500/40 rounded-lg p-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {formatOverdueTime(overdueHours, isKm)}
                            </span>
                          </div>

                          <button
                            onClick={() => onMarkCameraInspected(camera.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition shadow-xs"
                            title="Mark as inspected now"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isKm ? 'សម្គាល់បានត្រួតពិនិត្យ' : 'Mark Inspected'}</span>
                          </button>
                        </div>

                        {camera.notes && (
                          <p className="text-[11px] text-rose-300/90 bg-rose-950/30 p-1.5 rounded border border-rose-900/50">
                            ⚠ {camera.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'dvrs' && (
            <>
              {dvrAlerts.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    {isKm ? 'ម៉ាស៊ីន DVR ទាំងអស់ដំណើរការធម្មតា ១០០%!' : 'All DVR Recorders Fully Operational!'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isKm
                      ? 'Hard Disk, រយៈពេលថត (Retention), ម៉ោងកាលបរិច្ឆេទ និងការចាក់វីដេអូឡើងវិញដំណើរការល្អគ្មានកំហុស។'
                      : 'Storage retention, hard drives, NTP clocks, and video playback are all functioning properly.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 pb-1">
                    {isKm
                      ? `រកឃើញការជូនដំណឹងសុខភាពផ្នែករឹង DVR ចំនួន ${dvrAlerts.length}:`
                      : `Found ${dvrAlerts.length} DVR hardware/operational alert(s):`}
                  </div>

                  <div className="space-y-2.5">
                    {dvrAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-3.5 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          alert.severity === 'critical'
                            ? 'bg-rose-950/60 border-rose-600/70'
                            : 'bg-amber-950/50 border-amber-600/60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                alert.severity === 'critical'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="font-bold text-xs text-white">
                              {alert.dvrName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({alert.locationKm})
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-slate-200">
                            {alert.title}
                          </h5>
                          <p className="text-[11px] text-slate-300">
                            {alert.detail}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToDvr(alert.dvrId);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold shrink-0 transition"
                        >
                          <span>{isKm ? 'មើលក្នុង Smart Scanner' : 'Jump to DVR'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isKm ? 'ការត្រួតពិនិត្យដំណើរការជាប្រចាំ (Automated Continuous Audit)' : 'Continuous Health Engine Active'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
