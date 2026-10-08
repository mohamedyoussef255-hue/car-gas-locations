import React from 'react';
import { Station, CongestionLevel } from '../types';
import { CARGAS_FACILITY_META, getCongestionBadge } from '../utils/companyAssets';
import { CARGAS_LOGO_SVG } from '../utils/cargasLogo';
import { speechService } from '../services/speechService';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  X, 
  Fuel, 
  Gauge, 
  Share2,
  Users,
  Volume2,
  Wrench,
  Droplets
} from 'lucide-react';

interface StationDetailSheetProps {
  station: Station;
  distanceKm?: number;
  durationMin?: number;
  onClose: () => void;
  onStartNavigation: (station: Station) => void;
  onUpdateCongestion: (stationId: string, level: CongestionLevel, waitTime: number) => void;
  onOpenSafetyModal: () => void;
}

export const StationDetailSheet: React.FC<StationDetailSheetProps> = ({
  station,
  distanceKm,
  durationMin,
  onClose,
  onStartNavigation,
  onUpdateCongestion,
  onOpenSafetyModal,
}) => {
  const facility = CARGAS_FACILITY_META[station.facilityType] || CARGAS_FACILITY_META.station;
  const congestion = getCongestionBadge(station.congestionLevel, station.waitTimeMinutes);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: station.name,
        text: `${station.name} (كارجاس NGV) - وقت الانتظار: ${station.waitTimeMinutes} دقيقة`,
        url: googleMapsUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${station.name}: ${googleMapsUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Speak station description out loud (helps non-readers)
  const handleSpeakDetails = () => {
    speechService.playChime('turn');
    const text = station.voiceGuideText || `
      ${station.name}. على بعد ${distanceKm?.toFixed(1) || ''} كيلو. 
      حالة الزحام ${station.congestionLevel === 'low' ? 'خفيف ورايق' : 'متوسط'}.
      وقت الانتظار المتوقع ${station.waitTimeMinutes} دقيقة.
      دوس على الزر الأخضر الكبير عشان نبدأ الملاحة فوراً!
    `;
    speechService.speak(text, { priority: true });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[900] p-2 md:p-5 pointer-events-none animate-in slide-in-from-bottom-8 duration-300">
      <div className="pointer-events-auto max-w-xl mx-auto w-full bg-slate-900/98 border-2 border-emerald-500/60 rounded-3xl shadow-2xl backdrop-blur-2xl p-4 md:p-6 text-white max-h-[85vh] overflow-y-auto">
        {/* Header with Official Cargas NGV Logo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Cargas NGV Emblem */}
            <div className="w-14 h-14 rounded-full bg-white p-1 border-2 border-emerald-500 shadow-xl shrink-0 overflow-hidden flex items-center justify-center">
              {station.customLogoUrl ? (
                <img src={station.customLogoUrl} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${facility.badgeBg}`}>
                  {facility.title}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  كارجاس معتمدة
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black mt-1 text-white leading-snug">
                {station.name}
              </h2>
              {/* Composite Facility Badges for this Station */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {station.cng && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">⛽ تموين غاز</span>}
                {station.conversionCenter && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-bold">🛠️ تحويل وصيانة</span>}
                {station.oilCenter && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700 font-bold">🛢️ زيوت معتمدة</span>}
                {station.cylinderInspection && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold">🔍 فحص واختبار أسطوانات</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Big Audio Read Button (For Non-Readers) */}
        <div className="mt-3">
          <button
            onClick={handleSpeakDetails}
            className="w-full py-2.5 px-4 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-xs md:text-sm text-emerald-300 font-black cursor-pointer shadow"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>🔊 اسمع تفاصيل المحطة بصوت مُعين (بدون قراءة)</span>
            </div>
            <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-lg">استمع</span>
          </button>
        </div>

        {/* Address & Distance */}
        <div className="mt-3 text-xs text-slate-300 flex items-start gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-relaxed font-bold">{station.address}</p>
            {distanceKm !== undefined && (
              <div className="mt-1 flex items-center gap-3 text-emerald-400 font-black">
                <span>المسافة: {distanceKm.toFixed(1)} كم</span>
                <span>•</span>
                <span>زمن الوصول: {durationMin} دقيقة تقريباً</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Congestion & Capabilities */}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          {/* Crowd Status */}
          <div className={`p-3 rounded-2xl border ${congestion.color} flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">حالة الزحام</span>
              <span className={`w-2.5 h-2.5 rounded-full ${congestion.dotColor} animate-ping`}></span>
            </div>
            <div className="mt-1">
              <div className="text-sm font-black">{congestion.label}</div>
              <div className="text-xs opacity-90">{congestion.timeText}</div>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>طاقة التموين والضغط</span>
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1">
              <div className="text-sm font-black text-emerald-300">
                {station.cngNozzles} مسدسات غاز طبيعي
              </div>
              <div className="text-xs text-slate-400">
                ضغط: {station.pressureBar || 220} بار
              </div>
            </div>
          </div>
        </div>

        {/* Cargas Services Badges */}
        <div className="mt-3.5">
          <div className="text-xs font-bold text-slate-400 mb-2">خدمات كارجاس المتوفرة بالموقع:</div>
          <div className="flex flex-wrap gap-1.5">
            {station.cng && (
              <span className="text-xs bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                تموين غاز طبيعي
              </span>
            )}
            {station.conversionCenter && (
              <span className="text-xs bg-amber-600/30 text-amber-300 border border-amber-500/50 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" />
                مركز تحويل وصيانة غاز
              </span>
            )}
            {station.oilCenter && (
              <span className="text-xs bg-blue-600/30 text-blue-300 border border-blue-500/50 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                زيوت معتمدة (BP / Castrol)
              </span>
            )}
            {station.cylinderInspection && (
              <span className="text-xs bg-purple-600/30 text-purple-300 border border-purple-500/50 px-2.5 py-1 rounded-xl font-bold">
                🔍 فحص واختبار أسطوانات
              </span>
            )}
          </div>
        </div>

        {/* GIANT 1-TAP START NAVIGATION BUTTON (For Drivers / Non-Readers) */}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => onStartNavigation(station)}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-base md:text-lg rounded-2xl shadow-2xl shadow-emerald-950/80 flex items-center justify-center gap-3 cursor-pointer transition transform active:scale-98 border-2 border-emerald-400"
          >
            <Navigation className="w-7 h-7 text-amber-300 animate-bounce" />
            <span>ابدأ الملاحة فوراً (إرشاد صوتي) 🚀</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Google Maps</span>
            </a>

            {station.phone && (
              <a
                href={`tel:${station.phone}`}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>اتصال بالمحطة</span>
              </a>
            )}

            <button
              onClick={handleShare}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-slate-300" />
              <span>{copied ? 'تم النسخ!' : 'مشاركة الموقع'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
