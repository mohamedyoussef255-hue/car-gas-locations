import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types';
import { speechService } from '../services/speechService';
import { getDistanceMeters } from '../services/routingService';
import { 
  Mic, 
  MicOff, 
  X, 
  Navigation, 
  MapPin, 
  Compass, 
  Sparkles, 
  Gauge, 
  Clock, 
  Wrench, 
  Droplets, 
  Search,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface VoiceNavigatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  userLocation: [number, number];
  onSelectStation: (station: Station) => void;
  onStartNavigation: (station: Station) => void;
  onStopNavigation?: () => void;
  isNavigatingActive?: boolean;
}

export const VoiceNavigatorModal: React.FC<VoiceNavigatorModalProps> = ({
  isOpen,
  onClose,
  stations,
  userLocation,
  onSelectStation,
  onStartNavigation,
  onStopNavigation,
  isNavigatingActive = false,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [systemResponse, setSystemResponse] = useState<string>('');
  const [matchedStation, setMatchedStation] = useState<Station | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setSystemResponse('اضغط على المايك وتحدث... اطلب «أقرب محطة» أو اذكر المنطقة مثل «محطة في المعادي» أو «مركز تحويل»');
      setMatchedStation(null);
      setSpeechError(null);
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError('التعرف الصوتي المباشر غير مدعوم في هذا المتصفح. يمكنك اختيار الأوامر السريعة أدناه.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG'; // Egyptian Arabic
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        setSystemResponse('🎙️ استمع إليك الآن... تحدث باسم المحطة أو منطقتك أو اطلب «أقرب محطة»');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (final || interim).trim();
        if (text) {
          finalTranscriptRef.current = text;
          setTranscript(text);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const spoken = finalTranscriptRef.current.trim();
        if (spoken) {
          processVoiceCommand(spoken);
        }
      };

      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e?.error === 'not-allowed') {
          setSpeechError('يرجى السماح بصلاحية المايكروفون للمتصفح.');
        } else if (e?.error === 'no-speech') {
          setSystemResponse('لم يتم التقاط صوت واضح. اضغط على المايك وجرب التحدث مجدداً:');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
      setSpeechError('تعذر بدء التعرف الصوتي.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  // Process natural voice commands in Egyptian Arabic
  const processVoiceCommand = (command: string) => {
    const q = command.trim().toLowerCase();
    speechService.playChime('turn');

    // Command: Stop navigation
    if (q.includes('وقف الملاحة') || q.includes('الغاء الملاحة') || q.includes('stop navigation')) {
      if (onStopNavigation) onStopNavigation();
      const reply = 'تم إيقاف الملاحة.';
      setSystemResponse(reply);
      speechService.speak(reply, { priority: true });
      return;
    }

    // Command: Start navigation to already matched station
    if ((q.includes('ابدأ الملاحة') || q.includes('ابدا الملاحة') || q.includes('وجهني')) && matchedStation) {
      handleStartNav(matchedStation);
      return;
    }

    // Command: Find Nearest Station (أقرب محطة)
    if (q.includes('اقرب') || q.includes('أقرب') || q.includes('قريب') || q.includes('موقعي') || q.includes('هنا')) {
      const sorted = [...stations].sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });

      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setMatchedStation(nearest);
        // Start navigation directly without showing blocking details
        onStartNavigation(nearest);
        onClose();
        const reply = `بدأنا الملاحة فوراً لأقرب محطة ليك: ${nearest.name}، على بعد ${distKm} كم. وقت الانتظار ${nearest.waitTimeMinutes} دقيقة.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        return;
      }
    }

    // Command: Nearest Conversion Center (مركز تحويل وصيانة)
    if (q.includes('تحويل') || q.includes('صيانة') || q.includes('تركيب غاز')) {
      const convStations = stations.filter(s => s.conversionCenter);
      const sorted = convStations.sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });

      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setMatchedStation(nearest);
        onSelectStation(nearest);
        const reply = `أقرب مركز تحويل وصيانة معتمد لكار جاس هو ${nearest.name}، على بعد ${distKm} كم.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        return;
      }
    }

    // Command: Nearest Oil Center (مركز زيوت بي بي)
    if (q.includes('زيت') || q.includes('زيوت') || q.includes('bp') || q.includes('بي بي')) {
      const oilStations = stations.filter(s => s.oilCenter);
      const sorted = oilStations.sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });

      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setMatchedStation(nearest);
        onSelectStation(nearest);
        const reply = `أقرب مركز زيوت بي بي معتمد في كار جاس هو ${nearest.name}، على بعد ${distKm} كم.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        return;
      }
    }

    // Command: Cylinder testing (فحص أسطوانات)
    if (q.includes('فحص') || q.includes('أسطوان') || q.includes('اسطوان')) {
      const testStations = stations.filter(s => s.cylinderInspection);
      const sorted = testStations.sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });

      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setMatchedStation(nearest);
        onSelectStation(nearest);
        const reply = `أقرب مركز فحص واختبار أسطوانات هو ${nearest.name}، على بعد ${distKm} كم.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        return;
      }
    }

    // Command: Low congestion (محطة رايقة بدون زحام)
    if (q.includes('رايق') || q.includes('زحمة') || q.includes('زحام') || q.includes('فاضي') || q.includes('طابور')) {
      const lowCrowd = stations.filter(s => s.congestionLevel === 'low');
      const sorted = lowCrowd.sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });

      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setMatchedStation(nearest);
        onSelectStation(nearest);
        const reply = `وجدت لك محطة كار جاس رايقة بدون طوابير: ${nearest.name} على بعد ${distKm} كم، وقت الانتظار ${nearest.waitTimeMinutes} دقيقة بس.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        return;
      }
    }

    // Command: Search by Area / Name / District
    // Clean search string
    const cleanQ = q
      .replace(/محطة|محطه|كار جاس|كارجاس|عايز|عاوز|فين|اروح|مركز/g, '')
      .trim();

    const matched = stations.filter(s => {
      const fullText = `${s.name} ${s.address} ${s.services.join(' ')} ${s.notes || ''}`.toLowerCase();
      return fullText.includes(cleanQ || q);
    }).sort((a, b) => {
      return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
             getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
    });

    if (matched.length > 0) {
      const best = matched[0];
      const distKm = (getDistanceMeters(userLocation[0], userLocation[1], best.lat, best.lng) / 1000).toFixed(1);
      setMatchedStation(best);
      onSelectStation(best);
      const reply = `وجدت محطة كار جاس: ${best.name} على بعد ${distKm} كم. جاهزة لبدء الملاحة.`;
      setSystemResponse(reply);
      speechService.speak(reply, { priority: true });
      return;
    }

    // Fallback if not directly matched
    const notFoundReply = `لم أجد محطة تطابق «${command}». جرب قول «أقرب محطة» أو اذكر منطقة مثل «المعادي» أو «مدينة نصر».`;
    setSystemResponse(notFoundReply);
    speechService.speak(notFoundReply, { priority: true });
  };

  const handleStartNav = (station: Station) => {
    onStartNavigation(station);
    onClose();
  };

  if (!isOpen) return null;

  const distanceKm = matchedStation
    ? (getDistanceMeters(userLocation[0], userLocation[1], matchedStation.lat, matchedStation.lng) / 1000).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-2xl p-5 md:p-6 text-white flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>مرشد الملاحة الصوتي الذكي</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  كار جاس NGV
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                ابحث بصوتك عن أقرب محطة أو منطقة وانطلق فوراً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Glowing Mic & Visualizer */}
        <div className="flex flex-col items-center justify-center py-4 bg-slate-950/60 rounded-3xl border border-slate-800/80 gap-3">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl active:scale-95 ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-500/50 ring-8 ring-rose-500/20 animate-pulse'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/40 hover:scale-105'
            }`}
          >
            {isListening ? (
              <MicOff className="w-8 h-8 animate-bounce" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          {/* Dynamic Audio Equalizer Bars when listening */}
          {isListening && (
            <div className="flex items-center justify-center gap-1.5 h-8">
              <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
              <span className="w-1.5 h-7 bg-teal-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-8 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-1.5 h-6 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.25s]"></span>
              <span className="w-1.5 h-3 bg-teal-400 rounded-full animate-bounce [animation-delay:0.18s]"></span>
            </div>
          )}

          <div className="text-center px-4">
            <div className="text-xs font-black text-emerald-400">
              {isListening ? '🎙️ أستمع إليك الآن... تحدث بوضوح' : 'اضغط على المايك وتحدث بالصوت'}
            </div>
            {transcript && (
              <div className="mt-1.5 text-xs font-bold text-amber-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 inline-block">
                «{transcript}»
              </div>
            )}
          </div>
        </div>

        {/* System Guidance Speech Response */}
        {systemResponse && (
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-emerald-500/40 text-xs font-bold text-slate-200 leading-relaxed flex items-start gap-2.5">
            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{systemResponse}</span>
          </div>
        )}

        {/* Error notice if speech recognition unavailable */}
        {speechError && (
          <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-300 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Detected Station Card (Ready for Navigation) */}
        {matchedStation && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/70 shadow-xl flex flex-col gap-2.5 animate-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">{matchedStation.name}</div>
                  <div className="text-[11px] text-slate-400">{matchedStation.address}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-emerald-400">{distanceKm} كم</div>
                <div className="text-[10px] text-slate-400">وقت الانتظار: {matchedStation.waitTimeMinutes} دقيقة</div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {matchedStation.cng && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700">
                  ⛽ تموين غاز
                </span>
              )}
              {matchedStation.conversionCenter && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-700">
                  🛠️ مركز تحويل
                </span>
              )}
              {matchedStation.oilCenter && (
                <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-700">
                  🛢️ زيوت بي بي
                </span>
              )}
            </div>

            {/* Direct Action Button */}
            <button
              type="button"
              onClick={() => handleStartNav(matchedStation)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-98"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>ابدأ مسار الملاحة والتوجيه فوراً 🚀</span>
            </button>
          </div>
        )}

        {/* Quick Voice Command Chips (Clickable Suggestions) */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="text-[10px] font-bold text-slate-400">
            أوامر سريعة بنقرة واحدة أو انطقها بالصوت:
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
            {[
              { label: '📍 أقرب محطة كار جاس', cmd: 'أقرب محطة' },
              { label: '🟢 محطة رايقة بدون زحمة', cmd: 'محطة رايقة' },
              { label: '🏙️ محطة في مدينة نصر', cmd: 'محطة مدينة نصر' },
              { label: '🏢 محطة في المعادي', cmd: 'محطة المعادي' },
              { label: '🛣️ محطة التجمع الخامس', cmd: 'محطة التجمع' },
              { label: '🛠️ مركز تحويل وصيانة', cmd: 'أقرب مركز تحويل' },
              { label: '🛢️ مركز زيوت بي بي', cmd: 'أقرب مركز زيوت' },
              { label: '🔍 فحص واختبار أسطوانات', cmd: 'فحص أسطوانات' },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTranscript(chip.cmd);
                  processVoiceCommand(chip.cmd);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-900/60 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
