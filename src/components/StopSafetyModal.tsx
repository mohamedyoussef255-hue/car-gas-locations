import React from 'react';
import { speechService } from '../services/speechService';
import { 
  ShieldAlert, 
  X, 
  Volume2, 
  CheckCircle, 
  AlertOctagon, 
  Flame, 
  Smartphone, 
  UserMinus, 
  CheckCheck
} from 'lucide-react';

interface StopSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StopSafetyModal: React.FC<StopSafetyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const safetyGuidelines = [
    {
      title: 'إطفاء محرك السيارة والمصابيح',
      description: 'أوقف تشغيل المحرك وسحب المفتاح بالكامل قبل إدخال مسدس الغاز في صمام الشحن.',
      icon: <AlertOctagon className="w-5 h-5 text-rose-400" />
    },
    {
      title: 'نزول جميع الركاب للمنطقة المخصصة',
      description: 'إخلاء السيارة تماماً من الركاب والوقوف في ممر المشاة الآمن خلف الخط الأصفر لحين انتهاء التموين.',
      icon: <UserMinus className="w-5 h-5 text-amber-400" />
    },
    {
      title: 'ممنوع التدخين واستخدام الهاتف',
      description: 'حظر تام لأي مصدر شرر، ولاعات، أو مكالمات هاتفية في حرم محطة الغاز الطبيعي.',
      icon: <Smartphone className="w-5 h-5 text-rose-500" />
    },
    {
      title: 'فحص تاريخ صلاحية أسطوانة الغاز',
      description: 'التأكد من ملصق الفحص الدوري للأسطوانة وصلاحيتها (فحص دوري كل 3 سنوات بكارجاس أو غازتك).',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />
    },
    {
      title: 'التأريض وتفريغ الشحنات الساكنة',
      description: 'عامل المحطة يقوم بتوصيل كابل التأريض لتفريغ أي شحنات كهربائية ساكنة بأمان تام.',
      icon: <CheckCheck className="w-5 h-5 text-cyan-400" />
    }
  ];

  const handleSpeakRules = () => {
    const text = `
    يا بطل، سلامتك وسلامة حبايبك أهم حاجة في الدنيا! 
    نظام ستوب لكارجاس ومحطات الغاز الطبيعي بيقولك:
    أولاً: طفّي محرك العربية تماماً.
    ثانياً: نزل كل الركاب يقفوا في مكان الأمان لحين انتهاء التموين.
    ثالثاً: ممنوع التدخين أو استخدام المحمول نهائياً جنب مسدس الغاز.
    ورابعاً: اتأكد إن أسطوانة الغاز مفحوصة وسارية الصلاحية.
    تموين آمن وطريق السلامة يا غالي!
    `;
    speechService.playChime('alert');
    speechService.speak(text, { priority: true });
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-3xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                منظومة السلامة المهنية | نظام STOP
              </div>
              <h3 className="text-xl font-black text-white">إرشادات التموين الآمن للغاز الطبيعي</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Trigger Banner */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-950/60 to-slate-800/80 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="text-xs text-amber-200">
            اسمع الإرشادات بصوت <span className="font-bold text-amber-400">مُعين</span> (باللهجة المصرية):
          </div>
          <button
            onClick={handleSpeakRules}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>استمع للإرشادات</span>
          </button>
        </div>

        {/* Safety Steps List */}
        <div className="mt-4 space-y-3">
          {safetyGuidelines.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 flex items-start gap-3 hover:border-slate-700 transition"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                {rule.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{idx + 1}.</span>
                  <span>{rule.title}</span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Credit & Close */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            معايير السلامة المهنية المعتمدة لدى <span className="text-emerald-400 font-semibold">كارجاس</span> وشركات الغاز
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
          >
            فهمت، شكراً
          </button>
        </div>
      </div>
    </div>
  );
};
