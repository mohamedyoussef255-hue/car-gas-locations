import React, { useState, useEffect, useRef } from 'react';
import { CargasFacilityType, AppConfig } from '../types';
import { CARGAS_LOGO_SVG } from '../utils/cargasLogo';
import { 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  X, 
  MapPin, 
  Wrench, 
  Droplets, 
  Search, 
  Fuel, 
  Building2,
  Locate
} from 'lucide-react';
import { MapStyleType } from './MapComponent';

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFacility: CargasFacilityType | 'all';
  onSelectFacility: (fac: CargasFacilityType | 'all') => void;
  filterLowCrowd: boolean;
  onToggleLowCrowd: () => void;
  mapStyle: MapStyleType;
  onChangeMapStyle: (style: MapStyleType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSafetyModal: () => void;
  onOpenNationwideModal: () => void;
  onSecretAdminTrigger: () => void;
  onVoiceQuery: (query: string) => void;
  onFindNearest: () => void;
  onLocateMe?: () => void;
  config: AppConfig;
  isGpsActive?: boolean;
  onToggleGpsTracking?: () => void;
  isListeningVoice?: boolean;
  onToggleDirectVoice?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedFacility,
  onSelectFacility,
  filterLowCrowd,
  onToggleLowCrowd,
  mapStyle,
  onChangeMapStyle,
  isMuted,
  onToggleMute,
  onOpenSafetyModal,
  onOpenNationwideModal,
  onSecretAdminTrigger,
  onVoiceQuery,
  onFindNearest,
  onLocateMe,
  config,
  isGpsActive = false,
  onToggleGpsTracking,
  isListeningVoice = false,
  onToggleDirectVoice,
}) => {
  // 5-tap secret admin trigger & single-tap nationwide statement
  const [tapCount, setTapCount] = useState<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  // Voice recognition states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleLogoTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);

    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

    if (nextCount >= 5) {
      setTapCount(0);
      onSecretAdminTrigger();
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        if (nextCount === 1) {
          onOpenNationwideModal();
        }
        setTapCount(0);
      }, 350);
    }
  };

  // Direct voice recognition toggle without opening any window
  const handleToggleVoice = () => {
    if (onToggleDirectVoice) {
      onToggleDirectVoice();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onVoiceQuery(searchQuery.trim());
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-[700] p-2 md:p-3 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Optional Admin Notice Banner */}
        {config.headerNoticeText && (
          <div className="pointer-events-auto bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs py-1.5 px-4 rounded-2xl shadow-xl text-center flex items-center justify-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm">📢</span>
            <span>{config.headerNoticeText}</span>
          </div>
        )}

        {/* Main Floating Header Card */}
        <div className="pointer-events-auto bg-white/98 text-slate-900 border-2 border-emerald-600/40 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-xl p-2.5 md:p-3 flex items-center justify-between gap-2 transition">
          {/* Official Cargas Emblem Logo & 5-Tap Admin Trigger */}
          <button
            onClick={handleLogoTap}
            className="flex items-center gap-2 select-none active:scale-95 transition cursor-pointer shrink-0 group"
            title="كارجاس - انقر للدليل أو 5 مرات للدخول كمدير"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full shadow-md border-2 border-emerald-600 overflow-hidden bg-white p-0.5">
              <div className="w-full h-full flex items-center justify-center">
                {config.customAppLogoUrl ? (
                  <img
                    src={config.customAppLogoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                )}
              </div>
              {tapCount > 1 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-bounce">
                  {tapCount}
                </span>
              )}
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-xs font-black text-emerald-800 leading-tight">
                {config.appTitle}
              </div>
              {/* Slogan on two lines: كارجاس / طريقنا واحد */}
              <div className="text-[10px] font-bold text-slate-500 leading-tight whitespace-pre-line">
                {config.sloganText || 'كارجاس\nطريقنا واحد'}
              </div>
            </div>
          </button>

          {/* Accessible Large Voice Dictation & Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="قول اسم المحطة بالصوت أو اكتب..."
              className="w-full pr-9 pl-20 py-2 rounded-2xl bg-slate-100 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-emerald-600 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none transition shadow-inner"
            />
            
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-16 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Quick Locate Me Icon next to Mic */}
            {onLocateMe && (
              <button
                type="button"
                onClick={onToggleGpsTracking || onLocateMe}
                className={`absolute left-9 p-1.5 rounded-xl transition cursor-pointer shadow ${
                  isGpsActive
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 animate-pulse shadow-emerald-500/50'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-emerald-700'
                }`}
                title={isGpsActive ? "🛰️ نظام تتبع GPS نشط ومستمر (انقر لإيقاف التتبع أو التحديث)" : "تحديد وتتبع موقعي الحالي بدقة عبر GPS 📍"}
              >
                <Locate className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Mic Button inside search */}
            {config.showVoiceMicBtn && (
              <button
                type="button"
                onClick={onToggleDirectVoice || handleToggleVoice}
                className={`absolute left-1.5 p-1.5 rounded-xl transition cursor-pointer shadow ${
                  isListeningVoice || isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={(isListeningVoice || isListening) ? "جارٍ الاستماع... انقر للإيقاف" : "أوامر صوتية مباشرة (تحدث فوراً دون نوافذ)"}
              >
                {(isListeningVoice || isListening) ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </form>

          {/* Quick Audio & Tools */}
          <div className="flex items-center gap-1 shrink-0">
            {/* STOP Safety Button */}
            {config.showStopSafetyBtn && (
              <button
                onClick={onOpenSafetyModal}
                className="px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                title="إرشادات السلامة لكارجاس (نظام STOP)"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">ستوب</span>
              </button>
            )}

            {/* Voice Mute/Unmute */}
            {config.showAudioMuteBtn && (
              <button
                onClick={onToggleMute}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  isMuted
                    ? 'bg-rose-50 border-rose-300 text-rose-600'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}
                title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Compact, Arranged Quick Buttons with Less Padding */}
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5">
          {/* 1. Nearest Station Button */}
          {config.showNearestStationBtn && (
            <button
              onClick={onFindNearest}
              className="w-full py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-1 cursor-pointer transition transform active:scale-98 border border-emerald-400 truncate"
              title="أقرب محطة كارجاس"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">{config.nearestStationBtnText || 'أقرب محطة كارجاس'}</span>
            </button>
          )}

          {/* 2. Cargas Stations Button (Moved up directly after Nearest Station, without 'قائمة منفصلة') */}
          {config.showNationwideBtn && (
            <button
              onClick={() => {
                onSelectFacility('all');
                onOpenNationwideModal();
              }}
              className="w-full py-1.5 px-2 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1 cursor-pointer transition transform active:scale-98 border border-emerald-500/60 truncate bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-600 hover:to-emerald-700 text-white"
              title="محطات كار جاس"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">{config.nationwideBtnText || 'محطات كار جاس'}</span>
            </button>
          )}

          {/* 3. Voice Commands Button (أوامر صوتية مباشرة) */}
          {config.showVoiceMicBtn && (
            <button
              onClick={onToggleDirectVoice || handleToggleVoice}
              className={`w-full py-1.5 px-2 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1 cursor-pointer transition transform active:scale-98 border truncate ${
                isListeningVoice || isListening
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse ring-2 ring-rose-400'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-emerald-500/50'
              }`}
              title="أوامر صوتية فورية"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <span className="truncate">{(isListeningVoice || isListening) ? 'جارِ السماع...' : (config.voiceMicBtnText || 'أوامر صوتية')}</span>
            </button>
          )}
        </div>

        {/* Cargas Facilities Filters (Gas / Conversion / Oils / Testing) - Distributed symmetrically in grid to match the top row */}
        {config.showFacilityFilters && (
          <div className="pointer-events-auto grid grid-cols-4 gap-1.5 text-xs">
            {/* Gas Fueling */}
            <button
              onClick={() => onSelectFacility(selectedFacility === 'station' ? 'all' : 'station')}
              className={`w-full py-1.5 px-1 rounded-xl font-black transition cursor-pointer shadow-md border flex items-center justify-center gap-1 text-[11px] truncate active:scale-98 ${
                selectedFacility === 'station'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/40 ring-1 ring-emerald-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-emerald-500/50'
              }`}
              title="محطات تموين الغاز الطبيعي"
            >
              <span className="truncate">⛽ {config.gasFilterText || 'محطات الغاز'}</span>
            </button>

            {/* Conversion Centers */}
            <button
              onClick={() => onSelectFacility(selectedFacility === 'conversion_center' ? 'all' : 'conversion_center')}
              className={`w-full py-1.5 px-1 rounded-xl font-black transition cursor-pointer shadow-md border flex items-center justify-center gap-1 text-[11px] truncate active:scale-98 ${
                selectedFacility === 'conversion_center'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-amber-950/40 ring-1 ring-amber-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-amber-500/50'
              }`}
              title="مراكز تحويل وصيانة السيارات"
            >
              <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{config.conversionFilterText || 'مراكز التحويل'}</span>
            </button>

            {/* Oil & Lubricants Centers */}
            <button
              onClick={() => onSelectFacility(selectedFacility === 'oil_center' ? 'all' : 'oil_center')}
              className={`w-full py-1.5 px-1 rounded-xl font-black transition cursor-pointer shadow-md border flex items-center justify-center gap-1 text-[11px] truncate active:scale-98 ${
                selectedFacility === 'oil_center'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-950/40 ring-1 ring-blue-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-blue-500/50'
              }`}
              title="مراكز زيوت بي بي المعتمدة"
            >
              <Droplets className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate">{config.oilFilterText || 'مراكز الزيوت'}</span>
            </button>

            {/* Cylinder Testing */}
            <button
              onClick={() => onSelectFacility(selectedFacility === 'cylinder_testing' ? 'all' : 'cylinder_testing')}
              className={`w-full py-1.5 px-1 rounded-xl font-black transition cursor-pointer shadow-md border flex items-center justify-center gap-1 text-[11px] truncate active:scale-98 ${
                selectedFacility === 'cylinder_testing'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-purple-950/40 ring-1 ring-purple-300'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-purple-500/50'
              }`}
              title="فحص واختبار أسطوانات الغاز"
            >
              <span className="truncate">🔍 {config.inspectionFilterText || 'فحص الأسطوانات'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
