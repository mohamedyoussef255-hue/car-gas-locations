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
  Lock
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
  config: AppConfig;
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
  config,
}) => {
  // 5-tap secret admin trigger & single-tap nationwide statement
  const [tapCount, setTapCount] = useState<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  // Voice recognition states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
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

  // Start voice recognition
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      onVoiceQuery('اقرب محطة كارجاس لموقعي');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG'; // Egyptian Arabic
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscriptText('أنا سامعك... املي المكان بصوتك');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscriptText(transcript);
        onSearchChange(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (transcriptText && !transcriptText.includes('سامعك')) {
          onVoiceQuery(transcriptText);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      onVoiceQuery('اقرب محطة كارجاس لموقعي');
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
              <div className="w-full h-full">
                <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
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
              className="w-full pr-9 pl-14 py-2 rounded-2xl bg-slate-100 hover:bg-slate-50 focus:bg-white border-2 border-transparent focus:border-emerald-600 text-xs text-slate-900 font-bold placeholder-slate-400 focus:outline-none transition shadow-inner"
            />
            
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-10 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Quick Mic Button inside search */}
            {config.showVoiceMicBtn && (
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`absolute left-1.5 p-1.5 rounded-xl transition cursor-pointer shadow ${
                  isListening
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title="اضغط هنا واملِي المحطة بصوتك"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </form>

          {/* Quick Audio & Tools */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Cargas Nationwide Directory Button */}
            {config.showNationwideBtn && (
              <button
                onClick={onOpenNationwideModal}
                className="px-2 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-500 text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition"
                title="بيان محطات ومواقع كارجاس على مستوى الجمهورية"
              >
                <div className="w-4 h-4 rounded-full overflow-hidden bg-white shrink-0 border border-emerald-600 p-0.5">
                  <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                </div>
                <span className="hidden sm:inline">{config.nationwideBtnText || 'محطات كارجاس'}</span>
              </button>
            )}

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

            {/* Admin Key Button (Always available for manager access with password) */}
            <button
              onClick={onSecretAdminTrigger}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-700 border border-slate-200 transition cursor-pointer"
              title="لوحة مدير النظام (كلمة السر 0000)"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact, Arranged Quick Buttons with Less Padding */}
        {(config.showNearestStationBtn || config.showVoiceMicBtn) && (
          <div className="pointer-events-auto grid grid-cols-2 gap-1.5">
            {/* Nearest Station Button (Compact, non-overlapping) */}
            {config.showNearestStationBtn && (
              <button
                onClick={onFindNearest}
                className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition transform active:scale-98 border border-emerald-400 truncate"
              >
                <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate">{config.nearestStationBtnText || 'المحطة الأقرب لك'}</span>
              </button>
            )}

            {/* Voice Dictation Button (Compact, non-overlapping) */}
            {config.showVoiceMicBtn && (
              <button
                onClick={handleToggleVoice}
                className={`w-full py-1.5 px-2.5 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition transform active:scale-98 border truncate ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-emerald-500/50'
                }`}
              >
                <Mic className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span className="truncate">{isListening ? 'جارِ السماع...' : (config.voiceMicBtnText || 'المكان بصوتك')}</span>
              </button>
            )}
          </div>
        )}

        {/* Voice Listening Active Big Card */}
        {isListening && (
          <div className="pointer-events-auto bg-gradient-to-r from-emerald-800 via-slate-900 to-teal-900 text-white rounded-2xl shadow-2xl p-3 flex items-center justify-between border-2 border-emerald-400 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-6 bg-amber-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1.5 h-5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
              <div>
                <div className="text-xs font-black text-amber-300">مُعين سامعك... اتكلم دلوقتي:</div>
                <div className="text-[11px] text-white mt-0.5 font-bold">
                  {transcriptText || 'مثال: "عاوز أروح كارجاس ألماظة" أو "أقرب مركز زيوت"'}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleVoice}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow"
            >
              تم
            </button>
          </div>
        )}

        {/* Cargas Facilities Filters (Gas / Conversion / Oils / Testing) - Compact spacing & configurable labels */}
        {config.showFacilityFilters && (
          <div className="pointer-events-auto flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              onClick={() => onSelectFacility('all')}
              className={`px-2.5 py-1 rounded-lg font-black whitespace-nowrap transition cursor-pointer shadow-sm border text-[11px] ${
                selectedFacility === 'all'
                  ? 'bg-emerald-700 text-white border-emerald-600'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              كل مواقع كارجاس
            </button>

            {/* Gas Fueling */}
            <button
              onClick={() => onSelectFacility('station')}
              className={`px-2.5 py-1 rounded-lg font-black whitespace-nowrap transition cursor-pointer shadow-sm border flex items-center gap-1 text-[11px] ${
                selectedFacility === 'station'
                  ? 'bg-emerald-700 text-white border-emerald-600'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              <span>⛽ {config.gasFilterText || 'محطات الغاز'}</span>
            </button>

            {/* Conversion Centers */}
            <button
              onClick={() => onSelectFacility('conversion_center')}
              className={`px-2.5 py-1 rounded-lg font-black whitespace-nowrap transition cursor-pointer shadow-sm border flex items-center gap-1 text-[11px] ${
                selectedFacility === 'conversion_center'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              <Wrench className="w-3 h-3 text-amber-500" />
              <span>🛠️ {config.conversionFilterText || 'مراكز التحويل والصيانة'}</span>
            </button>

            {/* Oil & Lubricants Centers */}
            <button
              onClick={() => onSelectFacility('oil_center')}
              className={`px-2.5 py-1 rounded-lg font-black whitespace-nowrap transition cursor-pointer shadow-sm border flex items-center gap-1 text-[11px] ${
                selectedFacility === 'oil_center'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              <Droplets className="w-3 h-3 text-blue-500" />
              <span>🛢️ {config.oilFilterText || 'مراكز الزيوت (BP/كاسترول)'}</span>
            </button>

            {/* Cylinder Testing */}
            <button
              onClick={() => onSelectFacility('cylinder_testing')}
              className={`px-2.5 py-1 rounded-lg font-black whitespace-nowrap transition cursor-pointer shadow-sm border flex items-center gap-1 text-[11px] ${
                selectedFacility === 'cylinder_testing'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              <span>🔍 {config.inspectionFilterText || 'فحص الأسطوانات'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
