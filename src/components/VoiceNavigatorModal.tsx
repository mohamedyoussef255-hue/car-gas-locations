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
  AlertCircle,
  Radio,
  Send
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
  onToggleContinuousGps?: (enable?: boolean) => void;
  isGpsContinuous?: boolean;
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
  onToggleContinuousGps,
  isGpsContinuous = false,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [customInputText, setCustomInputText] = useState<string>('');
  const [systemResponse, setSystemResponse] = useState<string>('');
  const [matchedStation, setMatchedStation] = useState<Station | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setCustomInputText('');
      setSystemResponse('🎙️ تحدث الآن أو اضغط على المايك... جرب قول: «أقرب محطة لموقعي» أو «تفعيل الجي بي اس»');
      setMatchedStation(null);
      setSpeechError(null);
      
      // Attempt gentle auto-start
      try {
        startListening();
      } catch {
        // Handled silently
      }
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startMediaRecorder = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setSystemResponse('اختر أحد الأوامر السريعة أدناه أو اكتب اسم المحطة:');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else if (MediaRecorder.isTypeSupported('audio/wav')) mimeType = 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsListening(true);
      setSpeechError(null);
      speechService.playChime('turn');
      setSystemResponse('🎙️ استمع إليك الآن عبر المايك... تحدث بوضوح بأمرك');

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsListening(false);
        try { stream.getTracks().forEach(t => t.stop()); } catch {}

        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 600) return;

        setSystemResponse('⏳ جاري فهم الأمر الصوتي وتنفيذه...');

        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string)?.split(',')[1];
            if (!base64Data) return;

            const res = await fetch('/api/voice-command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Data, mimeType })
            });

            if (res.ok) {
              const data = await res.json();
              const spoken = data.transcript || 'أقرب محطة لموقعي';
              setTranscript(spoken);
              processVoiceCommand(spoken);
            } else {
              processVoiceCommand('أقرب محطة لموقعي');
            }
          };
        } catch {
          processVoiceCommand('أقرب محطة لموقعي');
        }
      };

      recorder.start(250);

      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try { mediaRecorderRef.current.stop(); } catch {}
        }
      }, 4200);

    } catch (err) {
      console.warn('Media recorder in modal error:', err);
      setIsListening(false);
      setSystemResponse('اختر أحد الأوامر السريعة أدناه أو اكتب اسم المحطة:');
    }
  };

  const startListening = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      startMediaRecorder();
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG'; // Egyptian Arabic first
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        speechService.playChime('turn');
        setSystemResponse('🎙️ استمع إليك الآن... تحدث بوضوح: «أقرب محطة لموقعي» أو «تفعيل الجي بي اس» أو اسم المحطة');
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
        console.warn('SpeechRecognition in modal error, falling back to MediaRecorder:', e?.error);
        setIsListening(false);
        startMediaRecorder();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
      startMediaRecorder();
    }
  };

  const stopListening = () => {
    if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current = null;
    }
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
    if (q.includes('وقف الملاحة') || q.includes('الغاء الملاحة') || q.includes('إيقاف الملاحة') || q.includes('stop navigation')) {
      if (onStopNavigation) onStopNavigation();
      const reply = 'تم إيقاف الملاحة.';
      setSystemResponse(reply);
      speechService.speak(reply, { priority: true });
      return;
    }

    // Command: Activate continuous GPS tracking (تفعيل الجي بي اس لتحديد الموقع تلقائيا باستمرار)
    if (
      (q.includes('تفعيل') || q.includes('شغل') || q.includes('فتح') || q.includes('تتبع') || q.includes('ابدا')) &&
      (q.includes('جي بي اس') || q.includes('gps') || q.includes('تتبع') || q.includes('موقع') || q.includes('تلقائي')) ||
      q.includes('تفعيل الجي بي اس') ||
      q.includes('تفعيل gps') ||
      q.includes('تحديد الموقع تلقائيا') ||
      q.includes('تتبع موقعي')
    ) {
      if (onToggleContinuousGps) {
        onToggleContinuousGps(true);
      }
      const reply = 'تم تفعيل نظام الجي بي اس وتتبع موقعك تلقائياً وبشكل مستمر على الخريطة! 🛰️';
      setSystemResponse(reply);
      speechService.speak(reply, { priority: true });
      setTimeout(() => {
        onClose();
      }, 1500);
      return;
    }

    // Command: Stop GPS continuous tracking
    if (
      (q.includes('ايقاف') || q.includes('إيقاف') || q.includes('الغاء') || q.includes('وقف') || q.includes('قفل')) &&
      (q.includes('جي بي اس') || q.includes('gps') || q.includes('تتبع'))
    ) {
      if (onToggleContinuousGps) {
        onToggleContinuousGps(false);
      }
      const reply = 'تم إيقاف تتبع الجي بي اس التلقائي.';
      setSystemResponse(reply);
      speechService.speak(reply, { priority: true });
      return;
    }

    // Command: Start navigation to already matched station
    if ((q.includes('ابدأ الملاحة') || q.includes('ابدا الملاحة') || q.includes('وجهني')) && matchedStation) {
      handleStartNav(matchedStation);
      return;
    }

    // Command: Find Nearest Station (أقرب محطة لموقعي - يبدأ الملاحة فوراً)
    if (
      q.includes('اقرب') || 
      q.includes('أقرب') || 
      q.includes('قريب') || 
      q.includes('موقعي') || 
      q.includes('هنا') ||
      q.includes('اقرب محطة') ||
      q.includes('أقرب محطة لموقعي')
    ) {
      const sorted = [...stations].sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });

      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setMatchedStation(nearest);
        
        // Start navigation directly as requested by the user
        onStartNavigation(nearest);
        const reply = `بدأنا الملاحة فوراً لأقرب محطة كار جاس ليك: ${nearest.name}، على بعد ${distKm} كم. وقت الانتظار ${nearest.waitTimeMinutes} دقيقة.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        setTimeout(() => {
          onClose();
        }, 1200);
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
        onStartNavigation(nearest);
        const reply = `أقرب مركز تحويل وصيانة معتمد لكار جاس هو ${nearest.name}، على بعد ${distKm} كم، وبدأنا الملاحة نحوه.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        setTimeout(() => {
          onClose();
        }, 1200);
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
        onStartNavigation(nearest);
        const reply = `أقرب مركز زيوت بي بي معتمد في كار جاس هو ${nearest.name}، على بعد ${distKm} كم، وجاري توجيهك.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        setTimeout(() => {
          onClose();
        }, 1200);
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
        onStartNavigation(nearest);
        const reply = `أقرب مركز فحص واختبار أسطوانات هو ${nearest.name}، على بعد ${distKm} كم، وبدأنا الملاحة.`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        setTimeout(() => {
          onClose();
        }, 1200);
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
        onStartNavigation(nearest);
        const reply = `محطة كار جاس رايقة بدون طوابير: ${nearest.name} على بعد ${distKm} كم، وقت الانتظار ${nearest.waitTimeMinutes} دقيقة بس. بدأنا الملاحة!`;
        setSystemResponse(reply);
        speechService.speak(reply, { priority: true });
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }
    }

    // Command: Search by Area / Name / District
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
      onStartNavigation(best);
      const reply = `وجدت محطة كار جاس: ${best.name} على بعد ${distKm} كم. بدأنا الملاحة نحوها مباشرة.`;
      setSystemResponse(reply);
      speechService.speak(reply, { priority: true });
      setTimeout(() => {
        onClose();
      }, 1200);
      return;
    }

    // Fallback if not directly matched
    const notFoundReply = `لم أجد محطة تطابق «${command}». جرب قول «أقرب محطة لموقعي» أو «تفعيل الجي بي اس».`;
    setSystemResponse(notFoundReply);
    speechService.speak(notFoundReply, { priority: true });
  };

  const handleStartNav = (station: Station) => {
    onStartNavigation(station);
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInputText.trim()) {
      setTranscript(customInputText.trim());
      processVoiceCommand(customInputText.trim());
      setCustomInputText('');
    }
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
                <span>تلقي الأوامر الصوتية الذكية</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  كار جاس NGV
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                انطق «أقرب محطة لموقعي» أو «تفعيل الجي بي اس» للملاحة الفورية
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
            title={isListening ? 'إيقاف التسجيل' : 'اضغط للتحدث بالصوت'}
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
              <div className="mt-1.5 text-xs font-bold text-amber-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 inline-block animate-pulse">
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

        {/* Manual Text Fallback Input */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={customInputText}
            onChange={(e) => setCustomInputText(e.target.value)}
            placeholder="اكتب أمرك هنا (مثال: أقرب محطة لموقعي أو تفعيل الجي بي اس)..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال</span>
          </button>
        </form>

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
            أوامر فورية بنقرة واحدة أو انطقها بالصوت:
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {[
              { label: '📍 أقرب محطة لموقعي (بدء فوري)', cmd: 'أقرب محطة لموقعي', highlight: true },
              { 
                label: isGpsContinuous ? '🛰️ إيقاف تتبع الجي بي اس' : '🛰️ تفعيل الجي بي اس (تتبع تلقائي مستمر)', 
                cmd: isGpsContinuous ? 'إيقاف الجي بي اس' : 'تفعيل الجي بي اس', 
                highlight: true 
              },
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
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  chip.highlight
                    ? 'bg-gradient-to-r from-emerald-800 to-teal-800 border-emerald-400 text-white shadow-md hover:scale-102'
                    : 'bg-slate-800 hover:bg-emerald-900/60 border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white'
                }`}
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

