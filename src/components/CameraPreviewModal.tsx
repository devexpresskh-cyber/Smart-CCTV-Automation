import React from 'react';
import { Camera, LocationZone, Language } from '../types';
import { translations } from '../i18n/translations';
import { X, Video, AlertTriangle, ShieldCheck, RefreshCw, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react';

interface CameraPreviewModalProps {
  camera: Camera | null;
  location?: LocationZone;
  lang: Language;
  onClose: () => void;
}

export const CameraPreviewModal: React.FC<CameraPreviewModalProps> = ({
  camera,
  location,
  lang,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [nightMode, setNightMode] = React.useState(false);
  const [timestamp, setTimestamp] = React.useState(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!camera) return null;
  const t = translations[lang];

  const locName = location
    ? lang === 'km'
      ? location.nameKm
      : location.nameEn
    : 'Zone';

  const isOffline = camera.status === 'offline';
  const isFaulty = camera.status === 'faulty';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-base">{camera.code}</span>
                <span className="text-slate-300 text-sm font-medium">
                  {lang === 'km' ? camera.nameKm : camera.nameEn}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${
                    camera.status === 'working'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : camera.status === 'faulty'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {t[`status_${camera.status === 'working' ? 'resolved' : 'reported'}` as keyof typeof t] || camera.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{locName}</span>
                <span>•</span>
                <span className="font-mono">{camera.ipAddress}</span>
                <span>•</span>
                <span>{camera.model}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Simulation */}
        <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center select-none">
          {/* Scanlines / Noise overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />

          {/* If Offline */}
          {isOffline ? (
            <div className="text-center p-8 z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white tracking-widest font-mono">
                NO VIDEO SIGNAL
              </h4>
              <p className="text-slate-400 text-sm mt-2">
                {lang === 'km'
                  ? 'បាត់បង់សញ្ញាពីកាមេរ៉ា ឬដាច់ខ្សែបណ្តាញ Network'
                  : 'Lost connection to RTSP stream. Check switch PoE or fiber link.'}
              </p>
              <div className="mt-4 inline-block font-mono text-xs text-rose-400 bg-rose-950/60 px-3 py-1 rounded border border-rose-800">
                ERROR: 504 GATEWAY TIMEOUT (IP: {camera.ipAddress})
              </div>
            </div>
          ) : isFaulty ? (
            /* Faulty Simulation (e.g. blurred or night fail) */
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                className={`absolute inset-0 bg-cover bg-center transition-all ${
                  nightMode ? 'filter brightness-30 contrast-125' : 'filter blur-sm brightness-85'
                }`}
                style={{
                  backgroundImage: `radial-gradient(circle at center, #1e293b 0%, #020617 100%)`,
                }}
              >
                {/* Visual grid simulating facility room */}
                <div className="w-full h-full opacity-40 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-500">
                    <p className="font-mono text-sm">[STREAM HARDWARE MALFUNCTION]</p>
                    <p className="text-xs text-amber-400 mt-2">{camera.notes || 'Sensor / Lens aberration detected'}</p>
                  </div>
                </div>
              </div>
              <div className="z-10 bg-amber-950/80 border border-amber-600/50 p-4 rounded-xl text-center max-w-md mx-4">
                <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <h5 className="font-semibold text-amber-200 text-sm">
                  {lang === 'km' ? 'កាមេរ៉ាស្ថិតក្នុងស្ថានភាពមានបញ្ហា' : 'Degraded Feed Quality'}
                </h5>
                <p className="text-xs text-amber-300/80 mt-1">{camera.notes}</p>
              </div>
            </div>
          ) : (
            /* Normal Working Camera Simulation */
            <div
              className={`relative w-full h-full flex items-center justify-center transition-all duration-300 ${
                nightMode ? 'bg-slate-950 filter grayscale contrast-150' : 'bg-slate-800'
              }`}
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Simulated camera background graphics representing real facility */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
              
              <div className="z-0 text-center select-none pointer-events-none">
                <div className="w-32 h-32 mx-auto rounded-full border border-sky-500/20 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border border-sky-500/40 flex items-center justify-center animate-pulse">
                    <ShieldCheck className="w-10 h-10 text-sky-400/60" />
                  </div>
                </div>
                <p className="mt-3 font-mono text-xs text-sky-400/80 tracking-widest uppercase">
                  ACTIVE RTSP H.265+ STREAM (60 FPS)
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  {locName} • {camera.type.toUpperCase()} LENS
                </p>
              </div>
            </div>
          )}

          {/* OSD Overlays */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 font-mono text-xs text-emerald-400 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            <span className="font-bold text-rose-500">REC</span>
            <span className="text-slate-400">|</span>
            <span>{camera.code}</span>
            <span className="text-slate-400">|</span>
            <span className="text-white">{timestamp}</span>
          </div>

          <div className="absolute top-4 right-4 z-20 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 font-mono text-xs text-slate-300 backdrop-blur-xs">
            {locName} • CH-{camera.code.replace('CAM-', '')}
          </div>

          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/60 px-3 py-1 rounded border border-white/10 font-mono text-[11px] text-slate-400">
            <span>BITRATE: {isOffline ? '0 kbps' : '4096 kbps'}</span>
            <span>•</span>
            <span>RES: 2560x1440 2K</span>
          </div>

          {/* PTZ and Night Vision Overlay Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-black/70 p-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
            <button
              onClick={() => setNightMode(!nightMode)}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition ${
                nightMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle Infrared IR"
            >
              {nightMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="font-mono text-[10px]">IR</span>
            </button>

            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.0))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 1.0))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {camera.type === 'ptz' && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
                <button className="p-1 hover:bg-slate-700 rounded text-slate-300">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-slate-700 rounded text-slate-300">
                  <ArrowDown className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-slate-700 rounded text-slate-300">
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button className="p-1 hover:bg-slate-700 rounded text-slate-300">
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            {lang === 'km'
              ? 'ម៉ាស៊ីនថតភ្ជាប់ជាមួយ NVR 32-Channel Rack 1 ក្នុងបន្ទប់ Server'
              : 'Connected to Primary Enterprise NVR Vault 01 (Rack 2, Port 14)'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
