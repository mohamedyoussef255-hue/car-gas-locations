import React, { useState, useEffect, useRef } from 'react';
import { CompanyName } from '../types';
import { 
  Fuel, 
  Search, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Mic, 
  MicOff, 
  Sparkles, 
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { MapStyleType } from './MapComponent';

interface HeaderBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCompany: CompanyName | 'الكل';
  onSelectCompany: (company: CompanyName | 'الكل') => void;
  filterOnlyVerified: boolean;
  onToggleVerified: () => void;
  filterLowCrowd: boolean;
  onToggleLowCrowd: () => void;
  mapStyle: MapStyleType;
  onChangeMapStyle: (style: MapStyleType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSafetyModal: () => void;
  onSecretAdminTrigger: () => void;
  onVoiceQuery: (query: string) => void;
  appTitle: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCompany,
  onSelectCompany,
  filterOnlyVerified,
  onToggleVerified,
  filterLowCrowd,
  onToggleLowCrowd,
  mapStyle,
  onChangeMapStyle,
  isMuted,
  onToggleMute,
  onOpenSafetyModal,
  onSecretAdminTrigger,
  onVoiceQuery,
  appTitle,
}) => {
  // 5-tap secret admin trigger
  const [tapCount, setTapCount] = useState<number>(0);

  // Voice recognition states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => {
        setTapCount(0);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);

  const handleLogoTap = () => {
    const nextCount = tapCount + 1;
    setTapCount(nextCount);
    if (nextCount >= 5) {
      setTapCount(0);
      onSecretAdminTrigger();
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
      // Fallback: Trigger default nearest query immediately
      onVoiceQuery('ايه اقرب محطة لموقعي الان');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG'; // Egyptian Arabic
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscriptText('جارِ الاستماع... تحدث الآن');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscriptText(transcript);
        onSearchChange(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (transcriptText && transcriptText !== 'جارِ الاستماع... تحدث الآن') {
          onVoiceQuery(transcriptText);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to initialize:', err);
      setIsListening(false);
      // Trigger default query if mic blocked
      onVoiceQuery('ايه اقرب محطة لموقعي الان');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onVoiceQuery(searchQuery.trim());
    }
  };

  const companies: (CompanyName | 'الكل')[] = [
    'الكل',
    'كارجاس',
    'عربية غاز',
    'غازتك',
    'ماستر جاس',
    'وطنية',
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-[700] p-2 md:p-3 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Floating Google Maps-Style Main Search Card */}
        <div className="pointer-events-auto bg-white/95 text-slate-900 border border-slate-200/80 rounded-2xl md:rounded-3xl shadow-2xl backdrop-blur-xl p-2.5 md:p-3 flex items-center justify-between gap-2.5 transition">
          {/* Logo / 5-Tap Admin Trigger */}
          <button
            onClick={handleLogoTap}
            className="flex items-center gap-2 select-none active:scale-95 transition cursor-pointer shrink-0"
            title="انقر 5 مرات للدخول للوحة المدير"
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Fuel className="w-5 h-5" />
              {tapCount > 1 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-bounce">
                  {tapCount}
                </span>
              )}
            </div>
          </button>

          {/* Search Box Input Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث بالاسم أو الشارع أو اسأل بصوتك..."
              className="w-full pr-8 pl-16 py-2 rounded-xl bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-emerald-500 text-xs md:text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none transition"
            />
            
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-8 p-1 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Microphone Button (Google Voice Search) */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`absolute left-1.5 p-2 rounded-xl transition cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-400'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}
              title="تحدث مع مُعين للبحث بالصوت"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </form>

          {/* Actions: Map Layer, Safety, Audio Mute */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Map Style Selector */}
            <select
              value={mapStyle}
              onChange={(e) => onChangeMapStyle(e.target.value as MapStyleType)}
              className="hidden sm:block px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none"
              title="تغيير مظهر الخريطة"
            >
              <option value="google_streets">خرائط جوجل الأصلية</option>
              <option value="google_hybrid">جوجل إيرث (قمر صناعي)</option>
              <option value="google_terrain">تضاريس جوجل</option>
              <option value="dark">الوضع الليلي</option>
            </select>

            {/* STOP Safety Button */}
            <button
              onClick={onOpenSafetyModal}
              className="p-2 md:px-2.5 md:py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="إرشادات السلامة (نظام STOP)"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline">STOP</span>
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
              title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Voice Listening Active Banner */}
        {isListening && (
          <div className="pointer-events-auto bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-6 bg-white rounded-full animate-bounce"></span>
                <span className="w-1.5 h-8 bg-white rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1.5 h-5 bg-white rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
              <div>
                <div className="text-xs font-black">مُعين يستمع إليك الآن...</div>
                <div className="text-xs text-emerald-100 mt-0.5 font-medium">
                  {transcriptText || 'تحدث الآن (مثال: ايه أقرب محطة لموقعي الآن؟)'}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleVoice}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold"
            >
              تم
            </button>
          </div>
        )}

        {/* Quick Voice & Search Chips (Fast 1-Tap Queries) */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {/* Quick Voice Ask: Nearest Station */}
          <button
            onClick={() => onVoiceQuery('ايه اقرب محطة لموقعي الان')}
            className="px-3.5 py-1.5 rounded-full font-black whitespace-nowrap transition cursor-pointer shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400 flex items-center gap-1.5 hover:scale-102 active:scale-98"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            <span>إيه أقرب محطة ليا دلوقتي؟</span>
          </button>

          {/* Quick Voice Ask: Low Crowd */}
          <button
            onClick={() => onVoiceQuery('عاوز محطة بدون زحام رايقة')}
            className="px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shadow bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>محطة بدون زحام</span>
          </button>

          {/* Quick Station: Abbas El Akkad */}
          <button
            onClick={() => onVoiceQuery('عربية غاز عباس العقاد')}
            className="px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shadow bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
          >
            <span>⛽ عربية غاز عباس العقاد</span>
          </button>

          {/* Quick Station: Safir */}
          <button
            onClick={() => onVoiceQuery('عربية غاز ميدان سفير')}
            className="px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shadow bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
          >
            <span>⛽ عربية غاز ميدان سفير</span>
          </button>

          {/* Quick Station: Almazah */}
          <button
            onClick={() => onVoiceQuery('كارجاس ألماظة')}
            className="px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer shadow bg-white/95 text-slate-800 border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
          >
            <span>⛽ كارجاس ألماظة</span>
          </button>
        </div>

        {/* Company Quick Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {companies.map((comp) => (
            <button
              key={comp}
              onClick={() => onSelectCompany(comp)}
              className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-[11px] shadow border ${
                selectedCompany === comp
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white'
              }`}
            >
              {comp}
            </button>
          ))}

          <button
            onClick={onToggleVerified}
            className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer text-[11px] shadow border flex items-center gap-1 ${
              filterOnlyVerified
                ? 'bg-cyan-700 text-white border-cyan-700'
                : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-cyan-600" />
            <span>موثقة 100%</span>
          </button>
        </div>
      </div>
    </header>
  );
};
