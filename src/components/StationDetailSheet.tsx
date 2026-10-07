import React from 'react';
import { Station, CongestionLevel } from '../types';
import { COMPANY_BRANDS, getCongestionBadge } from '../utils/companyAssets';
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
  AlertCircle,
  Share2,
  Users
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
  const brand = COMPANY_BRANDS[station.company] || COMPANY_BRANDS['أخرى'];
  const congestion = getCongestionBadge(station.congestionLevel, station.waitTimeMinutes);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: station.name,
        text: `محطة غاز طبيعي: ${station.name} (${station.company}) - وقت الانتظار: ${station.waitTimeMinutes} دقيقة`,
        url: googleMapsUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${station.name}: ${googleMapsUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[900] p-3 md:p-6 pointer-events-none animate-in slide-in-from-bottom-8 duration-300">
      <div className="pointer-events-auto max-w-xl mx-auto w-full bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-2xl p-5 text-white max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg border border-white/20"
              style={{ backgroundColor: brand.markerColor }}
            >
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${brand.badgeBg}`}>
                  {station.company}
                </span>
                {station.verified && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    محطة غاز موثقة 100%
                  </span>
                )}
              </div>
              <h2 className="text-lg md:text-xl font-bold mt-1 text-white">
                {station.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Address & Travel Info */}
        <div className="mt-3 text-xs text-slate-300 flex items-start gap-2 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-relaxed">{station.address}</p>
            {distanceKm !== undefined && (
              <div className="mt-1 flex items-center gap-3 text-emerald-400 font-semibold">
                <span>المسافة: {distanceKm.toFixed(1)} كم</span>
                <span>•</span>
                <span>زمن الوصول التقديري: {durationMin} دقيقة</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Congestion Status & Nozzles */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Crowd Card */}
          <div className={`p-3 rounded-2xl border ${congestion.color} flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">حالة الزحام الحالية</span>
              <span className={`w-2.5 h-2.5 rounded-full ${congestion.dotColor} animate-ping`}></span>
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold">{congestion.label}</div>
              <div className="text-xs opacity-90 mt-0.5">{congestion.timeText}</div>
            </div>
          </div>

          {/* Technical Specs Card */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>نقاط التموين والضغط</span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-sm font-bold text-cyan-300">
                {station.cngNozzles} مسدسات غاز طبيعي
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                ضغط الغاز: {station.pressureBar || 220} بار
              </div>
            </div>
          </div>
        </div>

        {/* Available Fuels & Services */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-400 mb-2">أنواع الوقود والخدمات المتاحة بالمحطة:</div>
          <div className="flex flex-wrap gap-1.5">
            {station.cng && (
              <span className="text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-xl font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                غاز طبيعي مضغوط (CNG)
              </span>
            )}
            {station.petrol && (
              <span className="text-xs bg-blue-600/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-xl font-medium">
                بنزين (92 / 95)
              </span>
            )}
            {station.conversionCenter && (
              <span className="text-xs bg-amber-600/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl font-medium">
                🛠️ مركز تحويل وصيانة غاز
              </span>
            )}
            {station.cylinderInspection && (
              <span className="text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-xl font-medium">
                🔍 فحص أسطوانات دوري
              </span>
            )}
            {station.services.map((srv, idx) => (
              <span key={idx} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-xl">
                {srv}
              </span>
            ))}
          </div>
        </div>

        {/* Quick User Crowd Update Buttons */}
        <div className="mt-4 p-3 bg-slate-800/40 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              تحديث الزحام لحظياً لمساعدة السائقين:
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onUpdateCongestion(station.id, 'low', 3)}
              className="py-1.5 px-2 rounded-xl text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 cursor-pointer"
            >
              🟢 رايقة (2-5 د)
            </button>
            <button
              onClick={() => onUpdateCongestion(station.id, 'medium', 10)}
              className="py-1.5 px-2 rounded-xl text-xs font-bold bg-amber-950/60 text-amber-400 border border-amber-800 hover:bg-amber-900 cursor-pointer"
            >
              🟡 متوسطة (10 د)
            </button>
            <button
              onClick={() => onUpdateCongestion(station.id, 'high', 25)}
              className="py-1.5 px-2 rounded-xl text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-800 hover:bg-rose-900 cursor-pointer"
            >
              🔴 زحمة (20+ د)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          {/* Start Voice Navigation Button */}
          <button
            onClick={() => onStartNavigation(station)}
            className="flex-1 py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
          >
            <Navigation className="w-5 h-5 animate-bounce" />
            <span>بدء الإرشاد والملاحة الصوتية</span>
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold"
              title="فتح في Google Maps"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Google Maps</span>
            </a>

            {station.phone && (
              <a
                href={`tel:${station.phone}`}
                className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 flex items-center justify-center cursor-pointer"
                title="اتصال بالمحطة"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </a>
            )}

            <button
              onClick={handleShare}
              className="p-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 flex items-center justify-center cursor-pointer"
              title="مشاركة موقع المحطة"
            >
              <Share2 className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={onOpenSafetyModal}
              className="p-3.5 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/40 text-amber-300 rounded-2xl flex items-center justify-center cursor-pointer text-xs font-bold gap-1"
              title="إرشادات السلامة (نظام STOP)"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>نظام STOP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
