import { Camera, InspectionRecord, IssueTicket, LocationZone, Language } from '../types';
import { translations } from '../i18n/translations';

// Helper to download text file with UTF-8 BOM for Excel compatibility
export const downloadCsvFile = (content: string, filename: string) => {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportWeeklyReportToExcel = (
  weekLabel: string,
  startDate: string,
  endDate: string,
  locations: LocationZone[],
  cameras: Camera[],
  inspections: InspectionRecord[],
  tickets: IssueTicket[],
  lang: Language
) => {
  const t = translations[lang];

  // Section 1: Header
  let csv = `"${t.weeklyReportTitle.replace(/"/g, '""')}"\n`;
  csv += `"${t.weekPeriod}","${startDate} ~ ${endDate} (${weekLabel})"\n`;
  csv += `"${t.lastUpdated}","${new Date().toLocaleString()}"\n\n`;

  // Section 2: Executive KPI Summary
  const totalCameras = cameras.length;
  const workingCameras = cameras.filter(c => c.status === 'working').length;
  const faultyCameras = cameras.filter(c => c.status === 'faulty' || c.status === 'offline').length;
  const healthRate = totalCameras > 0 ? ((workingCameras / totalCameras) * 100).toFixed(1) : '100';

  const weekInspections = inspections.filter(i => i.date >= startDate && i.date <= endDate);
  const totalDayInspections = weekInspections.filter(i => i.shift === 'day').length;
  const totalNightInspections = weekInspections.filter(i => i.shift === 'night').length;
  const weekTickets = tickets.filter(tkt => tkt.reportedDate >= startDate && tkt.reportedDate <= endDate);
  const resolvedTickets = weekTickets.filter(tkt => tkt.status === 'resolved' || tkt.status === 'closed').length;

  csv += `"${t.kpiSummary.toUpperCase()}"\n`;
  csv += `"${t.totalCameras}",${totalCameras}\n`;
  csv += `"${t.workingCameras}",${workingCameras}\n`;
  csv += `"${t.faultyCameras}",${faultyCameras}\n`;
  csv += `"${t.operationalRate} (%)","${healthRate}%"\n`;
  csv += `"${t.totalInspectionsHeld}",${weekInspections.length} (${t.shiftDayOnly}: ${totalDayInspections}, ${t.shiftNightOnly}: ${totalNightInspections})\n`;
  csv += `"${t.issuesDiscovered}",${weekTickets.length}\n`;
  csv += `"${t.issuesResolvedThisWeek}",${resolvedTickets}\n\n`;

  // Section 3: 13 Location Zones Overview
  csv += `"${t.locationHealthSummary.toUpperCase()}"\n`;
  csv += `"No.","${t.locationCode}","${t.locationNameKm} / ${t.locationNameEn}","${t.areaCategory}","${t.totalInstalled}","${t.healthyCount}","${t.problemCount}","${t.status}"\n`;

  locations.forEach((loc, idx) => {
    const locCameras = cameras.filter(c => c.locationId === loc.id);
    const locWorking = locCameras.filter(c => c.status === 'working').length;
    const locFaulty = locCameras.filter(c => c.status === 'faulty' || c.status === 'offline').length;
    const locStatus = locFaulty === 0 ? (lang === 'km' ? 'ល្អ' : 'Normal') : (lang === 'km' ? 'មានបញ្ហា' : 'Faulty');
    const locName = lang === 'km' ? loc.nameKm : loc.nameEn;

    csv += `${idx + 1},"${loc.code}","${locName.replace(/"/g, '""')}","${loc.floorOrArea.replace(/"/g, '""')}",${locCameras.length},${locWorking},${locFaulty},"${locStatus}"\n`;
  });

  csv += `\n"${t.problemsTitle.toUpperCase()} (${weekLabel})"\n`;
  csv += `"${t.ticketNumber}","${t.cameraCode}","${t.location}","${t.reportedDate}","${t.selectShift}","${t.issueDetails}","${t.severity}","${t.status}","${t.assignedTo}","${t.repairCost}"\n`;

  if (weekTickets.length === 0) {
    csv += `"N/A","N/A","${t.noDataFound}","","","","","","",""\n`;
  } else {
    weekTickets.forEach(tkt => {
      const cam = cameras.find(c => c.id === tkt.cameraId);
      const loc = locations.find(l => l.id === tkt.locationId);
      const locName = loc ? (lang === 'km' ? loc.nameKm : loc.nameEn) : 'Unknown';
      const sevLabel = lang === 'km' ? t[`severity_${tkt.severity}` as keyof typeof t] : tkt.severity;
      const statusLabel = lang === 'km' ? t[`status_${tkt.status}` as keyof typeof t] : tkt.status;
      const shiftLabel = tkt.shift === 'day' ? t.shiftDayOnly : t.shiftNightOnly;

      csv += `"${tkt.ticketNumber}","${cam?.code || 'N/A'}","${locName.replace(/"/g, '""')}","${tkt.reportedDate}","${shiftLabel}","${tkt.description.replace(/"/g, '""')}","${sevLabel}","${statusLabel}","${tkt.assignedTo || ''}",${tkt.repairCost || 0}\n`;
    });
  }

  // Section 4: Sign-off block
  csv += `\n"${t.weeklyRecommendations}"\n`;
  csv += `"${t.defaultRecommendation.replace(/\n/g, ' ')}"\n\n`;
  csv += `"${t.supervisorSignOff}"\n`;
  csv += `"Verified By: _________________________","Date: ____/____/2026"\n`;

  const safeFilename = `CCTV_Weekly_Report_${startDate}_to_${endDate}.csv`;
  downloadCsvFile(csv, safeFilename);
};

export const exportInspectionsToExcel = (
  inspections: InspectionRecord[],
  cameras: Camera[],
  locations: LocationZone[],
  lang: Language
) => {
  const t = translations[lang];
  let csv = `"${t.inspectionTitle}"\n\n`;
  csv += `"ID","${t.selectDate}","${t.selectShift}","${t.inspectorName}","${t.inspectorRole}","${t.totalCameras}","${t.workingCameras}","${t.faultyCameras}","${t.weatherCondition}","${t.notes}"\n`;

  inspections.forEach(rec => {
    const shiftLabel = rec.shift === 'day' ? t.shiftDayOnly : t.shiftNightOnly;
    csv += `"${rec.id}","${rec.date}","${shiftLabel}","${rec.inspectorName.replace(/"/g, '""')}","${rec.inspectorRole.replace(/"/g, '""')}",${rec.totalCamerasChecked},${rec.normalCount},${rec.issueCount},"${(rec.weatherCondition || '').replace(/"/g, '""')}","${(rec.overallNotes || '').replace(/"/g, '""')}"\n`;
  });

  downloadCsvFile(csv, `CCTV_Inspection_History_${new Date().toISOString().slice(0, 10)}.csv`);
};

export const exportTicketsToExcel = (
  tickets: IssueTicket[],
  cameras: Camera[],
  locations: LocationZone[],
  lang: Language
) => {
  const t = translations[lang];
  let csv = `"${t.problemsTitle}"\n\n`;
  csv += `"${t.ticketNumber}","${t.cameraCode}","${t.cameraName}","${t.location}","${t.reportedDate}","${t.reportedShift}","${t.reportedBy}","${t.issueDetails}","${t.severity}","${t.status}","${t.assignedTo}","${t.repairCost}","${t.resolvedDate}","${t.resolutionNotes}"\n`;

  tickets.forEach(tkt => {
    const cam = cameras.find(c => c.id === tkt.cameraId);
    const loc = locations.find(l => l.id === tkt.locationId);
    const camName = cam ? (lang === 'km' ? cam.nameKm : cam.nameEn) : 'Unknown';
    const locName = loc ? (lang === 'km' ? loc.nameKm : loc.nameEn) : 'Unknown';
    const shiftLabel = tkt.shift === 'day' ? t.shiftDayOnly : t.shiftNightOnly;
    const sevLabel = t[`severity_${tkt.severity}` as keyof typeof t] || tkt.severity;
    const statLabel = t[`status_${tkt.status}` as keyof typeof t] || tkt.status;

    csv += `"${tkt.ticketNumber}","${cam?.code || ''}","${camName.replace(/"/g, '""')}","${locName.replace(/"/g, '""')}","${tkt.reportedDate}","${shiftLabel}","${tkt.reportedBy.replace(/"/g, '""')}","${tkt.description.replace(/"/g, '""')}","${sevLabel}","${statLabel}","${(tkt.assignedTo || '').replace(/"/g, '""')}",${tkt.repairCost || 0},"${tkt.resolvedDate || ''}","${(tkt.resolutionNotes || '').replace(/"/g, '""')}"\n`;
  });

  downloadCsvFile(csv, `CCTV_Problems_Log_${new Date().toISOString().slice(0, 10)}.csv`);
};
