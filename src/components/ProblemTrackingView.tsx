import React, { useState } from 'react';
import {
  Camera,
  IssueTicket,
  LocationZone,
  Language,
  IssueResolutionStatus,
  IssueSeverity,
  IssueType,
  ShiftType,
} from '../types';
import { translations } from '../i18n/translations';
import { exportTicketsToExcel } from '../utils/exportUtils';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Filter,
  Search,
  Eye,
  FileSpreadsheet,
  Edit2,
  Wrench,
  DollarSign,
  User,
  X,
  Building2,
  Calendar,
  Trash2,
  RotateCw,
} from 'lucide-react';

interface ProblemTrackingViewProps {
  locations: LocationZone[];
  cameras: Camera[];
  tickets: IssueTicket[];
  lang: Language;
  onUpdateTickets: (tickets: IssueTicket[]) => void;
  onUpdateCameraStatus: (cameraId: string, status: 'working' | 'faulty' | 'offline') => void;
  onPreviewCamera: (camera: Camera) => void;
  onSyncFromChecklist?: () => void;
}

export const ProblemTrackingView: React.FC<ProblemTrackingViewProps> = ({
  locations,
  cameras,
  tickets,
  lang,
  onUpdateTickets,
  onUpdateCameraStatus,
  onPreviewCamera,
  onSyncFromChecklist,
}) => {
  const t = translations[lang];

  // Multi-select row state for delete
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [cameraCodeFilter, setCameraCodeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<IssueTicket | null>(null);

  // Form states
  const [selectedCameraId, setSelectedCameraId] = useState<string>(cameras[0]?.id || '');
  const [reportedDate, setReportedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<ShiftType>('day');
  const [reportedBy, setReportedBy] = useState<string>('');
  const [issueType, setIssueType] = useState<IssueType>('blur_lens');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [status, setStatus] = useState<IssueResolutionStatus>('reported');
  const [description, setDescription] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [repairCost, setRepairCost] = useState<number>(0);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Filtered tickets
  const filteredTickets = tickets.filter(tkt => {
    if (statusFilter !== 'all' && tkt.status !== statusFilter) return false;
    if (severityFilter !== 'all' && tkt.severity !== severityFilter) return false;
    if (locationFilter !== 'all') {
      const matchLoc = tkt.locationId === locationFilter;
      const locObj = locations.find(l => l.id === locationFilter);
      const matchByName = locObj && (tkt.locationId === locObj.nameEn || tkt.locationId === locObj.nameKm);
      if (!matchLoc && !matchByName) return false;
    }

    if (cameraCodeFilter !== 'all') {
      const targetCam = cameras.find(c => c.id === cameraCodeFilter);
      if (targetCam) {
        const camNum = parseInt(targetCam.code.replace(/[^0-9]/g, ''), 10);
        const matchId = tkt.cameraId === targetCam.id;
        const matchCode =
          tkt.cameraId === targetCam.code &&
          (tkt.locationId === targetCam.locationId ||
            tkt.description.includes(targetCam.nameEn) ||
            tkt.description.includes(targetCam.nameKm));
        const matchDesc =
          tkt.description.includes(targetCam.code) ||
          (camNum ? tkt.description.includes(`CAM ${camNum}`) && (tkt.description.includes(targetCam.nameEn) || tkt.description.includes(targetCam.nameKm)) : false);
        if (!matchId && !matchCode && !matchDesc) return false;
      } else {
        if (tkt.cameraId !== cameraCodeFilter && !tkt.description.includes(cameraCodeFilter)) {
          return false;
        }
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cam = cameras.find(
        c =>
          c.id === tkt.cameraId ||
          (c.code.toLowerCase() === tkt.cameraId.toLowerCase() && c.locationId === tkt.locationId) ||
          c.code.toLowerCase() === tkt.cameraId.toLowerCase() ||
          c.id.endsWith(`-${tkt.cameraId}`)
      );
      const loc = locations.find(l => l.id === tkt.locationId || l.nameEn === tkt.locationId || l.code === tkt.locationId);
      return (
        tkt.ticketNumber.toLowerCase().includes(q) ||
        (cam && cam.code.toLowerCase().includes(q)) ||
        (loc && (loc.nameKm.toLowerCase().includes(q) || loc.nameEn.toLowerCase().includes(q))) ||
        tkt.description.toLowerCase().includes(q) ||
        (tkt.assignedTo && tkt.assignedTo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Multi-select helpers
  const isAllFilteredSelected =
    filteredTickets.length > 0 &&
    filteredTickets.every(tkt => selectedTicketIds.includes(tkt.id));
  const isSomeFilteredSelected =
    filteredTickets.some(tkt => selectedTicketIds.includes(tkt.id)) && !isAllFilteredSelected;

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedTicketIds(prev => prev.filter(id => !filteredTickets.some(t => t.id === id)));
    } else {
      const merged = new Set([...selectedTicketIds, ...filteredTickets.map(t => t.id)]);
      setSelectedTicketIds(Array.from(merged));
    }
  };

  const handleToggleSelectRow = (ticketId: string) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleDeleteSelectedTickets = () => {
    if (selectedTicketIds.length === 0) return;
    const count = selectedTicketIds.length;
    const confirmMsg =
      lang === 'km'
        ? `តើអ្នកពិតជាចង់លុបសំបុត្របញ្ហាចំនួន ${count} ដែលបានជ្រើសរើសនេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`
        : `Are you sure you want to delete ${count} selected issue ticket(s)? This action cannot be undone.`;

    if (window.confirm(confirmMsg)) {
      const remaining = tickets.filter(t => !selectedTicketIds.includes(t.id));
      onUpdateTickets(remaining);
      setSelectedTicketIds([]);
    }
  };

  const handleClearAllTickets = () => {
    if (tickets.length === 0) return;
    const count = tickets.length;
    const confirmMsg =
      lang === 'km'
        ? `⚠️ តើអ្នកពិតជាចង់សម្អាតសំបុត្របញ្ហា និងការជួសជុលទាំងអស់ (${count} សំបុត្រ) មែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`
        : `⚠️ Are you sure you want to clear all ${count} fault tracking & maintenance tickets? This action cannot be undone.`;

    if (window.confirm(confirmMsg)) {
      onUpdateTickets([]);
      setSelectedTicketIds([]);
    }
  };

  const handleDeleteSingleTicket = (ticketId: string, ticketNumber: string) => {
    const confirmMsg =
      lang === 'km'
        ? `តើអ្នកពិតជាចង់លុបសំបុត្រ ${ticketNumber} នេះមែនទេ?`
        : `Are you sure you want to delete ticket ${ticketNumber}?`;

    if (window.confirm(confirmMsg)) {
      const remaining = tickets.filter(t => t.id !== ticketId);
      onUpdateTickets(remaining);
      setSelectedTicketIds(prev => prev.filter(id => id !== ticketId));
    }
  };

  const handleOpenTicketModal = (ticket?: IssueTicket) => {
    if (ticket) {
      setEditingTicket(ticket);
      // Synchronize cameraId to exact checklist camera ID
      const matchedCam = cameras.find(
        c =>
          c.id === ticket.cameraId ||
          (c.code.toLowerCase() === ticket.cameraId.toLowerCase() && c.locationId === ticket.locationId) ||
          c.code.toLowerCase() === ticket.cameraId.toLowerCase() ||
          c.id.endsWith(`-${ticket.cameraId}`)
      );
      setSelectedCameraId(matchedCam ? matchedCam.id : (ticket.cameraId || cameras[0]?.id || ''));
      setReportedDate(ticket.reportedDate);
      setShift(ticket.shift);
      setReportedBy(ticket.reportedBy);
      setIssueType(ticket.issueType);
      setSeverity(ticket.severity);
      setStatus(ticket.status);
      setDescription(ticket.description);
      setAssignedTo(ticket.assignedTo || '');
      setRepairCost(ticket.repairCost || 0);
      setResolutionNotes(ticket.resolutionNotes || '');
    } else {
      setEditingTicket(null);
      setSelectedCameraId(cameras[0]?.id || '');
      setReportedDate(new Date().toISOString().slice(0, 10));
      setShift('day');
      setReportedBy('');
      setIssueType('blur_lens');
      setSeverity('medium');
      setStatus('reported');
      setDescription('');
      setAssignedTo('');
      setRepairCost(0);
      setResolutionNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const cam =
      cameras.find(c => c.id === selectedCameraId) ||
      cameras.find(c => c.code === selectedCameraId);
    if (!cam) return;

    if (editingTicket) {
      const isNowResolved = status === 'resolved' || status === 'closed';
      const updated = tickets.map(tkt =>
        tkt.id === editingTicket.id
          ? {
              ...tkt,
              cameraId: selectedCameraId,
              locationId: cam.locationId,
              reportedDate,
              shift,
              reportedBy,
              issueType,
              severity,
              status,
              description,
              assignedTo,
              repairCost,
              resolutionNotes,
              resolvedDate: isNowResolved ? tkt.resolvedDate || new Date().toISOString().slice(0, 10) : undefined,
            }
          : tkt
      );
      onUpdateTickets(updated);

      // If resolved, restore camera status to working!
      if (isNowResolved) {
        onUpdateCameraStatus(selectedCameraId, 'working');
      } else if (severity === 'critical') {
        onUpdateCameraStatus(selectedCameraId, 'offline');
      } else {
        onUpdateCameraStatus(selectedCameraId, 'faulty');
      }
    } else {
      const newTkt: IssueTicket = {
        id: `tkt-${Date.now()}`,
        ticketNumber: `TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
        cameraId: selectedCameraId,
        locationId: cam.locationId,
        reportedDate,
        shift,
        reportedBy,
        issueType,
        severity,
        status,
        description,
        assignedTo,
        repairCost,
        resolutionNotes,
      };
      onUpdateTickets([newTkt, ...tickets]);

      if (severity === 'critical') {
        onUpdateCameraStatus(selectedCameraId, 'offline');
      } else {
        onUpdateCameraStatus(selectedCameraId, 'faulty');
      }
    }

    setIsModalOpen(false);
  };

  const getStatusBadge = (stat: IssueResolutionStatus) => {
    switch (stat) {
      case 'reported':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'in_progress':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/30';
      case 'waiting_parts':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'closed':
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/30';
    }
  };

  const getSeverityBadge = (sev: IssueSeverity) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'low':
        return 'bg-slate-700/50 text-slate-300 border border-slate-600/40';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span>{t.problemsTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {lang === 'km' ? 'បញ្ជីតាមដានកាមេរ៉ាមានបញ្ហា & ជួសជុល' : 'Fault Tracking & Maintenance Dispatch'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {lang === 'km'
              ? 'គ្រប់គ្រងដំណើរការជួសជុល ចាត់តាំងជាង និងការតាមដានគ្រឿងបន្លាស់'
              : 'End-to-end incident lifecycle: triage, technician dispatch, and resolution verification'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedTicketIds.length > 0 && (
            <button
              onClick={handleDeleteSelectedTickets}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-600/30 animate-pulse"
              title={lang === 'km' ? 'លុបសំបុត្រដែលបានជ្រើស' : 'Delete Selected Tickets'}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {lang === 'km'
                  ? `លុប (${selectedTicketIds.length})`
                  : `Delete (${selectedTicketIds.length})`}
              </span>
            </button>
          )}

          {tickets.length > 0 && (
            <button
              onClick={handleClearAllTickets}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition shadow-xs"
              title={lang === 'km' ? 'សម្អាតសំបុត្របញ្ហាទាំងអស់' : 'Clear All Fault Tracking & Dispatch Tickets'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'km' ? 'សម្អាតទាំងអស់' : 'Clear All'}</span>
            </button>
          )}

          {onSyncFromChecklist && (
            <button
              onClick={onSyncFromChecklist}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-900/30"
              title={lang === 'km' ? 'Sync ការត្រួតពិនិត្យ និងបញ្ហាកាមេរ៉ាពី Checklist' : 'Sync CAMERA Inspection & Fault Tracking from Checklist'}
            >
              <RotateCw className="w-4 h-4" />
              <span>
                {lang === 'km' ? '🔄 Sync ពី Checklist' : '🔄 Sync from Checklist'}
              </span>
            </button>
          )}

          <button
            onClick={() => exportTicketsToExcel(tickets, cameras, locations, lang)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            onClick={() => handleOpenTicketModal()}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createIssueTicket}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Location Filter */}
        <div>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">{t.allLocations}</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.code}: {lang === 'km' ? loc.nameKm : loc.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Code Filter (Synced with Checklist Cameras) */}
        <div>
          <select
            value={cameraCodeFilter}
            onChange={e => setCameraCodeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
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
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">{t.allStatus}</option>
            <option value="reported">{t.status_reported}</option>
            <option value="in_progress">{t.status_in_progress}</option>
            <option value="waiting_parts">{t.status_waiting_parts}</option>
            <option value="resolved">{t.status_resolved}</option>
            <option value="closed">{t.status_closed}</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="all">{t.allSeverity}</option>
            <option value="critical">{t.severity_critical}</option>
            <option value="medium">{t.severity_medium}</option>
            <option value="low">{t.severity_low}</option>
          </select>
        </div>
      </div>

      {/* Bulk Delete & Selection Action Bar */}
      {selectedTicketIds.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500/60 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl shadow-rose-950/50">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold text-rose-200 font-mono">
              {lang === 'km'
                ? `បានជ្រើសរើសសំបុត្រចំនួន ${selectedTicketIds.length} / ${filteredTickets.length}`
                : `Selected ${selectedTicketIds.length} of ${filteredTickets.length} ticket(s)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTicketIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition"
            >
              {lang === 'km' ? 'សម្អាតការជ្រើសរើស' : 'Clear Selection'}
            </button>
            <button
              onClick={handleDeleteSelectedTickets}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-700/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {lang === 'km'
                  ? `លុបដែលបានជ្រើស (${selectedTicketIds.length})`
                  : `Delete Selected (${selectedTicketIds.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tickets Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 cursor-pointer accent-sky-500"
                    title={isAllFilteredSelected ? 'Deselect all' : 'Select all visible'}
                  />
                </th>
                <th className="py-3 px-4">{t.ticketNumber}</th>
                <th className="py-3 px-4">{t.cameraCode}</th>
                <th className="py-3 px-4">{t.location}</th>
                <th className="py-3 px-4">{t.issueDetails}</th>
                <th className="py-3 px-4">{t.severity}</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4">{t.assignedTo}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2 opacity-60" />
                    <p>{t.noDataFound}</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map(tkt => {
                  const cam = cameras.find(
                    c =>
                      c.id === tkt.cameraId ||
                      (c.code.toLowerCase() === tkt.cameraId.toLowerCase() && c.locationId === tkt.locationId) ||
                      c.code.toLowerCase() === tkt.cameraId.toLowerCase() ||
                      c.id.endsWith(`-${tkt.cameraId}`)
                  );
                  const loc = locations.find(l => l.id === tkt.locationId || l.nameEn === tkt.locationId || l.code === tkt.locationId);
                  const statusLabel = t[`status_${tkt.status}` as keyof typeof t] || tkt.status;
                  const severityLabel = t[`severity_${tkt.severity}` as keyof typeof t] || tkt.severity;
                  const issueLabel = t[`issue_${tkt.issueType}` as keyof typeof t] || tkt.issueType;
                  const isRowSelected = selectedTicketIds.includes(tkt.id);

                  return (
                    <tr
                      key={tkt.id}
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
                          onChange={() => handleToggleSelectRow(tkt.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 cursor-pointer accent-rose-500"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                        {tkt.ticketNumber}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {tkt.reportedDate} ({tkt.shift === 'day' ? t.shiftDayOnly : t.shiftNightOnly})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {cam?.code || 'N/A'}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {cam ? (lang === 'km' ? cam.nameKm : cam.nameEn) : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-200">
                          {loc ? (lang === 'km' ? loc.nameKm : loc.nameEn) : (tkt.locationId || 'N/A')}
                        </span>
                        <div className="text-[10px] text-slate-400">{loc?.code || ''}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-slate-200 block truncate">{issueLabel}</span>
                        <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                          {tkt.description}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getSeverityBadge(
                            tkt.severity
                          )}`}
                        >
                          {severityLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(
                            tkt.status
                          )}`}
                        >
                          {statusLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-300">
                          {tkt.assignedTo || '—'}
                        </div>
                        {tkt.repairCost ? (
                          <div className="text-[10px] text-emerald-400 font-mono">
                            ${tkt.repairCost} USD
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {cam && (
                            <button
                              onClick={() => onPreviewCamera(cam)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition"
                              title={t.cameraPreview}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenTicketModal(tkt)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition"
                            title={t.updateStatus}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingleTicket(tkt.id, tkt.ticketNumber)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-600/80 text-slate-400 hover:text-white rounded-lg transition"
                            title={lang === 'km' ? `លុបសំបុត្រ ${tkt.ticketNumber}` : `Delete ticket ${tkt.ticketNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Ticket */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white">
                {editingTicket ? `${editingTicket.ticketNumber} - ${t.updateStatus}` : t.createIssueTicket}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.cameraCode}
                  </label>
                  <select
                    value={selectedCameraId}
                    onChange={e => setSelectedCameraId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    required
                  >
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
                              {cam.code}: {cam.nameEn} • {cam.nameKm}
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
                              {cam.code}: {cam.nameEn} • {cam.nameKm}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.reportedDate}
                  </label>
                  <input
                    type="date"
                    value={reportedDate}
                    onChange={e => setReportedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.issueDetails}
                  </label>
                  <select
                    value={issueType}
                    onChange={e => setIssueType(e.target.value as IssueType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
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

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.severity}
                  </label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as IssueSeverity)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="critical">{t.severity_critical}</option>
                    <option value="medium">{t.severity_medium}</option>
                    <option value="low">{t.severity_low}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.status}
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as IssueResolutionStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                  >
                    <option value="reported">{t.status_reported}</option>
                    <option value="in_progress">{t.status_in_progress}</option>
                    <option value="waiting_parts">{t.status_waiting_parts}</option>
                    <option value="resolved">{t.status_resolved} (Fixed)</option>
                    <option value="closed">{t.status_closed}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.assignedTo}
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    placeholder="ឈ្មោះជាងជួសជុល..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {lang === 'km' ? 'ការពិពណ៌នាពីបញ្ហា' : 'Issue Description'}
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.repairCost}
                  </label>
                  <input
                    type="number"
                    value={repairCost}
                    onChange={e => setRepairCost(Number(e.target.value))}
                    min={0}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.resolutionNotes}
                  </label>
                  <input
                    type="text"
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    placeholder="កំណត់ចំណាំការដោះស្រាយ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
