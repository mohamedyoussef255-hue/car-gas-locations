import React, { useEffect, useState } from 'react';
import { NavigationState } from '../types';
import { speechService } from '../services/speechService';
import { getCongestionBadge } from '../utils/companyAssets';
import { 
  Volume2, 
  VolumeX, 
  X, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCcw, 
  MapPin, 
  Play, 
  Pause,
  AlertTriangle,
  Clock,
  Compass
} from 'lucide-react';

interface NavigationOverlayProps {
  navigation: NavigationState;
  onStopNavigation: () => void;
  onToggleMute: () => void;
  onToggleSimulation: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  navigation,
  onStopNavigation,
  onToggleMute,
  onToggleSimulation,
  onNextStep,
  onPrevStep,
}) => {
  const { targetStation, steps, currentStepIndex, isMuted, remainingDistanceKm, remainingDurationMin, isSimulating } = navigation;
  const currentStep = steps[currentStepIndex] || steps[0];
  const [etaTime, setEtaTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + Math.round(remainingDurationMin));
    setEtaTime(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  }, [remainingDurationMin]);

  // Voice announcement when current step changes
  useEffect(() => {
    if (currentStep && !isMuted) {
      speechService.playChime(currentStep.maneuver.includes('arrive') ? 'arrive' : 'turn');
      speechService.speak(currentStep.instruction, { priority: true });
    }
  }, [currentStepIndex, isMuted]);

  if (!targetStation) return null;

  const congestion = getCongestionBadge(targetStation.congestionLevel, targetStation.waitTimeMinutes);

  const getManeuverIcon = (maneuver: string) => {
    if (maneuver.includes('right')) return <CornerUpRight className="w-8 h-8 text-emerald-300" />;
    if (maneuver.includes('left')) return <CornerUpLeft className="w-8 h-8 text-emerald-300" />;
    if (maneuver.includes('uturn')) return <RotateCcw className="w-8 h-8 text-amber-300" />;
    if (maneuver.includes('arrive')) return <MapPin className="w-8 h-8 text-rose-400" />;
    return <ArrowUp className="w-8 h-8 text-emerald-300" />;
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 pointer-events-none z-[1000] flex flex-col justify-between p-3 md:p-6">
      {/* Top Banner: Turn-by-Turn Instruction Card (Google Maps Style) */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-white animate-in slide-in-from-top-6 duration-300">
        <div className="flex items-start justify-between gap-3">
          {/* Maneuver Arrow & Distance */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center shrink-0 shadow-inner">
              {getManeuverIcon(currentStep?.maneuver || 'straight')}
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 animate-spin" />
                <span>إرشاد مسار مباشر</span>
                <span className="text-slate-400">({currentStepIndex + 1} من {steps.length})</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold leading-snug mt-0.5 text-white">
                {currentStep?.instruction || 'استمر في المسار باتجاه المحطة'}
              </h2>
              <div className="text-xs text-slate-300 mt-1">
                بعد {Math.round(currentStep?.distance || 150)} متر تقريباً
              </div>
            </div>
          </div>

          {/* Quick Voice Controls */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleMute}
              title={isMuted ? 'تفعيل الإرشاد الصوتي' : 'كتم الصوت'}
              className={`p-3 rounded-xl border transition-all shadow-lg cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30 animate-pulse'
              }`}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <span className="text-[10px] font-bold text-slate-300">
              {isMuted ? 'الصوت مكتوم' : 'الصوت يعمل'}
            </span>
          </div>
        </div>

        {/* Step Navigation & Next Instruction Peek */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-200 cursor-pointer"
            >
              الخطوة السابقة
            </button>
            <button
              onClick={onNextStep}
              disabled={currentStepIndex >= steps.length - 1}
              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 rounded text-white font-medium cursor-pointer"
            >
              الخطوة التالية
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSimulation}
              className={`px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition cursor-pointer ${
                isSimulating
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'إيقاف المحاكاة' : 'محاكاة السير بالصوت'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Floating Dashboard HUD */}
      <div className="pointer-events-auto max-w-xl mx-auto w-full bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-4 text-white">
        <div className="flex items-center justify-between gap-4">
          {/* Destination & Crowd Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 truncate">
                {targetStation.name}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${congestion.color}`}>
                {congestion.label}
              </span>
            </div>

            {/* Travel Stats: Time, Distance, Arrival */}
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl md:text-3xl font-black text-emerald-400">
                {Math.max(1, Math.round(remainingDurationMin))}
                <span className="text-xs font-medium text-emerald-300 mr-1">دقيقة</span>
              </span>
              <span className="text-sm font-semibold text-slate-300">
                {remainingDistanceKm.toFixed(1)} كم
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                الوصول {etaTime}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span>⛽ {targetStation.cngNozzles} مسدسات غاز</span>
              <span>•</span>
              <span className="text-amber-400">⏱️ انتظار: {targetStation.waitTimeMinutes} د</span>
            </div>
          </div>

          {/* End Route Button */}
          <button
            onClick={onStopNavigation}
            className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-900/50 cursor-pointer shrink-0 transition-transform active:scale-95"
            title="إنهاء الملاحة"
          >
            <X className="w-6 h-6" />
            <span className="text-[10px] font-black">إنهاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
