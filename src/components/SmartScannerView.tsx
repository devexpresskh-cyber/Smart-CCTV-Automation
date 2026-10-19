import React, { useState, useRef, useEffect } from 'react';
import {
  SmartInspectionReport,
  SmartReportCamera,
  Language,
  ShiftType,
  DVRProfile,
  DVRCheckStatus,
} from '../types';
import { initialDVRProfiles, defaultDVRCheck } from '../data/smartReportTemplate';
import { getStoredDVRProfiles, setStoredDVRProfiles, hydrateDVRProfilesWithIDB } from '../utils/storage';
import { compressImage } from '../utils/idbStorage';
import { translations } from '../i18n/translations';
import { downloadCsvFile } from '../utils/exportUtils';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Sparkles,
  RefreshCw,
  Eye,
  Shield,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  CheckSquare,
  Square,
  FileCheck,
  Building,
  Image as ImageIcon,
  Zap,
  Plus,
  Trash2,
  Edit2,
  X,
  Server,
  Save,
  FileText,
  Paperclip,
  Check,
  Calendar,
  Download,
  BookOpen,
  Sliders,
  ExternalLink,
} from 'lucide-react';

interface SmartScannerViewProps {
  lang: Language;
  onSyncWithSystem?: (report: SmartInspectionReport) => void;
  onNavigateToWeeklyReport?: () => void;
}

export const SmartScannerView: React.FC<SmartScannerViewProps> = ({
  lang,
  onSyncWithSystem,
  onNavigateToWeeklyReport,
}) => {
  const t = translations[lang];

  // Multi-DVR list
  const [dvrProfiles, setDvrProfiles] = useState<DVRProfile[]>(() => {
    const saved = getStoredDVRProfiles();
    return saved && saved.length > 0 ? saved : initialDVRProfiles;
  });

  // Active DVR unit
  const [activeDvrId, setActiveDvrId] = useState<string>('dvr-01');
  const activeDvr = dvrProfiles.find(d => d.id === activeDvrId) || dvrProfiles[0];

  // Mode: Single Zone Inspector vs Full Multi-DVR Weekly Packet
  const [viewMode, setViewMode] = useState<'single' | 'packet'>('single');

  // Channel count & grid for active DVR
  const [channelCount, setChannelCount] = useState<number>(activeDvr.channelCount);
  const [gridCols, setGridCols] = useState<number>(activeDvr.gridCols);
  const [gridRows, setGridRows] = useState<number>(activeDvr.gridRows);
  const [cameras, setCameras] = useState<SmartReportCamera[]>(activeDvr.cameras);

  // Attached Screenshots for active DVR
  const [dayScreenshot, setDayScreenshot] = useState<string | null>(activeDvr.dayScreenshotUrl || null);
  const [nightScreenshot, setNightScreenshot] = useState<string | null>(activeDvr.nightScreenshotUrl || null);

  // Dates & metadata
  const [selectedWeek, setSelectedWeek] = useState<string>('Week 42 (12-18 Oct 2026)');
  const [inspectionDate, setInspectionDate] = useState<string>('18/10/2026');
  const [isAnalyzingDay, setIsAnalyzingDay] = useState(false);
  const [isAnalyzingNight, setIsAnalyzingNight] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Drag and drop states
  const [isDraggingDay, setIsDraggingDay] = useState(false);
  const [isDraggingNight, setIsDraggingNight] = useState(false);

  // Modals
  const [isAddDvrModalOpen, setIsAddDvrModalOpen] = useState(false);
  const [newDvrName, setNewDvrName] = useState('');
  const [newDvrLocationKm, setNewDvrLocationKm] = useState('');
  const [newDvrChannelCount, setNewDvrChannelCount] = useState<number>(16);

  const [isEditDvrModalOpen, setIsEditDvrModalOpen] = useState(false);
  const [editDvrName, setEditDvrName] = useState('');
  const [editDvrLocationKm, setEditDvrLocationKm] = useState('');
  const [editDvrChannelCount, setEditDvrChannelCount] = useState<number>(16);

  const [editingCameraIndex, setEditingCameraIndex] = useState<number | null>(null);
  const [editCamNameThai, setEditCamNameThai] = useState('');
  const [editCamNameKm, setEditCamNameKm] = useState('');

  // Edit DVR Recorder Status Modal states
  const [isEditDvrStatusModalOpen, setIsEditDvrStatusModalOpen] = useState(false);
  const [statusModalDvrId, setStatusModalDvrId] = useState<string>('dvr-01');
  const [statusModalOperating, setStatusModalOperating] = useState<'ok' | 'issue'>('ok');
  const [statusModalDateTime, setStatusModalDateTime] = useState<'ok' | 'issue'>('ok');
  const [statusModalRecordedDays, setStatusModalRecordedDays] = useState<number>(30);
  const [statusModalCanPlayback, setStatusModalCanPlayback] = useState<boolean>(true);
  const [statusModalResolution, setStatusModalResolution] = useState<string>('1920x1080p');
  const [statusModalCapacity, setStatusModalCapacity] = useState<string>('12TB');
  const [statusModalDiskCheck, setStatusModalDiskCheck] = useState<string>('Checking Disk 100%: OK');
  const [statusModalApplyAll, setStatusModalApplyAll] = useState<boolean>(false);

  const dayFileInputRef = useRef<HTMLInputElement>(null);
  const nightFileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleOpenDvrStatusModal = (dvrId?: string) => {
    const targetId = dvrId || activeDvrId;
    const target = dvrProfiles.find(d => d.id === targetId) || activeDvr;
    const current = target.dvrCheck || defaultDVRCheck;
    setStatusModalDvrId(targetId);
    setStatusModalOperating(current.operating);
    setStatusModalDateTime(current.dateTimeConfig);
    setStatusModalRecordedDays(current.recordedDays);
    setStatusModalCanPlayback(current.canPlayback);
    setStatusModalResolution(current.resolution);
    setStatusModalCapacity(current.harddiskCapacity);
    setStatusModalDiskCheck(current.diskCheckStatus);
    setStatusModalApplyAll(false);
    setIsEditDvrStatusModalOpen(true);
  };

  const handleSaveDvrStatusModal = (e: React.FormEvent) => {
    e.preventDefault();
    const newCheck: DVRCheckStatus = {
      operating: statusModalOperating,
      dateTimeConfig: statusModalDateTime,
      recordedDays: Number(statusModalRecordedDays),
      canPlayback: statusModalCanPlayback,
      resolution: statusModalResolution,
      harddiskCapacity: statusModalCapacity,
      diskCheckStatus: statusModalDiskCheck,
    };
    handleUpdateDvrCheck(statusModalDvrId, newCheck, statusModalApplyAll);
    setIsEditDvrStatusModalOpen(false);
  };

  const handleUpdateDvrCheck = (targetDvrId: string, partialCheck: Partial<DVRCheckStatus>, applyToAll = false) => {
    const updated = dvrProfiles.map(p => {
      if (applyToAll || p.id === targetDvrId) {
        const base = p.dvrCheck || defaultDVRCheck;
        return {
          ...p,
          dvrCheck: {
            ...base,
            ...partialCheck,
          },
        };
      }
      return p;
    });
    saveDVRProfiles(updated);
    showFeedback(
      applyToAll
        ? '✅ បានធ្វើបច្ចុប្បន្នភាពស្ថានភាព DVR/NVR គ្រប់អង្គភាពទាំងអស់!'
        : `✅ បានកែប្រែស្ថានភាព Recorder សម្រាប់ ${dvrProfiles.find(d => d.id === targetDvrId)?.name || 'DVR'}!`
    );
  };

  const handlePacketToggleCheck = (dvrId: string, camNumber: number, shift: 'day' | 'night') => {
    const updated = dvrProfiles.map(p => {
      if (p.id === dvrId) {
        const updatedCams = p.cameras.map(c => {
          if (c.number === camNumber) {
            const next = shift === 'day'
              ? (c.dayStatus === 'ok' ? 'issue' : 'ok')
              : (c.nightStatus === 'ok' ? 'issue' : 'ok');
            return shift === 'day'
              ? { ...c, dayStatus: next as 'ok' | 'issue' }
              : { ...c, nightStatus: next as 'ok' | 'issue' };
          }
          return c;
        });
        return { ...p, cameras: updatedCams };
      }
      return p;
    });
    saveDVRProfiles(updated);
  };

  // Grid dimensions calculator for any channel number
  const getGridDims = (count: number): { cols: number; rows: number } => {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 8) return { cols: 4, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    if (count <= 16) return { cols: 4, rows: 4 };
    if (count <= 24) return { cols: 6, rows: 4 };
    if (count <= 32) return { cols: 8, rows: 4 };
    if (count <= 64) return { cols: 8, rows: 8 };
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    return { cols, rows };
  };

  // Hydrate full screenshots from IndexedDB on startup
  useEffect(() => {
    hydrateDVRProfilesWithIDB(dvrProfiles).then(hydrated => {
      if (hydrated && hydrated.length > 0) {
        setDvrProfiles(hydrated);
      }
    });
  }, []);

  // Sync state when active DVR changes
  useEffect(() => {
    if (activeDvr) {
      setChannelCount(activeDvr.channelCount);
      setGridCols(activeDvr.gridCols || getGridDims(activeDvr.channelCount).cols);
      setGridRows(activeDvr.gridRows || getGridDims(activeDvr.channelCount).rows);
      setCameras(activeDvr.cameras);
      setDayScreenshot(activeDvr.dayScreenshotUrl || generateSampleMonitor(activeDvr.channelCount, activeDvr.name, 'day'));
      setNightScreenshot(activeDvr.nightScreenshotUrl || generateSampleMonitor(activeDvr.channelCount, activeDvr.name, 'night'));
    }
  }, [activeDvrId]);

  // Persist DVR profiles in local storage & IndexedDB
  const saveDVRProfiles = (updated: DVRProfile[]) => {
    setDvrProfiles(updated);
    setStoredDVRProfiles(updated);
  };

  // High-fidelity SMART PSS Monitor Simulation for Day or Night (compact ~25KB JPEG)
  function generateSampleMonitor(chCount: number, dvrName: string, shift: 'day' | 'night'): string {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Dark software background
    ctx.fillStyle = '#1e2124';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top window bar
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, canvas.width, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText(
      `SMART PSS | ${shift === 'day' ? 'Live View' : 'Playback CPS'} - [${dvrName}]`,
      10,
      18
    );

    // Window controls
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(canvas.width - 16, 14, 4, 0, Math.PI * 2);
    ctx.fill();

    const { cols, rows } = getGridDims(chCount);
    const marginX = 90; // sidebar offset
    const marginY = 32;
    const availW = canvas.width - marginX - 6;
    const availH = canvas.height - marginY - (shift === 'night' ? 26 : 6);
    const cellW = Math.floor(availW / cols);
    const cellH = Math.floor(availH / rows);

    // Left tree
    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 28, marginX, canvas.height - 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Default Group', 6, 44);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`▾ ${dvrName.slice(0, 10)}`, 8, 60);
    for (let c = 1; c <= Math.min(chCount, 12); c++) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(` • CAM ${c}`, 12, 60 + c * 13);
    }

    // Bottom playback timeline bar for Night mode
    if (shift === 'night') {
      ctx.fillStyle = '#111827';
      ctx.fillRect(marginX, canvas.height - 24, availW, 22);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(marginX + 10, canvas.height - 15, availW - 30, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('00:00:00 [PLAYBACK 24H RECORDED]', marginX + 20, canvas.height - 6);
    }

    // Draw camera boxes
    for (let i = 0; i < chCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = marginX + col * cellW;
      const y = marginY + row * cellH;

      let isBlack = false;
      if (dvrName === 'Around Building') {
        isBlack = i === 1 || i === 4 || i === 15;
      } else if (dvrName === 'Maintenance') {
        isBlack = i === 1 || i === 3;
      } else if (dvrName === 'SIP Real estate') {
        isBlack = i === 5;
      }

      if (isBlack) {
        ctx.fillStyle = '#050505';
        ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(`CAM ${i + 1}`, x + 8, y + cellH - 8);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('NO VIDEO SIGNAL', x + cellW / 2 - 45, y + cellH / 2);
      } else {
        if (shift === 'night') {
          const brightness = 20 + ((i * 19) % 35);
          ctx.fillStyle = `rgb(${brightness}, ${brightness + 4}, ${brightness + 8})`;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

          const spotX = x + cellW * 0.5;
          const spotY = y + cellH * 0.4;
          const spotGrad = ctx.createRadialGradient(spotX, spotY, 5, spotX, spotY, cellW * 0.5);
          spotGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
          spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = spotGrad;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        } else {
          const hue = (i * 47) % 360;
          const grad = ctx.createLinearGradient(x, y, x, y + cellH);
          grad.addColorStop(0, `hsl(${hue}, 25%, 38%)`);
          grad.addColorStop(1, `hsl(${hue}, 30%, 18%)`);
          ctx.fillStyle = grad;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 6, y + 6, cellW - 12, cellH - 12);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillText(`CAM ${i + 1}`, x + 8, y + cellH - 8);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px JetBrains Mono, monospace';
        const timeStr = shift === 'day' ? '18-10-2026 08:52:14' : '18-10-2026 00:00:04';
        ctx.fillText(timeStr, x + cellW - 125, y + 14);
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellW, cellH);
    }

    return canvas.toDataURL('image/jpeg', 0.65);
  }

  // Vision analyzer that inspects image and automatically checks Day or Night boxes
  const scanScreenshotForShift = (
    imgElement: HTMLImageElement,
    targetShift: 'day' | 'night',
    totalCh: number,
    colsCount: number,
    rowsCount: number
  ) => {
    targetShift === 'day' ? setIsAnalyzingDay(true) : setIsAnalyzingNight(true);

    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth || imgElement.width || 800;
    canvas.height = imgElement.naturalHeight || imgElement.height || 450;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      targetShift === 'day' ? setIsAnalyzingDay(false) : setIsAnalyzingNight(false);
      return;
    }

    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    const leftOffsetRatio = 0.11;
    const topOffsetRatio = 0.05;
    const startX = canvas.width * leftOffsetRatio;
    const startY = canvas.height * topOffsetRatio;
    const gridW = canvas.width - startX;
    const gridH = canvas.height - startY;

    const cellW = gridW / colsCount;
    const cellH = gridH / rowsCount;

    const updatedCameras = [...cameras];

    for (let idx = 0; idx < totalCh; idx++) {
      const r = Math.floor(idx / colsCount);
      const c = idx % colsCount;

      const sampleX = Math.floor(startX + c * cellW + cellW * 0.25);
      const sampleY = Math.floor(startY + r * cellH + cellH * 0.25);
      const sampleW = Math.max(10, Math.floor(cellW * 0.5));
      const sampleH = Math.max(10, Math.floor(cellH * 0.5));

      let isBlackScreen = false;

      try {
        const imageData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
        const data = imageData.data;
        let totalBrightness = 0;
        let maxVal = 0;
        let minVal = 255;

        for (let p = 0; p < data.length; p += 4) {
          const brightness = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
          totalBrightness += brightness;
          if (brightness > maxVal) maxVal = brightness;
          if (brightness < minVal) minVal = brightness;
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        const variance = maxVal - minVal;
        isBlackScreen = avgBrightness < 25 && variance < 20;
      } catch (e) {
        console.error(e);
      }

      if (updatedCameras[idx]) {
        if (targetShift === 'day') {
          updatedCameras[idx].dayStatus = isBlackScreen ? 'issue' : 'ok';
        } else {
          updatedCameras[idx].nightStatus = isBlackScreen ? 'issue' : 'ok';
        }

        if (isBlackScreen) {
          updatedCameras[idx].symptom = 'អេក្រង់ខ្មៅ (หน้าจอภาพไม่แสดงภาพ / Black screen)';
        }
      }
    }

    setTimeout(() => {
      setCameras(updatedCameras);

      const faultyCount = updatedCameras.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length;
      const updatedProfiles = dvrProfiles.map(d =>
        d.id === activeDvrId
          ? {
              ...d,
              cameras: updatedCameras,
              dayScreenshotUrl: targetShift === 'day' ? imgElement.src : d.dayScreenshotUrl,
              nightScreenshotUrl: targetShift === 'night' ? imgElement.src : d.nightScreenshotUrl,
              workingCount: totalCh - faultyCount,
              faultyCount,
            }
          : d
      );
      saveDVRProfiles(updatedProfiles);
      targetShift === 'day' ? setIsAnalyzingDay(false) : setIsAnalyzingNight(false);
      showFeedback(`✓ ស្កេនរូបថត ${targetShift === 'day' ? 'ពេលថ្ងៃ' : 'ពេលយប់'} និង Update Checklist រួចរាល់!`);
    }, 400);
  };

  // Upload or Paste Day Screenshot with instant compression to ~25KB
  const handleDayImageSelect = async (fileOrUrl: File | string) => {
    const compressed = await compressImage(fileOrUrl, 800, 0.65);
    setDayScreenshot(compressed);
    const img = new Image();
    img.onload = () => scanScreenshotForShift(img, 'day', channelCount, gridCols, gridRows);
    img.src = compressed;
  };

  // Upload or Paste Night Screenshot with instant compression to ~25KB
  const handleNightImageSelect = async (fileOrUrl: File | string) => {
    const compressed = await compressImage(fileOrUrl, 800, 0.65);
    setNightScreenshot(compressed);
    const img = new Image();
    img.onload = () => scanScreenshotForShift(img, 'night', channelCount, gridCols, gridRows);
    img.src = compressed;
  };

  // Clipboard Paste Support (Ctrl+V) anywhere on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (!dayScreenshot) {
              handleDayImageSelect(file);
            } else {
              handleNightImageSelect(file);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [dayScreenshot, channelCount, gridCols, gridRows, activeDvrId]);

  // One-click: Auto-generate Sample Screenshots & Audit for ALL DVRs!
  const handlePreloadAllDVRs = () => {
    const updated = dvrProfiles.map(dvr => {
      const dayImg = generateSampleMonitor(dvr.channelCount, dvr.name, 'day');
      const nightImg = generateSampleMonitor(dvr.channelCount, dvr.name, 'night');
      return {
        ...dvr,
        dayScreenshotUrl: dayImg,
        nightScreenshotUrl: nightImg,
      };
    });

    saveDVRProfiles(updated);
    if (activeDvr) {
      setDayScreenshot(generateSampleMonitor(activeDvr.channelCount, activeDvr.name, 'day'));
      setNightScreenshot(generateSampleMonitor(activeDvr.channelCount, activeDvr.name, 'night'));
    }
    showFeedback('⚡ បានភ្ជាប់រូបភាពភស្តុតាងគំរូគ្រប់ DVR រួចរាល់! អាចបោះពុម្ព ឬមើលរបាយការណ៍បានភ្លាមៗ។');
  };

  // Save current screenshots to weekly checklist archive
  const handleSaveToWeeklyChecklist = () => {
    // Sync current active DVR to profiles
    const updatedProfiles = dvrProfiles.map(d =>
      d.id === activeDvrId
        ? {
            ...d,
            cameras,
            dayScreenshotUrl: dayScreenshot || d.dayScreenshotUrl,
            nightScreenshotUrl: nightScreenshot || d.nightScreenshotUrl,
            lastCheckedDate: inspectionDate,
          }
        : d
    );
    saveDVRProfiles(updatedProfiles);

    if (onSyncWithSystem) {
      const report: SmartInspectionReport = {
        id: `smart-rep-${Date.now()}`,
        formCode: 'F-IT-002 REW.00 Date 22/03/2024',
        companyName: 'TK Garment',
        companySubName: 'Sisophon Co., Ltd.',
        titleKm: 'ទម្រង់ត្រួតពិនិត្យ CCTV និង DVR សម្រាប់ឆ្នាំ 2026',
        titleTh: 'แบบฟอร์มตรวจสอบกล้องวงจรปิด และเครื่องบันทึกภาพ ประจำปี 2026',
        year: 2026,
        zone: activeDvr.name,
        inspectionDate,
        shift: 'day',
        dayScreenshotUrl: dayScreenshot || undefined,
        nightScreenshotUrl: nightScreenshot || undefined,
        cameras,
        totalCameras: channelCount,
        workingCount: cameras.filter(c => c.dayStatus === 'ok' && c.nightStatus === 'ok').length,
        faultyCount: cameras.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length,
        faultyListStr:
          cameras
            .filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue')
            .map(c => `CAM ${c.number}`)
            .join(', ') || 'គ្មាន',
        faultySymptomStr: 'អេក្រង់ខ្មៅ អត់ចេញរូបភាព (Black screen)',
        dvrCheck: activeDvr.dvrCheck || defaultDVRCheck,
        signOff: {
          itOfficer: '',
          maintenanceLead: '',
          maintenanceHead: '',
          manager: '',
          generalManager: '',
        },
      };
      onSyncWithSystem(report);
    }

    showFeedback(`💾 បានរក្សាទុក Screenshot & Checklist ភ្ជាប់ទៅរបាយការណ៍សប្តាហ៍ ${selectedWeek} ដោយជោគជ័យ!`);
  };

  // Toggle single camera checklist status
  const handleToggleCheck = (camNumber: number, shift: 'day' | 'night') => {
    const updated = cameras.map(c => {
      if (c.number === camNumber) {
        if (shift === 'day') {
          const next = c.dayStatus === 'ok' ? 'issue' : 'ok';
          return { ...c, dayStatus: next as 'ok' | 'issue' };
        } else {
          const next = c.nightStatus === 'ok' ? 'issue' : 'ok';
          return { ...c, nightStatus: next as 'ok' | 'issue' };
        }
      }
      return c;
    });

    setCameras(updated);
    const faultyC = updated.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length;
    const updatedProfiles = dvrProfiles.map(d =>
      d.id === activeDvrId
        ? { ...d, cameras: updated, workingCount: channelCount - faultyC, faultyCount: faultyC }
        : d
    );
    saveDVRProfiles(updatedProfiles);
  };

  // Quick Channel Count Resizing on Active DVR
  const handleQuickChannelResize = (newCount: number) => {
    const dims = getGridDims(newCount);
    let newCamList: SmartReportCamera[] = [];

    for (let i = 1; i <= newCount; i++) {
      const existing = cameras.find(c => c.number === i);
      if (existing) {
        newCamList.push(existing);
      } else {
        newCamList.push({
          number: i,
          nameThai: `กล้อง ${activeDvr.name} จุดที่ ${i}`,
          nameKm: `កាមេរ៉ា ${activeDvr.name} ចំណុចទី ${i}`,
          nameEn: `${activeDvr.name} Cam ${i}`,
          dayStatus: 'ok',
          nightStatus: 'ok',
        });
      }
    }

    setChannelCount(newCount);
    setGridCols(dims.cols);
    setGridRows(dims.rows);
    setCameras(newCamList);

    const updatedProfiles = dvrProfiles.map(d =>
      d.id === activeDvrId
        ? {
            ...d,
            channelCount: newCount,
            gridCols: dims.cols,
            gridRows: dims.rows,
            cameras: newCamList,
            workingCount: newCamList.filter(c => c.dayStatus === 'ok' && c.nightStatus === 'ok').length,
            faultyCount: newCamList.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length,
          }
        : d
    );
    saveDVRProfiles(updatedProfiles);
    showFeedback(`✓ បានកែប្រែ DVR ទៅជា ${newCount} Channels រួចរាល់!`);
  };

  // Add New DVR
  const handleCreateDvr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDvrName.trim()) return;

    const newId = `dvr-${Date.now()}`;
    const dims = getGridDims(newDvrChannelCount);

    const newCamList: SmartReportCamera[] = Array.from({ length: newDvrChannelCount }, (_, i) => ({
      number: i + 1,
      nameThai: `กล้อง ${newDvrName} จุดที่ ${i + 1}`,
      nameKm: `កាមេរ៉ា ${newDvrName} ចំណុចទី ${i + 1}`,
      nameEn: `${newDvrName} Cam ${i + 1}`,
      dayStatus: 'ok',
      nightStatus: 'ok',
    }));

    const newProfile: DVRProfile = {
      id: newId,
      name: newDvrName,
      locationKm: newDvrLocationKm || newDvrName,
      channelCount: newDvrChannelCount,
      gridCols: dims.cols,
      gridRows: dims.rows,
      cameras: newCamList,
      workingCount: newDvrChannelCount,
      faultyCount: 0,
      dayScreenshotUrl: generateSampleMonitor(newDvrChannelCount, newDvrName, 'day'),
      nightScreenshotUrl: generateSampleMonitor(newDvrChannelCount, newDvrName, 'night'),
    };

    const updated = [...dvrProfiles, newProfile];
    saveDVRProfiles(updated);
    setActiveDvrId(newId);
    setIsAddDvrModalOpen(false);
    setNewDvrName('');
    setNewDvrLocationKm('');
    setNewDvrChannelCount(16);
    showFeedback(`✓ បានបង្កើត DVR ថ្មី "${newProfile.name}" (${newProfile.channelCount} CH) ដោយជោគជ័យ!`);
  };

  // Edit DVR
  const handleOpenEditDvr = () => {
    setEditDvrName(activeDvr.name);
    setEditDvrLocationKm(activeDvr.locationKm);
    setEditDvrChannelCount(activeDvr.channelCount);
    setIsEditDvrModalOpen(true);
  };

  const handleSaveEditDvr = (e: React.FormEvent) => {
    e.preventDefault();
    const dims = getGridDims(editDvrChannelCount);

    let updatedCamList: SmartReportCamera[] = [];
    for (let i = 1; i <= editDvrChannelCount; i++) {
      const existing = cameras.find(c => c.number === i);
      if (existing) {
        updatedCamList.push(existing);
      } else {
        updatedCamList.push({
          number: i,
          nameThai: `กล้อง ${editDvrName} จุดที่ ${i}`,
          nameKm: `កាមេរ៉ា ${editDvrName} ចំណុចទី ${i}`,
          nameEn: `${editDvrName} Cam ${i}`,
          dayStatus: 'ok',
          nightStatus: 'ok',
        });
      }
    }

    const updated = dvrProfiles.map(d =>
      d.id === activeDvrId
        ? {
            ...d,
            name: editDvrName,
            locationKm: editDvrLocationKm,
            channelCount: editDvrChannelCount,
            gridCols: dims.cols,
            gridRows: dims.rows,
            cameras: updatedCamList,
          }
        : d
    );

    saveDVRProfiles(updated);
    setChannelCount(editDvrChannelCount);
    setGridCols(dims.cols);
    setGridRows(dims.rows);
    setCameras(updatedCamList);
    setIsEditDvrModalOpen(false);
    showFeedback('✓ បានកែប្រែព័ត៌មាន DVR រួចរាល់!');
  };

  // Delete DVR
  const handleDeleteDvr = (dvrId: string) => {
    if (dvrProfiles.length <= 1) {
      alert('មិនអាចលុប DVR ទាំងអស់បានទេ! ត្រូវមានយ៉ាងហោចណាស់ ១ DVR។');
      return;
    }
    if (confirm(`តើអ្នកពិតជាចង់លុប DVR "${activeDvr.name}" មែនទេ?`)) {
      const updated = dvrProfiles.filter(d => d.id !== dvrId);
      saveDVRProfiles(updated);
      setActiveDvrId(updated[0].id);
      showFeedback('✓ បានលុប DVR រួចរាល់!');
    }
  };

  // Save edited camera location name
  const handleSaveCameraName = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCameraIndex === null) return;

    const updated = cameras.map((c, i) =>
      i === editingCameraIndex
        ? {
            ...c,
            nameThai: editCamNameThai || c.nameThai,
            nameKm: editCamNameKm || c.nameKm,
          }
        : c
    );
    setCameras(updated);

    const updatedProfiles = dvrProfiles.map(d =>
      d.id === activeDvrId ? { ...d, cameras: updated } : d
    );
    saveDVRProfiles(updatedProfiles);
    setEditingCameraIndex(null);
  };

  // Channel preset buttons list
  const channelPresets = [4, 6, 8, 16, 24, 32];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-bounce">
          {feedbackToast}
        </div>
      )}

      {/* Top Header & Workflow Nav */}
      <div className="no-print bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Paperclip className="w-4 h-4 text-amber-400" />
              <span>Easy Multi-DVR Screenshot & Weekly Checklist Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>ភ្ជាប់ Screenshot ជំនួសឱ្យការបំពេញកាមេរ៉ាម្តងមួយ</span>
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              គាំទ្រ DVR ច្រើនគ្រឿង និង Channel ខុសៗគ្នា (4, 8, 16, 24, 32 CH) • គ្រាន់តែ Upload ឬ Paste (Ctrl+V) រូបភាពអេក្រង់ ប្រព័ន្ធនឹងភ្ជាប់រូបភស្តុតាងទៅ Checklist ប្រចាំសប្តាហ៍ស្វ័យប្រវត្តិ
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSaveToWeeklyChecklist}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold rounded-xl text-xs shadow-md transition"
              title="Save screenshots and findings to weekly report"
            >
              <Save className="w-4 h-4" />
              <span>💾 រក្សាទុកភ្ជាប់ទៅរបាយការណ៍សប្តាហ៍</span>
            </button>

            {onNavigateToWeeklyReport && (
              <button
                onClick={onNavigateToWeeklyReport}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span>📂 មើលរបាយការណ៍សប្តាហ៍</span>
              </button>
            )}

            <button
              onClick={handlePreloadAllDVRs}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition"
              title="Auto-fill sample Day & Night screenshots for all DVRs"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>⚡ Sample គ្រប់ DVR</span>
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'single' ? 'packet' : 'single')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                viewMode === 'packet'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{viewMode === 'packet' ? 'មើលម្តងមួយ DVR' : 'មើលកញ្ចប់គ្រប់ DVR'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>បោះពុម្ព / PDF</span>
            </button>
          </div>
        </div>

        {/* Week & Date Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400 font-semibold">សប្តាហ៍ត្រួតពិនិត្យ:</span>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="Week 42 (12-18 Oct 2026)">Week 42 (12-18 Oct 2026) [សប្តាហ៍បច្ចុប្បន្ន]</option>
              <option value="Week 41 (05-11 Oct 2026)">Week 41 (05-11 Oct 2026) [សប្តាហ៍មុន]</option>
              <option value="Week 43 (19-25 Oct 2026)">Week 43 (19-25 Oct 2026)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>កាលបរិច្ឆេទត្រួតពិនិត្យ:</span>
            <input
              type="text"
              value={inspectionDate}
              onChange={e => setInspectionDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white w-28 text-center"
            />
          </div>
        </div>

        {/* Multi-DVR Carousel & Management */}
        <div className="pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>ជ្រើសរើស CCTV DVR ({dvrProfiles.length} DVRs):</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">
                Paste រូបភាពដោយចុច <strong className="font-mono bg-slate-800 px-1 rounded">Ctrl+V</strong> លើទំព័របានភ្លាមៗ
              </span>

              <button
                onClick={() => setIsAddDvrModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ បន្ថែម DVR ថ្មី</span>
              </button>
            </div>
          </div>

          {/* DVR Buttons Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {dvrProfiles.map((dvr, idx) => {
              const isSelected = dvr.id === activeDvrId;
              const hasDay = Boolean(dvr.dayScreenshotUrl);
              const hasNight = Boolean(dvr.nightScreenshotUrl);

              return (
                <button
                  key={dvr.id}
                  onClick={() => {
                    setActiveDvrId(dvr.id);
                    setViewMode('single');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition flex flex-col gap-1 border text-left ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-600/30'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] opacity-75">#{idx + 1}</span>
                    <span className="font-bold">{dvr.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono opacity-80">{dvr.channelCount} CH</span>
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasDay ? 'bg-amber-400' : 'bg-slate-600'}`} title="Day Screenshot" />
                      <span className={`w-1.5 h-1.5 rounded-full ${hasNight ? 'bg-indigo-400' : 'bg-slate-600'}`} title="Night Screenshot" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Single Zone View */}
      {viewMode === 'single' ? (
        <div className="space-y-6">
          {/* Active DVR Quick Channel & Profile Toolbar */}
          <div className="no-print bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <span>{activeDvr.name}</span>
              </span>
              <span className="text-slate-400 font-mono">({activeDvr.locationKm})</span>
              <span className="bg-sky-950 text-sky-300 border border-sky-800 font-bold px-2 py-0.5 rounded font-mono">
                {channelCount} Channels
              </span>

              <button
                onClick={handleOpenEditDvr}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                title="Edit DVR Name or Channels"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {dvrProfiles.length > 1 && (
                <button
                  onClick={() => handleDeleteDvr(activeDvr.id)}
                  className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-slate-800 transition"
                  title="Delete DVR"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Channel Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] mr-1">កំណត់ Channel:</span>
              {channelPresets.map(count => (
                <button
                  key={count}
                  onClick={() => handleQuickChannelResize(count)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                    channelCount === count
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {count}CH
                </button>
              ))}
            </div>
          </div>

          {/* Dual Screenshot Drop / Upload Zones (Day & Night) */}
          <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ☀️ DAY SCREENSHOT DROPZONE */}
            <div
              className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 space-y-3 transition ${
                isDraggingDay ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-800'
              }`}
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingDay(true);
              }}
              onDragLeave={() => setIsDraggingDay(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingDay(false);
                if (e.dataTransfer.files?.[0]) {
                  handleDayImageSelect(e.dataTransfer.files[0]);
                }
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white">
                      1. Screenshot ពេលថ្ងៃ (Day Shift)
                    </h4>
                    <p className="text-[10px] text-slate-400">ស្កេន Auto-Checklist សម្រាប់ជួរ "ตอนวัน"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDayImageSelect(generateSampleMonitor(channelCount, activeDvr.name, 'day'))}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold"
                  >
                    ⚡ Sample Day
                  </button>
                  <button
                    onClick={() => dayFileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={dayFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleDayImageSelect(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Day Image Preview Container */}
              <div
                className="relative aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden group flex items-center justify-center cursor-pointer"
                onClick={() => dayFileInputRef.current?.click()}
              >
                {dayScreenshot ? (
                  <img src={dayScreenshot} alt="Day Screenshot" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4 text-slate-500 space-y-1">
                    <Sun className="w-8 h-8 mx-auto opacity-40 text-amber-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-300">ទម្លាក់រូបថតពេលថ្ងៃនៅទីនេះ ឬចុច Upload</p>
                    <p className="text-[10px] text-slate-500">គាំទ្រការ Paste (Ctrl+V) ដោយផ្ទាល់</p>
                  </div>
                )}

                {isAnalyzingDay && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mb-1" />
                    <p className="text-xs font-bold font-mono">SCANNING DAY CHANNELS...</p>
                  </div>
                )}

                {dayScreenshot && (
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 border border-white/10">
                    ✓ Attached Day Evidence
                  </div>
                )}
              </div>

              {/* Quick Channel Toggles for Day Shift */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>ចុចលើ Channel ដើម្បីប្តូរស្ថានភាពពេលថ្ងៃ (1-Click Toggle):</span>
                  <span className="text-emerald-400">បៃតង = ធម្មតា • ក្រហម = អេក្រង់ខ្មៅ</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
                  {cameras.map(c => {
                    const isOk = c.dayStatus === 'ok';
                    return (
                      <button
                        key={c.number}
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleCheck(c.number, 'day');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
                          isOk
                            ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-rose-950/90 border-rose-600 text-rose-300 hover:bg-rose-900 animate-pulse'
                        }`}
                        title={`CAM ${c.number}: ${isOk ? 'OK' : 'Black Screen'}`}
                      >
                        C{c.number} {isOk ? '✓' : '✖'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 🌙 NIGHT SCREENSHOT DROPZONE */}
            <div
              className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 space-y-3 transition ${
                isDraggingNight ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-slate-800'
              }`}
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingNight(true);
              }}
              onDragLeave={() => setIsDraggingNight(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingNight(false);
                if (e.dataTransfer.files?.[0]) {
                  handleNightImageSelect(e.dataTransfer.files[0]);
                }
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white">
                      2. Screenshot ពេលយប់ (Night Shift)
                    </h4>
                    <p className="text-[10px] text-slate-400">ស្កេន Auto-Checklist សម្រាប់ជួរ "ตอนคืน"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNightImageSelect(generateSampleMonitor(channelCount, activeDvr.name, 'night'))}
                    className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold"
                  >
                    ⚡ Sample Night
                  </button>
                  <button
                    onClick={() => nightFileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={nightFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleNightImageSelect(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Night Image Preview Container */}
              <div
                className="relative aspect-video rounded-xl bg-black border border-slate-800 overflow-hidden group flex items-center justify-center cursor-pointer"
                onClick={() => nightFileInputRef.current?.click()}
              >
                {nightScreenshot ? (
                  <img src={nightScreenshot} alt="Night Screenshot" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4 text-slate-500 space-y-1">
                    <Moon className="w-8 h-8 mx-auto opacity-40 text-indigo-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-300">ទម្លាក់រូបថតពេលយប់នៅទីនេះ ឬចុច Upload</p>
                    <p className="text-[10px] text-slate-500">គាំទ្រការ Paste (Ctrl+V) ដោយផ្ទាល់</p>
                  </div>
                )}

                {isAnalyzingNight && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-1" />
                    <p className="text-xs font-bold font-mono">SCANNING NIGHT CHANNELS...</p>
                  </div>
                )}

                {nightScreenshot && (
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-indigo-300 border border-white/10">
                    ✓ Attached Night Evidence
                  </div>
                )}
              </div>

              {/* Quick Channel Toggles for Night Shift */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                  <span>ចុចលើ Channel ដើម្បីប្តូរស្ថានភាពពេលយប់ (1-Click Toggle):</span>
                  <span className="text-indigo-400">បៃតង = ធម្មតា • ក្រហម = អេក្រង់ខ្មៅ</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
                  {cameras.map(c => {
                    const isOk = c.nightStatus === 'ok';
                    return (
                      <button
                        key={c.number}
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleCheck(c.number, 'night');
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition border ${
                          isOk
                            ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-rose-950/90 border-rose-600 text-rose-300 hover:bg-rose-900 animate-pulse'
                        }`}
                        title={`CAM ${c.number}: ${isOk ? 'OK' : 'Black Screen'}`}
                      >
                        C{c.number} {isOk ? '✓' : '✖'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Render the Complete Official Report for this Zone WITH ATTACHED SCREENSHOTS */}
          <ZoneReportSheet
            dvr={activeDvr}
            cameras={cameras}
            inspectionDate={inspectionDate}
            dayScreenshot={dayScreenshot}
            nightScreenshot={nightScreenshot}
            onToggleCheck={handleToggleCheck}
            onEditCamera={idx => {
              setEditingCameraIndex(idx);
              setEditCamNameThai(cameras[idx].nameThai);
              setEditCamNameKm(cameras[idx].nameKm);
            }}
            onUpdateDvrCheck={partial => handleUpdateDvrCheck(activeDvr.id, partial)}
            onOpenDvrCheckModal={() => handleOpenDvrStatusModal(activeDvr.id)}
          />
        </div>
      ) : (
        /* Multi-Zone Packet View: Renders all DVRs sequentially for complete booklet printing! */
        <div className="space-y-10">
          <div className="no-print p-4 rounded-xl bg-sky-950/60 border border-sky-800 text-sky-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
              <span>
                កំពុងបង្ហាញកញ្ចប់របាយការណ៍ពេញលេញគ្រប់ <strong>{dvrProfiles.length} DVRs</strong> រួមទាំងរូបថតភ្ជាប់ពេលថ្ងៃ និងពេលយប់។ ចុច <strong>"បោះពុម្ព / Save PDF"</strong> ដើម្បីទាញយកជាឯកសារ PDF ពេញលេញ។
              </span>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shrink-0"
            >
              Print All Pages
            </button>
          </div>

          {dvrProfiles.map((dvr, idx) => {
            const dayImg = dvr.dayScreenshotUrl || generateSampleMonitor(dvr.channelCount, dvr.name, 'day');
            const nightImg = dvr.nightScreenshotUrl || generateSampleMonitor(dvr.channelCount, dvr.name, 'night');

            return (
              <div key={dvr.id} className="break-after-page">
                <ZoneReportSheet
                  dvr={dvr}
                  cameras={dvr.cameras}
                  inspectionDate={inspectionDate}
                  dayScreenshot={dayImg}
                  nightScreenshot={nightImg}
                  pageNumber={idx + 1}
                  isMultiPagePacket
                  onToggleCheck={(camNum, shift) => handlePacketToggleCheck(dvr.id, camNum, shift)}
                  onUpdateDvrCheck={partial => handleUpdateDvrCheck(dvr.id, partial)}
                  onOpenDvrCheckModal={() => handleOpenDvrStatusModal(dvr.id)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add New DVR Modal */}
      {isAddDvrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>បន្ថែម DVR ថ្មី (Add New CCTV DVR)</span>
              </h3>
              <button onClick={() => setIsAddDvrModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDvr} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ឈ្មោះ DVR / តំបន់ (DVR Name e.g. Warehouse 2, Main Gate)
                </label>
                <input
                  type="text"
                  value={newDvrName}
                  onChange={e => setNewDvrName(e.target.value)}
                  placeholder="ឧ. Warehouse 2, Sewing Line 3..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ទីតាំងជាភាសាខ្មែរ (Location in Khmer)
                </label>
                <input
                  type="text"
                  value={newDvrLocationKm}
                  onChange={e => setNewDvrLocationKm(e.target.value)}
                  placeholder="ឧ. ឃ្លាំងស្តុកវត្ថុធាតុដើម #២..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ចំនួន Channels របស់ DVR (Channel Count)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[4, 8, 16, 24, 32, 64].map(ch => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setNewDvrChannelCount(ch)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition border ${
                        newDvrChannelCount === ch
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {ch} CH
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="128"
                  value={newDvrChannelCount}
                  onChange={e => setNewDvrChannelCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  placeholder="Or enter custom number..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDvrModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  បង្កើត DVR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Active DVR Modal */}
      {isEditDvrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>កែប្រែព័ត៌មាន DVR (Edit DVR Profile)</span>
              </h3>
              <button onClick={() => setIsEditDvrModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDvr} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ឈ្មោះ DVR
                </label>
                <input
                  type="text"
                  value={editDvrName}
                  onChange={e => setEditDvrName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ទីតាំងជាភាសាខ្មែរ
                </label>
                <input
                  type="text"
                  value={editDvrLocationKm}
                  onChange={e => setEditDvrLocationKm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ចំនួន Channels របស់ DVR
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[4, 8, 16, 24, 32, 64].map(ch => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setEditDvrChannelCount(ch)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold transition border ${
                        editDvrChannelCount === ch
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {ch} CH
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="128"
                  value={editDvrChannelCount}
                  onChange={e => setEditDvrChannelCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditDvrModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Camera Name Modal */}
      {editingCameraIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white">
                កែប្រែឈ្មោះកាមេរ៉ា CAM {editingCameraIndex + 1}
              </h3>
              <button onClick={() => setEditingCameraIndex(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCameraName} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ឈ្មោះទីតាំងជាភាសាថៃ (Thai Location Name)
                </label>
                <input
                  type="text"
                  value={editCamNameThai}
                  onChange={e => setEditCamNameThai(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ឈ្មោះទីតាំងជាភាសាខ្មែរ (Khmer Location Name)
                </label>
                <input
                  type="text"
                  value={editCamNameKm}
                  onChange={e => setEditCamNameKm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCameraIndex(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit DVR / NVR Recorder Status Modal */}
      {isEditDvrStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Server className="w-5 h-5 text-sky-400" />
                  <span>កែប្រែស្ថានភាពម៉ាស៊ីនថត (Edit DVR/NVR Recorder Status)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  សម្រាប់ {dvrProfiles.find(d => d.id === statusModalDvrId)?.name || 'DVR'} ({dvrProfiles.find(d => d.id === statusModalDvrId)?.locationKm})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDvrStatusModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDvrStatusModal} className="space-y-4">
              {/* Select target DVR */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ជ្រើសរើស DVR ដែលត្រូវកែប្រែ (Target DVR)
                </label>
                <select
                  value={statusModalDvrId}
                  onChange={e => {
                    const id = e.target.value;
                    setStatusModalDvrId(id);
                    const target = dvrProfiles.find(d => d.id === id);
                    if (target) {
                      const c = target.dvrCheck || defaultDVRCheck;
                      setStatusModalOperating(c.operating);
                      setStatusModalDateTime(c.dateTimeConfig);
                      setStatusModalRecordedDays(c.recordedDays);
                      setStatusModalCanPlayback(c.canPlayback);
                      setStatusModalResolution(c.resolution);
                      setStatusModalCapacity(c.harddiskCapacity);
                      setStatusModalDiskCheck(c.diskCheckStatus);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {dvrProfiles.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.channelCount} CH) - {d.locationKm}
                    </option>
                  ))}
                </select>
              </div>

              {/* 1. Operating Status */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  1. ស្ថានភាពដំណើរការម៉ាស៊ីនថត (1. Operating Status)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalOperating('ok')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalOperating === 'ok'
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>☑ ปกติ (Normal / OK)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusModalOperating('issue')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalOperating === 'issue'
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    <span>☒ ไม่ปกติ (Faulty)</span>
                  </button>
                </div>
              </div>

              {/* 2. Date & Time Setting */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  2. ការកំណត់ ថ្ងៃ ខែ ឆ្នាំ និងម៉ោង (2. Date & Time Accuracy)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalDateTime('ok')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalDateTime === 'ok'
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>☑ ปกติ (Accurate)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusModalDateTime('issue')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalDateTime === 'issue'
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    <span>☒ ไม่ปกติ (Desync/Wrong)</span>
                  </button>
                </div>
              </div>

              {/* 3. Recorded Days */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    3. ចំនួនថ្ងៃដែលកត់ត្រាបាន (3. Recorded Days History)
                  </label>
                  <button
                    type="button"
                    onClick={() => setStatusModalRecordedDays(statusModalRecordedDays > 0 ? 0 : 30)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                      statusModalRecordedDays > 0
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-rose-950 text-rose-300 border-rose-700'
                    }`}
                  >
                    {statusModalRecordedDays > 0 ? '✓ បันทึกได้' : '✖ បันทึกไม่ได้'}
                  </button>
                </div>
                {statusModalRecordedDays > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {[7, 15, 30, 45, 60, 90].map(days => (
                        <button
                          type="button"
                          key={days}
                          onClick={() => setStatusModalRecordedDays(days)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                            statusModalRecordedDays === days
                              ? 'bg-sky-600 text-white border-sky-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {days} ថ្ងៃ
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-slate-300 font-medium">បញ្ចូលចំនួនថ្ងៃដោយផ្ទាល់ (Manual input days):</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={statusModalRecordedDays || ''}
                        onChange={e => setStatusModalRecordedDays(parseInt(e.target.value, 10) || 0)}
                        placeholder="......"
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:border-sky-500 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">ថ្ងៃ (Days)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Playback Test */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  4. តេស្តមើល Playback ត្រឡប់ក្រោយ (4. Playback Test)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalCanPlayback(true)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalCanPlayback
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>☑ ได้ (Playback OK)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusModalCanPlayback(false)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      !statusModalCanPlayback
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    <span>☒ ไม่ได้ (Failed)</span>
                  </button>
                </div>
              </div>

              {/* 5. Recording Resolution */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  5. កម្រិតច្បាស់រូបភាព (5. Recording Resolution)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['1280x720', '1280x1024', '1920x1080p', '2560x1440', '3840x2160'].map(res => (
                    <button
                      type="button"
                      key={res}
                      onClick={() => setStatusModalResolution(res)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition ${
                        statusModalResolution === res
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={statusModalResolution}
                  onChange={e => setStatusModalResolution(e.target.value)}
                  placeholder="Or enter custom resolution..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                />
              </div>

              {/* 6. Harddisk Capacity */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  6. ទំហំ Harddisk (6. Harddisk Capacity)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['1 TB', '2 TB', '4 TB', '6 TB', '8 TB', '10 TB', '12TB', '16 TB'].map(cap => (
                    <button
                      type="button"
                      key={cap}
                      onClick={() => setStatusModalCapacity(cap)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition ${
                        statusModalCapacity === cap
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={statusModalCapacity}
                  onChange={e => setStatusModalCapacity(e.target.value)}
                  placeholder="Or enter custom capacity e.g. 2x 8TB..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono mt-1"
                />
              </div>

              {/* 7. Disk Check */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  7. ការត្រួតពិនិត្យ Harddisk (7. Disk Health Check)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalDiskCheck('Checking Disk 100%: OK')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalDiskCheck.includes('OK')
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>☑ Checking Disk 100%: OK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusModalDiskCheck('Checking Disk: Error')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      statusModalDiskCheck.includes('Error')
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    <span>☒ Checking Disk: Error</span>
                  </button>
                </div>
              </div>

              {/* Apply to All Option */}
              <div className="p-3 bg-slate-950/80 border border-sky-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sky-300">
                    អនុវត្តលើ DVR/NVR ទាំងអស់ (Apply to all DVRs)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    ចម្លងការកំណត់ Recorder នេះទៅគ្រប់អង្គភាព DVR ទាំង {dvrProfiles.length}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={statusModalApplyAll}
                  onChange={e => setStatusModalApplyAll(e.target.checked)}
                  className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditDvrStatusModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>រក្សាទុកស្ថានភាព (Save Status)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Zone Sheet Component that matches user's PDF Form + Attached Day/Night Screenshots
interface ZoneReportSheetProps {
  dvr: DVRProfile;
  cameras: SmartReportCamera[];
  inspectionDate: string;
  dayScreenshot: string | null;
  nightScreenshot: string | null;
  pageNumber?: number;
  isMultiPagePacket?: boolean;
  onToggleCheck?: (camNum: number, shift: 'day' | 'night') => void;
  onEditCamera?: (index: number) => void;
  onUpdateDvrCheck?: (partial: Partial<DVRCheckStatus>) => void;
  onOpenDvrCheckModal?: () => void;
}

const ZoneReportSheet: React.FC<ZoneReportSheetProps> = ({
  dvr,
  cameras,
  inspectionDate,
  dayScreenshot,
  nightScreenshot,
  pageNumber,
  isMultiPagePacket,
  onToggleCheck,
  onEditCamera,
  onUpdateDvrCheck,
  onOpenDvrCheckModal,
}) => {
  const workingCount = cameras.filter(c => c.dayStatus === 'ok' && c.nightStatus === 'ok').length;
  const faultyCount = cameras.filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue').length;
  const faultyListStr =
    cameras
      .filter(c => c.dayStatus === 'issue' || c.nightStatus === 'issue')
      .map(c => `CAM ${c.number}`)
      .join(', ') || 'គ្មាន';
  const check: DVRCheckStatus = dvr.dvrCheck || defaultDVRCheck;

  return (
    <div className="bg-white text-slate-950 rounded-2xl shadow-xl overflow-hidden print:p-0 print:m-0 print:border-none print-page border border-slate-300">
      <div className="p-6 sm:p-8 space-y-4 text-xs font-battambang">
        {/* Header (TK Garment Sisophon Co., Ltd.) */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded border-2 border-amber-600 bg-white text-amber-600 font-extrabold text-xl font-serif">
              TK
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-amber-700 leading-none">
                TK Garment
              </h1>
              <p className="text-[11px] font-bold text-slate-700">
                Sisophon Co., Ltd.
              </p>
            </div>
          </div>

          <div className="text-center flex-1 px-4">
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
              ទម្រង់ត្រួតពិនិត្យ CCTV និង DVR សម្រាប់ឆ្នាំ 2026
            </h2>
            <h3 className="text-xs font-semibold text-slate-700">
              แบบฟอร์มตรวจสอบกล้องวงจรปิด และเครื่องบันทึกภาพ ประจำปี 2026
            </h3>
          </div>

          <div className="text-right text-[10px] font-mono border border-slate-400 p-1 rounded bg-slate-50">
            <p className="font-bold text-slate-800">F-IT-002 REW.00 Date 22/03/2024</p>
            {pageNumber && <p className="text-slate-600 mt-0.5">Page {pageNumber}</p>}
          </div>
        </div>

        {/* Zone Name Header */}
        <div className="flex items-center justify-between py-1 px-3 bg-slate-100 font-bold text-sm tracking-wide border border-slate-300 rounded">
          <span>{dvr.name}</span>
          <span className="text-xs font-normal text-slate-600 font-mono">
            {dvr.locationKm} • {dvr.channelCount} Channels
          </span>
        </div>

        {/* Checklist Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-400 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-center font-bold border-b border-slate-400">
                <th className="border border-slate-400 py-1 px-1 w-10">
                  <div>กล้อง</div>
                  <div>ตัวที่</div>
                </th>
                <th className="border border-slate-400 py-1 px-3 text-left">
                  จุดตั้งกล้อง (ទីតាំងកាមេរ៉ា)
                </th>
                <th className="border border-slate-400 py-1 px-2" colSpan={2}>
                  <div>ตอนวัน (វេនថ្ងៃ)</div>
                  <div className="flex justify-around text-[10px] font-normal pt-0.5 border-t border-slate-300">
                    <span>ปกติ</span>
                    <span>ไม่ปกติ</span>
                  </div>
                </th>
                <th className="border border-slate-400 py-1 px-2" colSpan={2}>
                  <div>ตอนคืน (វេនយប់)</div>
                  <div className="flex justify-around text-[10px] font-normal pt-0.5 border-t border-slate-300">
                    <span>ปกติ</span>
                    <span>ไม่ปกติ</span>
                  </div>
                </th>
                {onEditCamera && <th className="border border-slate-400 py-1 px-2 w-8 no-print">កែ</th>}
              </tr>
            </thead>
            <tbody>
              {cameras.map((c, idx) => {
                const isDayOk = c.dayStatus === 'ok';
                const isNightOk = c.nightStatus === 'ok';

                return (
                  <tr
                    key={c.number}
                    className={`border-b border-slate-300 hover:bg-slate-50 ${
                      !isDayOk || !isNightOk ? 'bg-amber-50/70' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="border border-slate-300 py-1 px-1.5 text-center font-mono font-semibold">
                      {c.number}
                    </td>
                    <td className="border border-slate-300 py-1 px-3">
                      <div className="font-medium text-slate-900">{c.nameThai}</div>
                      <div className="text-[10px] text-slate-600 font-normal">{c.nameKm}</div>
                    </td>

                    {/* Day Shift: Normal */}
                    <td
                      className="border border-slate-300 py-1 px-2 text-center w-14 cursor-pointer"
                      onClick={() => onToggleCheck && onToggleCheck(c.number, 'day')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-slate-800 text-xs">{isDayOk ? '☑' : '☐'}</span>
                        <span className="text-[10px] text-slate-600">ปกติ</span>
                      </div>
                    </td>

                    {/* Day Shift: Abnormal */}
                    <td
                      className="border border-slate-300 py-1 px-2 text-center w-16 cursor-pointer"
                      onClick={() => onToggleCheck && onToggleCheck(c.number, 'day')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-bold text-xs ${!isDayOk ? 'text-rose-700' : 'text-slate-800'}`}>
                          {!isDayOk ? '☒' : '☐'}
                        </span>
                        <span className={`text-[10px] ${!isDayOk ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                          ไม่ปกติ
                        </span>
                      </div>
                    </td>

                    {/* Night Shift: Normal */}
                    <td
                      className="border border-slate-300 py-1 px-2 text-center w-14 cursor-pointer"
                      onClick={() => onToggleCheck && onToggleCheck(c.number, 'night')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-slate-800 text-xs">{isNightOk ? '☑' : '☐'}</span>
                        <span className="text-[10px] text-slate-600">ปกติ</span>
                      </div>
                    </td>

                    {/* Night Shift: Abnormal */}
                    <td
                      className="border border-slate-300 py-1 px-2 text-center w-16 cursor-pointer"
                      onClick={() => onToggleCheck && onToggleCheck(c.number, 'night')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-bold text-xs ${!isNightOk ? 'text-rose-700' : 'text-slate-800'}`}>
                          {!isNightOk ? '☒' : '☐'}
                        </span>
                        <span className={`text-[10px] ${!isNightOk ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                          ไม่ปกติ
                        </span>
                      </div>
                    </td>

                    {onEditCamera && (
                      <td className="border border-slate-300 py-1 px-1 text-center no-print">
                        <button onClick={() => onEditCamera(idx)} className="p-0.5 text-slate-400 hover:text-slate-700">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Block */}
        <div className="border border-slate-400 p-2.5 bg-slate-50 space-y-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5">
            <div className="flex items-center gap-4">
              <span className="text-slate-700 font-semibold">หมายเหตุ:</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <span className="text-sm">☑</span> = กล้องวงจรปิดใช้งานได้ปกติ
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-800">
                <span className="text-sm">☒</span> = ที่หน้าจอภาพไม่แสดงภาพจากกล้องวงจรปิด
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-slate-700">กล้องทั้งหมด:</span>{' '}
              <strong className="font-mono text-slate-900">{dvr.channelCount}</strong> ตัว
            </div>
            <div>
              <span className="text-slate-700">- ใช้งานได้ปกติ:</span>{' '}
              <strong className="font-mono text-emerald-700">{workingCount}</strong> ตัว
            </div>
            <div>
              <span className="text-slate-700">- ไม่ปกติ:</span>{' '}
              <strong className="font-mono text-rose-700">{faultyCount}</strong> ตัว
            </div>
          </div>

          <div className="text-[11px]">
            <span className="font-semibold text-slate-800">ระบุตัวที่:</span>{' '}
            <strong className="font-mono text-rose-700 bg-rose-100 px-2 py-0.2 rounded border border-rose-300">
              {faultyListStr}
            </strong>
            <span className="ml-3 font-semibold text-slate-800">อาการ:</span>{' '}
            <span className="text-slate-700">
              {faultyCount > 0 ? 'ที่หน้าจอภาพไม่แสดงภาพจากกล้องวงจรปิด (Black screen)' : 'ใช้งานได้ปกติ 100%'}
            </span>
          </div>
        </div>

        {/* DVR Status Block (Interactive & Editable) */}
        <div className="border border-slate-400 text-[11px] rounded overflow-hidden">
          <div className="bg-slate-100 font-bold p-1.5 border-b border-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold">เครื่องบันทึกภาพ (DVR/NVR Recorder Status)</span>
              {onOpenDvrCheckModal && (
                <button
                  type="button"
                  onClick={onOpenDvrCheckModal}
                  className="no-print px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300 rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="កែប្រែស្ថានភាព Recorder / Edit DVR Recorder Status"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>កែប្រែ (Edit)</span>
                </button>
              )}
            </div>
            <span className="text-[10px] font-normal text-slate-600">
              ចុចលើ Checkbox ដើម្បីប្តូរភ្លាមៗ (Click to Toggle)
            </span>
          </div>
          <div className="divide-y divide-slate-300">
            {/* 1. Operating */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">1. สถานะการทำงานเครื่องบันทึกภาพ</div>
              <div className="col-span-6 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ operating: 'ok' })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.operating === 'ok'
                      ? 'font-bold text-emerald-800 bg-emerald-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.operating === 'ok' ? '☑' : '☐'}</span>
                  <span>ปกติ</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ operating: 'issue' })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.operating === 'issue'
                      ? 'font-bold text-rose-700 bg-rose-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.operating === 'issue' ? '☑' : '☐'}</span>
                  <span>ไม่ปกติ</span>
                </button>
              </div>
            </div>

            {/* 2. Date/Time Config */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">2. การตั้งค่า วัน เดือน ปี និងเวลา</div>
              <div className="col-span-6 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ dateTimeConfig: 'ok' })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.dateTimeConfig === 'ok'
                      ? 'font-bold text-emerald-800 bg-emerald-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.dateTimeConfig === 'ok' ? '☑' : '☐'}</span>
                  <span>ปกติ</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ dateTimeConfig: 'issue' })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.dateTimeConfig === 'issue'
                      ? 'font-bold text-rose-700 bg-rose-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.dateTimeConfig === 'issue' ? '☑' : '☐'}</span>
                  <span>ไม่ปกติ</span>
                </button>
              </div>
            </div>

            {/* 3. Recorded Days (Manual inline input: บันทึกได้ ...... วัน) */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">3. จำนวนวันที่บันทึกได้</div>
              <div className="col-span-6 flex items-center gap-3 flex-wrap">
                <div
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition ${
                    check.recordedDays > 0
                      ? 'font-bold text-slate-900 bg-slate-100 border border-slate-300'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDvrCheck?.({
                        recordedDays: check.recordedDays > 0 ? check.recordedDays : 30,
                      })
                    }
                    className="cursor-pointer flex items-center gap-1 text-slate-900 font-semibold"
                  >
                    <span className="text-xs">{check.recordedDays > 0 ? '☑' : '☐'}</span>
                    <span>บันทึกได้</span>
                  </button>

                  {/* Manual input for days: "บันทึกได้ ...... วัน" */}
                  <span className="inline-flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={check.recordedDays > 0 ? check.recordedDays : ''}
                      placeholder="......"
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, '');
                        const num = digits ? parseInt(digits, 10) : 0;
                        onUpdateDvrCheck?.({ recordedDays: num });
                      }}
                      className="no-print w-14 text-center font-mono font-bold text-xs bg-white border border-slate-400 rounded px-1.5 py-0.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
                      title="បញ្ចូលចំនួនថ្ងៃកត់ត្រា (Manual input days records e.g. 15, 30, 45, 60...)"
                    />
                    <span className="hidden print:inline-block border-b border-dashed border-slate-700 px-2 font-mono font-bold text-center min-w-8">
                      {check.recordedDays > 0 ? check.recordedDays : '......'}
                    </span>
                  </span>
                  <span>วัน</span>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ recordedDays: 0 })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.recordedDays === 0
                      ? 'font-bold text-rose-700 bg-rose-50 border border-rose-300'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.recordedDays === 0 ? '☑' : '☐'}</span>
                  <span>บันทึกไม่ได้</span>
                </button>
              </div>
            </div>

            {/* 4. Playback Test */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">4. ทดสอบการเล่นภาพย้อนหลังที่บันทึก</div>
              <div className="col-span-6 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ canPlayback: true })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.canPlayback
                      ? 'font-bold text-emerald-800 bg-emerald-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.canPlayback ? '☑' : '☐'}</span>
                  <span>ได้</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ canPlayback: false })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    !check.canPlayback
                      ? 'font-bold text-rose-700 bg-rose-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{!check.canPlayback ? '☑' : '☐'}</span>
                  <span>ไม่ได้</span>
                </button>
              </div>
            </div>

            {/* 5. Resolution */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">5. ความละเอียดของภาพที่บันทึก</div>
              <div className="col-span-6 flex flex-wrap items-center gap-3">
                {['1280x720', '1280x1024', '1920x1080p'].map(res => {
                  const isSel = check.resolution === res;
                  return (
                    <button
                      type="button"
                      key={res}
                      onClick={() => onUpdateDvrCheck?.({ resolution: res })}
                      className={`flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded transition ${
                        isSel ? 'font-bold text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-xs">{isSel ? '☑' : '☐'}</span>
                      <span>{res}</span>
                    </button>
                  );
                })}
                {!['1280x720', '1280x1024', '1920x1080p'].includes(check.resolution) && (
                  <button
                    type="button"
                    onClick={() => onOpenDvrCheckModal?.()}
                    className="flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded font-bold text-slate-900 bg-slate-100"
                  >
                    <span className="text-xs">☑</span>
                    <span>{check.resolution}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 6. Harddisk Capacity */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">6. ความจุฮาร์ดดิสก์ (Harddisk Capacity)</div>
              <div className="col-span-6 flex flex-wrap items-center gap-3">
                {['1 TB', '2 TB', '4 TB'].map(cap => {
                  const isSel = check.harddiskCapacity === cap;
                  return (
                    <button
                      type="button"
                      key={cap}
                      onClick={() => onUpdateDvrCheck?.({ harddiskCapacity: cap })}
                      className={`flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded transition ${
                        isSel ? 'font-bold text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-xs">{isSel ? '☑' : '☐'}</span>
                      <span>{cap}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onOpenDvrCheckModal?.()}
                  className={`flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded transition ${
                    !['1 TB', '2 TB', '4 TB'].includes(check.harddiskCapacity)
                      ? 'font-bold text-slate-900 bg-slate-100'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Click to edit custom capacity"
                >
                  <span className="text-xs">
                    {!['1 TB', '2 TB', '4 TB'].includes(check.harddiskCapacity) ? '☑' : '☐'}
                  </span>
                  <span>อื่นๆ ระบุ {!['1 TB', '2 TB', '4 TB'].includes(check.harddiskCapacity) ? check.harddiskCapacity : '12TB'}</span>
                </button>
              </div>
            </div>

            {/* 7. Disk Check */}
            <div className="grid grid-cols-12 p-1.5 items-center hover:bg-slate-50 transition">
              <div className="col-span-6 font-medium text-slate-800">7. ตรวจสอบฮาร์ดดิสก์ (Disk Check)</div>
              <div className="col-span-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ diskCheckStatus: 'Checking Disk 100%: OK' })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.diskCheckStatus.includes('OK')
                      ? 'font-bold text-emerald-800 bg-emerald-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.diskCheckStatus.includes('OK') ? '☑' : '☐'}</span>
                  <span>Checking Disk 100%: OK</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDvrCheck?.({ diskCheckStatus: 'Checking Disk: Error' })}
                  className={`flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded transition ${
                    check.diskCheckStatus.includes('Error')
                      ? 'font-bold text-rose-700 bg-rose-50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{check.diskCheckStatus.includes('Error') ? '☑' : '☐'}</span>
                  <span>Checking Disk: Error</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Date Row */}
        <div className="text-[11px]">
          <span className="font-semibold text-slate-800">ตรวจสอบ วันที่:</span>{' '}
          <span className="font-mono font-bold text-slate-900 border-b border-dashed border-slate-700 px-3">
            {inspectionDate}
          </span>
        </div>

        {/* Signatures Row - NO AUTO FILL SIGN NAMES */}
        <div className="pt-4 grid grid-cols-5 gap-3 text-center text-[10px] border-t border-slate-300 break-inside-avoid">
          <div className="space-y-4">
            <div className="h-8 flex items-end justify-center font-serif text-slate-700 italic"></div>
            <div className="border-t border-dotted border-slate-400 pt-1">
              <p className="font-bold text-slate-800">(IT/ธุรการ)</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 flex items-end justify-center font-serif text-slate-700 italic"></div>
            <div className="border-t border-dotted border-slate-400 pt-1">
              <p className="font-bold text-slate-800">หัวหน้าแผนกช่างซ่อมบำรุง</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 flex items-end justify-center font-serif text-slate-700 italic"></div>
            <div className="border-t border-dotted border-slate-400 pt-1">
              <p className="font-bold text-slate-800">หัวหน้าฝ่ายช่างซ่อมบำรุง</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 flex items-end justify-center font-serif text-slate-700 italic"></div>
            <div className="border-t border-dotted border-slate-400 pt-1">
              <p className="font-bold text-slate-800">(ผู้จัดการ)</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 flex items-end justify-center font-serif text-slate-700 italic"></div>
            <div className="border-t border-dotted border-slate-400 pt-1">
              <p className="font-bold text-slate-800">(ผู้จัดการทั่วไป)</p>
            </div>
          </div>
        </div>

        {/* ATTACHED EVIDENCE SECTION (Matches user requirement: Attached Day & Night Screenshots!) */}
        <div className="pt-6 border-t-2 border-dashed border-slate-400 break-inside-avoid space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-slate-700" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                + {dvr.name} (Attached CCTV Screenshots Evidence)
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Date: {inspectionDate} • {dvr.channelCount} Channels
            </span>
          </div>

          <div className="space-y-4">
            {/* Day Attached Screenshot */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                <span>- Day (រូបភាពត្រួតពិនិត្យពេលថ្ងៃ)</span>
                <span className="text-[10px] text-slate-500 font-normal">SMART PSS Live View</span>
              </div>
              <div className="border-2 border-slate-400 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                {dayScreenshot ? (
                  <img src={dayScreenshot} alt={`${dvr.name} Day Screenshot`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-slate-400 text-xs">[No Day Screenshot Attached]</span>
                )}
              </div>
            </div>

            {/* Night Attached Screenshot */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                <span>- Night (រូបភាពត្រួតពិនិត្យពេលយប់)</span>
                <span className="text-[10px] text-slate-500 font-normal">SMART PSS Playback CPS</span>
              </div>
              <div className="border-2 border-slate-400 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                {nightScreenshot ? (
                  <img src={nightScreenshot} alt={`${dvr.name} Night Screenshot`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-slate-400 text-xs">[No Night Screenshot Attached]</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
