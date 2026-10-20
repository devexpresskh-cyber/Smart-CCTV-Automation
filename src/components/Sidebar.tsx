import React, { useState, useEffect } from 'react';
import { Language, ShiftType } from '../types';
import { translations } from '../i18n/translations';
import {
  Video,
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  FileSpreadsheet,
  AlertOctagon,
  RotateCcw,
  Sun,
  Moon,
  Clock,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Camera,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'inspection' | 'smart-scanner' | 'locations' | 'weekly-report' | 'problems';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onResetData: () => void;
  openTicketsCount: number;
  cameraOverdueCount?: number;
  dvrHealthAlertsCount?: number;
  onOpenHealthModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  lang,
  onLanguageChange,
  onResetData,
  openTicketsCount,
  cameraOverdueCount = 0,
  dvrHealthAlertsCount = 0,
  onOpenHealthModal,
}) => {
  const t = translations[lang];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  const currentShift: ShiftType = hours >= 6 && hours < 18 ? 'day' : 'night';

  const totalHealthAlerts = cameraOverdueCount + dvrHealthAlertsCount;

  const navItems = [
    { id: 'dashboard' as NavTab, label: t.navDashboard, icon: LayoutDashboard },
    {
      id: 'smart-scanner' as NavTab,
      label: t.navSmartScanner,
      icon: Camera,
      isNew: true,
      badge: dvrHealthAlertsCount > 0 ? dvrHealthAlertsCount : undefined,
      badgeClass: 'bg-rose-600 text-white',
      badgeTitle: `${dvrHealthAlertsCount} DVR Health Issues`,
    },
    {
      id: 'inspection' as NavTab,
      label: t.navInspection,
      icon: ClipboardCheck,
      badge: cameraOverdueCount > 0 ? cameraOverdueCount : undefined,
      badgeClass: 'bg-amber-500 text-slate-950 font-extrabold',
      badgeTitle: `${cameraOverdueCount} Overdue Cameras (>72h)`,
    },
    { id: 'locations' as NavTab, label: t.navLocations, icon: Building2 },
    { id: 'weekly-report' as NavTab, label: t.navWeeklyReport, icon: FileSpreadsheet },
    {
      id: 'problems' as NavTab,
      label: t.navProblems,
      icon: AlertOctagon,
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
      badgeClass: 'bg-rose-500 text-white',
    },
  ];

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) {
      onResetData();
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4">
      {/* Top Brand & Shift Indicator */}
      <div className="space-y-4">
        {/* Brand */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative p-2.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl shadow-lg shadow-sky-900/30 flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-base text-white font-mono truncate">
                    CCTV SENTINEL
                  </span>
                </div>
                <p className="text-[11px] text-sky-400 font-medium truncate">
                  {lang === 'km' ? 'ប្រព័ន្ធត្រួតពិនិត្យ ១៣ តំបន់' : '13 Zones Enterprise'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Shift & Clock Card */}
        {!isCollapsed ? (
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                  currentShift === 'day'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {currentShift === 'day' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>{currentShift === 'day' ? t.shiftDayOnly : t.shiftNightOnly}</span>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>24/7 Live</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1 border-t border-slate-850">
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-[11px]">{t.currentShift}</span>
              </span>
              <span className="font-semibold text-white">
                {currentTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`mx-auto p-2 rounded-xl flex items-center justify-center ${
              currentShift === 'day' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
            }`}
            title={currentShift === 'day' ? t.dayShift : t.nightShift}
          >
            {currentShift === 'day' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
        )}

        {/* Camera & DVR Health Alert Notification Card in Sidebar */}
        {totalHealthAlerts > 0 && (
          !isCollapsed ? (
            <div
              onClick={onOpenHealthModal}
              className="cursor-pointer bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-rose-500/50 hover:border-rose-400 p-3 rounded-2xl shadow-lg shadow-rose-950/40 transition group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce shrink-0" />
                  <span>{lang === 'km' ? 'ការជូនដំណឹងសុខភាព' : 'Health Alerts'}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                  {totalHealthAlerts}
                </span>
              </div>
              <div className="text-[11px] space-y-1">
                {cameraOverdueCount > 0 && (
                  <div className="flex items-center justify-between text-amber-300 font-medium">
                    <span>📷 {lang === 'km' ? 'កាមេរ៉ាហួស ៧២ ម៉ោង:' : 'Overdue (>72h):'}</span>
                    <span className="font-bold font-mono bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                      {cameraOverdueCount}
                    </span>
                  </div>
                )}
                {dvrHealthAlertsCount > 0 && (
                  <div className="flex items-center justify-between text-rose-300 font-medium">
                    <span>🛡️ {lang === 'km' ? 'DVR មានបញ្ហា:' : 'DVR Issues:'}</span>
                    <span className="font-bold font-mono bg-rose-500/20 px-1.5 py-0.2 rounded border border-rose-500/30">
                      {dvrHealthAlertsCount}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 pt-1.5 border-t border-rose-800/40 flex items-center justify-between text-[10px] text-rose-400 group-hover:text-rose-200 font-semibold">
                <span>{lang === 'km' ? 'ចុចមើលព័ត៌មានលម្អិត' : 'View Diagnostic Report'}</span>
                <span>→</span>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenHealthModal}
              className="mx-auto p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-300 hover:bg-rose-900/90 flex items-center justify-center relative transition group"
              title={`Health Alerts: ${totalHealthAlerts} active alerts (${cameraOverdueCount} cams > 72h, ${dvrHealthAlertsCount} DVR issues)`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                {totalHealthAlerts}
              </span>
            </button>
          )
        )}

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-700/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.isNew && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md font-extrabold bg-amber-400 text-slate-950 shadow-xs">
                        AI
                      </span>
                    )}
                    {item.badge !== undefined && (
                      <span
                        title={item.badgeTitle}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-white text-sky-700'
                            : item.badgeClass || 'bg-rose-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Language Switcher, Reset Data, and Status */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        {/* Language switch */}
        {!isCollapsed ? (
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              {lang === 'km' ? 'ភាសា / Language' : 'Language'}
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onLanguageChange('km')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  lang === 'km'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm">🇰🇭</span>
                <span>ខ្មែរ</span>
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  lang === 'en'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm">🇬🇧</span>
                <span>English</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onLanguageChange(lang === 'km' ? 'en' : 'km')}
            className="w-full py-2 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center"
            title="Switch Language"
          >
            {lang === 'km' ? '🇰🇭' : '🇬🇧'}
          </button>
        )}

        {/* Reset Demo Data Button */}
        {!isCollapsed ? (
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl transition"
            title={t.resetDemoData}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetDemoData}</span>
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="w-full p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl flex items-center justify-center"
            title={t.resetDemoData}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* System Uptime Badge */}
        {!isCollapsed && (
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 flex items-center gap-2 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">CCTV Sentinel v2.4 (Enterprise)</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="no-print lg:hidden sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800 rounded-xl"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-lg">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm font-mono tracking-tight">
              CCTV SENTINEL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalHealthAlerts > 0 && (
            <button
              onClick={onOpenHealthModal}
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-rose-600 text-white animate-pulse"
              title={`${totalHealthAlerts} health alerts`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{totalHealthAlerts}</span>
            </button>
          )}

          {/* Shift indicator */}
          <div
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
              currentShift === 'day'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {currentShift === 'day' ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-400" />}
            <span>{currentShift === 'day' ? t.shiftDayOnly : t.shiftNightOnly}</span>
          </div>

          {/* Quick Lang Switch */}
          <button
            onClick={() => onLanguageChange(lang === 'km' ? 'en' : 'km')}
            className="px-2 py-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold"
          >
            {lang === 'km' ? 'EN 🇬🇧' : 'ខ្មែរ 🇰🇭'}
          </button>
        </div>
      </div>

      {/* Mobile Slide-over Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="no-print lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 max-w-[85%] bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop Persistent Left Sidebar */}
      <aside
        className={`no-print hidden lg:flex flex-col sticky top-0 h-screen bg-slate-900/95 border-r border-slate-800 transition-all duration-300 z-30 shrink-0 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
};
