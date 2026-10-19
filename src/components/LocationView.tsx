import React, { useState } from 'react';
import { Camera, LocationZone, Language, CameraType, CameraStatus } from '../types';
import { translations } from '../i18n/translations';
import {
  Building2,
  Video,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Search,
  Eye,
  Shield,
  Layers,
  ArrowLeft,
  X,
  Server,
  Activity,
} from 'lucide-react';

interface LocationViewProps {
  locations: LocationZone[];
  cameras: Camera[];
  lang: Language;
  initialSelectedLocationId?: string;
  onUpdateLocations: (locations: LocationZone[]) => void;
  onUpdateCameras: (cameras: Camera[]) => void;
  onPreviewCamera: (camera: Camera) => void;
}

export const LocationView: React.FC<LocationViewProps> = ({
  locations,
  cameras,
  lang,
  initialSelectedLocationId,
  onUpdateLocations,
  onUpdateCameras,
  onPreviewCamera,
}) => {
  const t = translations[lang];

  const [selectedLocId, setSelectedLocId] = useState<string | null>(
    initialSelectedLocationId || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationZone | null>(null);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);

  // Form states for Location
  const [locCode, setLocCode] = useState('');
  const [locNameKm, setLocNameKm] = useState('');
  const [locNameEn, setLocNameEn] = useState('');
  const [locArea, setLocArea] = useState('');
  const [locDescKm, setLocDescKm] = useState('');
  const [locDescEn, setLocDescEn] = useState('');

  // Form states for Camera
  const [camCode, setCamCode] = useState('');
  const [camNameKm, setCamNameKm] = useState('');
  const [camNameEn, setCamNameEn] = useState('');
  const [camIp, setCamIp] = useState('192.168.10.');
  const [camModel, setCamModel] = useState('Hikvision DS-2CD2T47G2');
  const [camType, setCamType] = useState<CameraType>('bullet');
  const [camStatus, setCamStatus] = useState<CameraStatus>('working');
  const [camNotes, setCamNotes] = useState('');

  // Filtered locations
  const filteredLocations = locations.filter(loc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.code.toLowerCase().includes(q) ||
      loc.nameKm.toLowerCase().includes(q) ||
      loc.nameEn.toLowerCase().includes(q) ||
      loc.floorOrArea.toLowerCase().includes(q)
    );
  });

  const selectedLocation = locations.find(l => l.id === selectedLocId);
  const selectedLocationCameras = selectedLocId
    ? cameras.filter(c => c.locationId === selectedLocId)
    : [];

  // Open Location Modal
  const handleOpenLocationModal = (loc?: LocationZone) => {
    if (loc) {
      setEditingLocation(loc);
      setLocCode(loc.code);
      setLocNameKm(loc.nameKm);
      setLocNameEn(loc.nameEn);
      setLocArea(loc.floorOrArea);
      setLocDescKm(loc.descriptionKm);
      setLocDescEn(loc.descriptionEn);
    } else {
      setEditingLocation(null);
      const nextNum = locations.length + 1;
      setLocCode(`LOC-${nextNum < 10 ? '0' : ''}${nextNum}`);
      setLocNameKm('');
      setLocNameEn('');
      setLocArea('');
      setLocDescKm('');
      setLocDescEn('');
    }
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locNameKm.trim() && !locNameEn.trim()) return;

    if (editingLocation) {
      const updated = locations.map(l =>
        l.id === editingLocation.id
          ? {
              ...l,
              code: locCode,
              nameKm: locNameKm,
              nameEn: locNameEn,
              floorOrArea: locArea,
              descriptionKm: locDescKm,
              descriptionEn: locDescEn,
            }
          : l
      );
      onUpdateLocations(updated);
    } else {
      const newLoc: LocationZone = {
        id: `loc-${Date.now()}`,
        code: locCode,
        nameKm: locNameKm || locNameEn,
        nameEn: locNameEn || locNameKm,
        floorOrArea: locArea || 'General Zone',
        descriptionKm: locDescKm,
        descriptionEn: locDescEn,
        icon: 'Building2',
        targetCamerasCount: 3,
      };
      onUpdateLocations([...locations, newLoc]);
    }
    setIsLocationModalOpen(false);
  };

  const handleDeleteLocation = (locId: string) => {
    if (window.confirm(t.deleteConfirm)) {
      onUpdateLocations(locations.filter(l => l.id !== locId));
      if (selectedLocId === locId) setSelectedLocId(null);
    }
  };

  // Open Camera Modal
  const handleOpenCameraModal = (cam?: Camera) => {
    if (cam) {
      setEditingCamera(cam);
      setCamCode(cam.code);
      setCamNameKm(cam.nameKm);
      setCamNameEn(cam.nameEn);
      setCamIp(cam.ipAddress);
      setCamModel(cam.model);
      setCamType(cam.type);
      setCamStatus(cam.status);
      setCamNotes(cam.notes || '');
    } else {
      setEditingCamera(null);
      const nextNum = cameras.length + 1;
      setCamCode(`CAM-${nextNum < 10 ? '0' : ''}${nextNum}`);
      setCamNameKm('');
      setCamNameEn('');
      setCamIp(`192.168.10.${10 + nextNum}`);
      setCamModel('Hikvision DS-2CD2T47G2');
      setCamType('bullet');
      setCamStatus('working');
      setCamNotes('');
    }
    setIsCameraModalOpen(true);
  };

  const handleSaveCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocId) return;

    if (editingCamera) {
      const updated = cameras.map(c =>
        c.id === editingCamera.id
          ? {
              ...c,
              code: camCode,
              nameKm: camNameKm,
              nameEn: camNameEn,
              ipAddress: camIp,
              model: camModel,
              type: camType,
              status: camStatus,
              notes: camNotes,
            }
          : c
      );
      onUpdateCameras(updated);
    } else {
      const newCam: Camera = {
        id: `cam-${Date.now()}`,
        code: camCode,
        nameKm: camNameKm || camNameEn,
        nameEn: camNameEn || camNameKm,
        locationId: selectedLocId,
        ipAddress: camIp,
        model: camModel,
        type: camType,
        status: camStatus,
        installDate: new Date().toISOString().slice(0, 10),
        notes: camNotes,
      };
      onUpdateCameras([...cameras, newCam]);
    }
    setIsCameraModalOpen(false);
  };

  const handleDeleteCamera = (camId: string) => {
    if (window.confirm(lang === 'km' ? 'តើអ្នកចង់លុបកាមេរ៉ានេះមែនទេ?' : 'Delete this camera?')) {
      onUpdateCameras(cameras.filter(c => c.id !== camId));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>{t.locationTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {selectedLocation
              ? `${selectedLocation.code}: ${lang === 'km' ? selectedLocation.nameKm : selectedLocation.nameEn}`
              : t.locationTitle}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {selectedLocation
              ? selectedLocation.floorOrArea
              : `${locations.length} ${lang === 'km' ? 'តំបន់សរុប • គ្របដណ្តប់ ១០០% នៃស្ថាប័ន' : 'zones mapped across entire facility'}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedLocation ? (
            <button
              onClick={() => setSelectedLocId(null)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'km' ? 'ត្រឡប់ទៅតំបន់ទាំង ១៣' : 'Back to Zones'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenLocationModal()}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewLocation}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View: Either Drill-down into a Location or Show All 13 Zones */}
      {!selectedLocation ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'km' ? 'ស្វែងរកតំបន់ ឬជាន់...' : 'Search zones by name or code...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* 13 Zones Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map(loc => {
              const locCams = cameras.filter(c => c.locationId === loc.id);
              const healthyCount = locCams.filter(c => c.status === 'working').length;
              const issueCount = locCams.filter(c => c.status === 'faulty' || c.status === 'offline').length;
              const isAllOk = issueCount === 0;

              return (
                <div
                  key={loc.id}
                  className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                        {loc.code}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenLocationModal(loc)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title={t.editLocation}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {locations.length > 13 && (
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title={t.deleteLocation}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-white group-hover:text-sky-300 transition">
                      {lang === 'km' ? loc.nameKm : loc.nameEn}
                    </h3>
                    <p className="text-xs text-sky-400/80 font-medium mt-0.5">
                      {loc.floorOrArea}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {lang === 'km' ? loc.descriptionKm : loc.descriptionEn}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 font-mono flex items-center gap-1">
                        <Video className="w-3.5 h-3.5 text-slate-500" />
                        {locCams.length} {lang === 'km' ? 'កាមេរ៉ា' : 'cams'}
                      </span>
                      {isAllOk ? (
                        <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {healthyCount} {t.healthyCount}
                        </span>
                      ) : (
                        <span className="text-rose-400 text-[11px] font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {issueCount} {t.problemCount}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedLocId(loc.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-sky-600 hover:text-white text-sky-400 rounded-lg text-xs font-semibold transition"
                    >
                      {t.viewCameras}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed View of Cameras inside Selected Zone */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-sky-400 bg-sky-950 px-2.5 py-1 rounded border border-sky-800">
                {selectedLocation.code}
              </span>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {lang === 'km' ? selectedLocation.nameKm : selectedLocation.nameEn}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedLocationCameras.length} {lang === 'km' ? 'កាមេរ៉ាបានដំឡើងក្នុងតំបន់នេះ' : 'cameras registered in this zone'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenCameraModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewCamera}</span>
            </button>
          </div>

          {/* Cameras Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
                  <tr>
                    <th className="py-3 px-4">{t.cameraCode}</th>
                    <th className="py-3 px-4">{t.cameraName}</th>
                    <th className="py-3 px-4">{t.ipAddress}</th>
                    <th className="py-3 px-4">{t.cameraType}</th>
                    <th className="py-3 px-4">{t.model}</th>
                    <th className="py-3 px-4">{t.status}</th>
                    <th className="py-3 px-4 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedLocationCameras.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        {t.noDataFound}
                      </td>
                    </tr>
                  ) : (
                    selectedLocationCameras.map(cam => {
                      const isWorking = cam.status === 'working';
                      const isFaulty = cam.status === 'faulty';
                      const isOffline = cam.status === 'offline';

                      return (
                        <tr key={cam.id} className="hover:bg-slate-850/50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                            {cam.code}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                            <div>{lang === 'km' ? cam.nameKm : cam.nameEn}</div>
                            {cam.notes && (
                              <div className="text-[11px] text-amber-400/90 font-normal">
                                {cam.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {cam.ipAddress}
                          </td>
                          <td className="py-3 px-4 uppercase font-mono text-slate-400 whitespace-nowrap">
                            {cam.type}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{cam.model}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isWorking
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : isFaulty
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isWorking
                                    ? 'bg-emerald-400'
                                    : isFaulty
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400 animate-pulse'
                                }`}
                              />
                              {isWorking
                                ? t.normal
                                : isFaulty
                                ? t.abnormal
                                : t.offline}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onPreviewCamera(cam)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition"
                                title={t.cameraPreview}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenCameraModal(cam)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                title={t.editLocation}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCamera(cam.id)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition"
                                title={t.deleteLocation}
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
        </div>
      )}

      {/* Modal: Add/Edit Location */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white">
                {editingLocation ? t.editLocation : t.addNewLocation}
              </h3>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.locationCode}
                  </label>
                  <input
                    type="text"
                    value={locCode}
                    onChange={e => setLocCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.areaCategory}
                  </label>
                  <input
                    type="text"
                    value={locArea}
                    onChange={e => setLocArea(e.target.value)}
                    placeholder="ឧ. ជាន់ផ្ទាល់ដី / ព្រំប្រទល់ខាងក្រៅ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.locationNameKm}
                </label>
                <input
                  type="text"
                  value={locNameKm}
                  onChange={e => setLocNameKm(e.target.value)}
                  placeholder="ឈ្មោះជាភាសាខ្មែរ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.locationNameEn}
                </label>
                <input
                  type="text"
                  value={locNameEn}
                  onChange={e => setLocNameEn(e.target.value)}
                  placeholder="Name in English"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.description}
                </label>
                <textarea
                  value={locDescKm}
                  onChange={e => setLocDescKm(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Camera */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base text-white">
                {editingCamera ? 'កែប្រែកាមេរ៉ា (Edit Camera)' : t.addNewCamera}
              </h3>
              <button
                onClick={() => setIsCameraModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCamera} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.cameraCode}
                  </label>
                  <input
                    type="text"
                    value={camCode}
                    onChange={e => setCamCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.ipAddress}
                  </label>
                  <input
                    type="text"
                    value={camIp}
                    onChange={e => setCamIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'km' ? 'ឈ្មោះកាមេរ៉ា (ខ្មែរ)' : 'Camera Name (KM)'}
                  </label>
                  <input
                    type="text"
                    value={camNameKm}
                    onChange={e => setCamNameKm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {lang === 'km' ? 'ឈ្មោះកាមេរ៉ា (អង់គ្លេស)' : 'Camera Name (EN)'}
                  </label>
                  <input
                    type="text"
                    value={camNameEn}
                    onChange={e => setCamNameEn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.cameraType}
                  </label>
                  <select
                    value={camType}
                    onChange={e => setCamType(e.target.value as CameraType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="bullet">Bullet (កាំភ្លើង)</option>
                    <option value="dome">Dome (ស្វ៊ែរ)</option>
                    <option value="ptz">PTZ (បង្វិល និងពង្រីក)</option>
                    <option value="fisheye">Fisheye 360°</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.status}
                  </label>
                  <select
                    value={camStatus}
                    onChange={e => setCamStatus(e.target.value as CameraStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="working">{t.normal}</option>
                    <option value="faulty">{t.abnormal}</option>
                    <option value="offline">{t.offline}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.model}
                </label>
                <input
                  type="text"
                  value={camModel}
                  onChange={e => setCamModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.notes}
                </label>
                <input
                  type="text"
                  value={camNotes}
                  onChange={e => setCamNotes(e.target.value)}
                  placeholder="ចំណាំបន្ថែមពីកាមេរ៉ានេះ..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
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
