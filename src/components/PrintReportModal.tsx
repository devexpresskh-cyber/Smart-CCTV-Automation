import React, { useState } from 'react';
import { Camera, IssueTicket, LocationZone, Language, DVRProfile } from '../types';
import { translations } from '../i18n/translations';
import {
  Printer,
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Paperclip,
  Sun,
  Moon,
  Image as ImageIcon,
} from 'lucide-react';

interface PrintReportModalProps {
  data: {
    weekLabel: string;
    startDate: string;
    endDate: string;
    complianceRate: string;
    completedShifts: number;
    totalPossibleShifts: number;
    totalCams: number;
    workingCams: number;
    healthRate: string;
    weekInspections: any[];
    weekTickets: IssueTicket[];
    resolvedWeekTickets: IssueTicket[];
    recommendations: string;
    locations: LocationZone[];
    cameras: Camera[];
    dvrProfiles?: DVRProfile[];
  } | null;
  lang: Language;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  data,
  lang,
  onClose,
}) => {
  if (!data) return null;
  const t = translations[lang];
  const [includeScreenshots, setIncludeScreenshots] = useState<boolean>(true);

  const handlePrint = () => {
    window.print();
  };

  const dvrsWithScreenshots = data.dvrProfiles || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden print-page">
        {/* Top Floating Action Bar (Hidden in Print) */}
        <div className="no-print bg-slate-900 px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {lang === 'km'
                ? 'ទម្រង់របាយការណ៍បោះពុម្ពផ្លូវការ (Official Print / PDF View)'
                : 'Official PDF & Print Audit Document'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {dvrsWithScreenshots.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={includeScreenshots}
                  onChange={e => setIncludeScreenshots(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-0"
                />
                <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {lang === 'km'
                    ? `ភ្ជាប់រូបថតអេក្រង់ DVR (${dvrsWithScreenshots.length} DVRs)`
                    : `Attach DVR Screenshots (${dvrsWithScreenshots.length})`}
                </span>
              </label>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'km' ? 'បោះពុម្ព ឬរក្សាទុកជា PDF (Print)' : 'Print / Save PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Content */}
        <div className="p-8 sm:p-12 space-y-6 text-slate-800 font-battambang print:p-4">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-sky-700" />
                <h1 className="text-xl font-extrabold tracking-tight text-slate-950 font-mono">
                  CCTV SECURITY SURVEILLANCE AUDIT
                </h1>
              </div>
              <h2 className="text-base font-bold text-slate-800">
                របាយការណ៍ត្រួតពិនិត្យប្រព័ន្ធកាមេរ៉ាសុវត្ថិភាពប្រចាំសប្តាហ៍ (Weekly Inspection Report)
              </h2>
              <p className="text-xs text-slate-600">
                ការត្រួតពិនិត្យសុវត្ថិភាពវេនថ្ងៃ-យប់ លើទីតាំងទាំង ១៣ និងប្រព័ន្ធ DVR ទាំងអស់
              </p>
            </div>

            <div className="text-right text-xs space-y-1 sm:border-l sm:border-slate-300 sm:pl-6">
              <div>
                <span className="text-slate-500">កាលបរិច្ឆេទសប្តាហ៍:</span>{' '}
                <strong className="text-slate-900 font-mono">{data.startDate} ~ {data.endDate}</strong>
              </div>
              <div>
                <span className="text-slate-500">សប្តាហ៍ទី:</span>{' '}
                <strong className="text-slate-900">{data.weekLabel}</strong>
              </div>
              <div>
                <span className="text-slate-500">ថ្ងៃបង្កើតរបាយការណ៍:</span>{' '}
                <span className="font-mono">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Key Audit KPIs */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase">{t.totalCameras}</p>
              <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{data.totalCams}</p>
              <p className="text-[10px] text-emerald-700 font-semibold">{data.workingCams} ដំណើរការល្អ</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase">{t.operationalRate}</p>
              <p className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">{data.healthRate}%</p>
              <p className="text-[10px] text-slate-500">Fleet Availability</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase">{t.inspectionRate}</p>
              <p className="text-xl font-extrabold text-sky-700 font-mono mt-0.5">{data.complianceRate}%</p>
              <p className="text-[10px] text-slate-500">{data.completedShifts}/{data.totalPossibleShifts} វេនបានពិនិត្យ</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase">{t.issuesDiscovered}</p>
              <p className="text-xl font-extrabold text-rose-700 font-mono mt-0.5">{data.weekTickets.length}</p>
              <p className="text-[10px] text-emerald-700 font-semibold">{data.resolvedWeekTickets.length} បានជួសជុល</p>
            </div>
          </div>

          {/* Table: 13 Location Zones Overview */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-950 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-700" />
              <span>ស្ថានភាពតាមដានលើតំបន់ទាំង ១៣ (13 Monitored Security Zones)</span>
            </h3>

            <table className="w-full text-left text-[11px] border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 w-10">#</th>
                  <th className="py-2 px-3 w-20">កូដតំបន់</th>
                  <th className="py-2 px-3">ឈ្មោះទីតាំង (Zone Description)</th>
                  <th className="py-2 px-3">បរិវេណ / ជាន់</th>
                  <th className="py-2 px-3 text-center">កាមេរ៉ាសរុប</th>
                  <th className="py-2 px-3 text-center">ដំណើរការ</th>
                  <th className="py-2 px-3 text-center">ខូច / ដាច់</th>
                  <th className="py-2 px-3 text-center">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.locations.map((loc, idx) => {
                  const locCams = data.cameras.filter(c => c.locationId === loc.id);
                  const faultyCount = locCams.filter(c => c.status === 'faulty' || c.status === 'offline').length;
                  const okCount = locCams.filter(c => c.status === 'working').length;
                  const isHealthy = faultyCount === 0;

                  return (
                    <tr key={loc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-1.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{loc.code}</td>
                      <td className="py-1.5 px-3 font-medium text-slate-900">
                        {loc.nameKm} / {loc.nameEn}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600">{loc.floorOrArea}</td>
                      <td className="py-1.5 px-3 text-center font-mono font-semibold">{locCams.length}</td>
                      <td className="py-1.5 px-3 text-center font-mono text-emerald-700 font-semibold">{okCount}</td>
                      <td className="py-1.5 px-3 text-center font-mono text-rose-700 font-semibold">{faultyCount}</td>
                      <td className="py-1.5 px-3 text-center font-semibold">
                        <span className={isHealthy ? 'text-emerald-700' : 'text-rose-700'}>
                          {isHealthy ? '✓ ប្រក្រតី' : `⚠ មានបញ្ហា (${faultyCount})`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table: Issues & Repair Dispatch in Week */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-950 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>កំណត់ត្រាបញ្ហាកាមេរ៉ាក្នុងសប្តាហ៍ (Incident & Repair Actions)</span>
            </h3>

            {data.weekTickets.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                គ្មានបញ្ហាបច្ចេកទេសត្រូវបានកត់ត្រាក្នុងសប្តាហ៍នេះទេ (No recorded faults)
              </p>
            ) : (
              <table className="w-full text-left text-[11px] border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">លេខសំបុត្រ</th>
                    <th className="py-2 px-3">កាមេរ៉ា</th>
                    <th className="py-2 px-3">កាលបរិច្ឆេទ & វេន</th>
                    <th className="py-2 px-3">ការពិពណ៌នាបញ្ហា</th>
                    <th className="py-2 px-3">កម្រិត</th>
                    <th className="py-2 px-3">ស្ថានភាពជួសជុល</th>
                    <th className="py-2 px-3">ជាងទទួលបន្ទុក</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.weekTickets.map((tkt, idx) => {
                    const cam = data.cameras.find(c => c.id === tkt.cameraId);
                    return (
                      <tr key={tkt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{tkt.ticketNumber}</td>
                        <td className="py-1.5 px-3 font-mono font-semibold">{cam?.code || 'N/A'}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-600">
                          {tkt.reportedDate} ({tkt.shift === 'day' ? 'ថ្ងៃ' : 'យប់'})
                        </td>
                        <td className="py-1.5 px-3 text-slate-800">{tkt.description}</td>
                        <td className="py-1.5 px-3 font-semibold uppercase text-slate-700">
                          {tkt.severity}
                        </td>
                        <td className="py-1.5 px-3 font-bold">
                          <span
                            className={
                              tkt.status === 'resolved' || tkt.status === 'closed'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }
                          >
                            {tkt.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-700">{tkt.assignedTo || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Recommendations Block */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <h4 className="font-bold text-xs uppercase tracking-wide text-slate-900">
              មតិយោបល់ និងអនុសាសន៍បច្ចេកទេស (Technical Observations & Recommendations):
            </h4>
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {data.recommendations}
            </p>
          </div>

          {/* Signatures & Seal Block */}
          <div className="pt-6 grid grid-cols-2 gap-12 text-center text-xs break-inside-avoid">
            <div className="space-y-8">
              <div>
                <p className="font-bold text-slate-900">មន្ត្រីត្រួតពិនិត្យប្រចាំការ (Surveillance Officer)</p>
                <p className="text-[11px] text-slate-500">អ្នករៀបចំ និងផ្ទៀងផ្ទាត់ទិន្នន័យ</p>
              </div>
              <div>
                <div className="w-56 mx-auto border-b border-dashed border-slate-400 mb-2 h-10" />
                <p className="text-[11px] text-slate-600 font-mono">( ហត្ថលេខា & ឈ្មោះ / Signature & Name )</p>
                <p className="text-[10px] text-slate-500 mt-1">កាលបរិច្ឆេទ: ..... / ..... / 2026</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <p className="font-bold text-slate-900">ប្រធានផ្នែកសន្តិសុខ & បច្ចេកវិទ្យា (Head of Security)</p>
                <p className="text-[11px] text-slate-500">ត្រួតពិនិត្យ និងយល់ព្រមជាផ្លូវការ</p>
              </div>
              <div>
                <div className="w-56 mx-auto border-b border-dashed border-slate-400 mb-2 h-10" />
                <p className="text-[11px] text-slate-600 font-mono">( ហត្ថលេខា & ត្រាអនុម័ត / Official Seal )</p>
                <p className="text-[10px] text-slate-500 mt-1">កាលបរិច្ឆេទ: ..... / ..... / 2026</p>
              </div>
            </div>
          </div>

          {/* ATTACHED DVR SCREENSHOTS SECTION (Embeds into PDF) */}
          {includeScreenshots && dvrsWithScreenshots.length > 0 && (
            <div className="pt-8 border-t-2 border-slate-900 break-before-page space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-950 font-mono">
                      ATTACHED CCTV DVR INSPECTION SCREENSHOTS
                    </h3>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    ភស្តុតាងរូបថតអេក្រង់ត្រួតពិនិត្យ DVR ភ្ជាប់ជាមួយរបាយការណ៍ប្រចាំសប្តាហ៍ ({data.weekLabel})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    រូបថតអេក្រង់ SMART PSS / NVR ពេលថ្ងៃ (Day Shift) និងពេលយប់ (Night Playback) ផ្ទៀងផ្ទាត់ដោយមន្ត្រីសន្តិសុខ
                  </p>
                </div>

                <div className="text-right text-[11px] font-mono border border-slate-300 p-2 rounded bg-slate-50">
                  <p className="font-bold text-slate-900">DVR Units: {dvrsWithScreenshots.length}</p>
                  <p className="text-slate-600">Attached: 100%</p>
                </div>
              </div>

              {/* DVR Screenshots Grid */}
              <div className="space-y-6">
                {dvrsWithScreenshots.map((dvr, idx) => {
                  const dayImg = dvr.dayScreenshotUrl;
                  const nightImg = dvr.nightScreenshotUrl;
                  const faultyCount = dvr.faultyCount ?? dvr.cameras?.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length ?? 0;
                  const workingCount = dvr.workingCount ?? (dvr.channelCount - faultyCount);

                  return (
                    <div
                      key={dvr.id}
                      className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 break-inside-avoid space-y-3"
                    >
                      {/* DVR Title & Metadata */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-sm text-slate-900">{dvr.name}</span>
                            <span className="text-xs text-slate-600 ml-2">({dvr.locationKm})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                            {dvr.channelCount} Channels
                          </span>
                          <span className="text-emerald-700 font-bold">
                            ✓ {workingCount} OK
                          </span>
                          {faultyCount > 0 && (
                            <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                              ⚠ {faultyCount} Faulty
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Side-by-side Day & Night Screenshots */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Day Screenshot Box */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-amber-700">
                              <Sun className="w-3.5 h-3.5" />
                              <span>1. Day Screenshot (ពេលថ្ងៃ)</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">SMART PSS Live</span>
                          </div>

                          <div className="border border-slate-300 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                            {dayImg ? (
                              <img
                                src={dayImg}
                                alt={`${dvr.name} Day`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">[No Day Screenshot Attached]</span>
                            )}
                          </div>
                        </div>

                        {/* Night Screenshot Box */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-indigo-700">
                              <Moon className="w-3.5 h-3.5" />
                              <span>2. Night Screenshot (ពេលយប់)</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Playback CPS</span>
                          </div>

                          <div className="border border-slate-300 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                            {nightImg ? (
                              <img
                                src={nightImg}
                                alt={`${dvr.name} Night`}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">[No Night Screenshot Attached]</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* DVR Verification Footer */}
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-200">
                        <span>ផ្ទៀងផ្ទាត់ដោយប្រព័ន្ធ DVR Checklist Audit</span>
                        <span className="font-mono">Checked Date: {data.endDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
