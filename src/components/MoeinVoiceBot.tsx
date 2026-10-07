import React, { useState, useRef, useEffect } from 'react';
import { Station, AppConfig } from '../types';
import { speechService } from '../services/speechService';
import { 
  Bot, 
  Send, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  HelpCircle, 
  Navigation, 
  ShieldAlert, 
  ChevronDown, 
  Mic,
  Fuel
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'moein' | 'user';
  text: string;
  timestamp: string;
}

interface MoeinVoiceBotProps {
  userLocation: [number, number];
  stations: Station[];
  config: AppConfig;
  onSelectStation: (station: Station) => void;
  onOpenSafetyModal: () => void;
  onOpenAdminModal: () => void;
}

export const MoeinVoiceBot: React.FC<MoeinVoiceBotProps> = ({
  userLocation,
  stations,
  config,
  onSelectStation,
  onOpenSafetyModal,
  onOpenAdminModal,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-welcome',
      sender: 'moein',
      text: `يا مرحب بيك يا بطل! أنا "مُعين" بصوت شاكر المصري الطبيعي، رفيقك في كل محطات ومراكز "كارجاس" للغاز الطبيعي للسيارات.
معاك خطوة بخطوة عشان تلاقي أقرب محطة تموين غاز كارجاس، وأقرب مركز تحويل وصيانة، وأقرب مركز لغيار الزيوت المعتمدة (بي بي وكاسترول).
قولي بصوتك إنت فين أو محتاج إيه، وهوجّهك فوراً!`,
      timestamp: 'الآن'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSpeakText = (text: string) => {
    if (isMuted) return;
    setIsSpeaking(true);
    speechService.speak(text, { priority: true });
    // Approx reset
    setTimeout(() => setIsSpeaking(false), 6000);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    speechService.setMuted(nextMuted);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Find nearest 3 stations for context
      const stationsContext = stations.slice(0, 5).map(s => ({
        name: s.name,
        company: s.company,
        address: s.address,
        waitTimeMinutes: s.waitTimeMinutes,
        congestionLevel: s.congestionLevel,
        cngNozzles: s.cngNozzles,
        verified: s.verified
      }));

      const res = await fetch('/api/moein-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userLocation,
          stationsContext,
          language: config.language
        })
      });

      const data = await res.json();
      const replyText = data.reply || data.fallback || 'أنا معاك يا غالي، الخريطة شغالة ومحطات ومراكز كارجاس قدامك مباشرة!';

      const moeinMsg: Message = {
        id: `m-${Date.now()}`,
        sender: 'moein',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, moeinMsg]);
      handleSpeakText(replyText);
    } catch {
      // Fallback local smart response
      let localReply = 'يا فندم معاك مُعين! كل محطات ومراكز كارجاس المعتمدة متسجلة على الخريطة وتقدر تضغط على أي محطة لبدء الإرشاد الصوتي فوراً.';
      if (text.includes('تحويل') || text.includes('مركز تحويل')) {
        localReply = 'مراكز تحويل كارجاس الرئيسية متوفرة في ألماظة، غمرة، 6 أكتوبر، والإسكندرية، وبني سويف، وطنطا. بتوفر أحدث أنظمة التحويل وفحص الأسطوانات بأعلى معايير الأمان.';
      } else if (text.includes('زيوت') || text.includes('زيت')) {
        localReply = 'مراكز زيوت كارجاس المعتمدة بتوفر زيوت بريتش بتروليوم (BP) وكاسترول المخصصة لمحركات الغاز الطبيعي، موجودة في مكرم عبيد، ألماظة، الدقي، ومصطفى النحاس.';
      } else if (text.includes('ألماظة') || text.includes('الماظة')) {
        localReply = 'محطة ومجمع كارجاس ألماظة على طريق النصر جنب سيتي سنتر فيها مركز تحويل وصيانة وفحص أسطوانات ومركز زيوت و12 مسدس غاز سريع.';
      }

      const moeinMsg: Message = {
        id: `m-${Date.now()}`,
        sender: 'moein',
        text: localReply,
        timestamp: 'الآن'
      };
      setMessages(prev => [...prev, moeinMsg]);
      handleSpeakText(localReply);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    { label: '📍 أقرب محطة كارجاس لموقعي حالياً', action: () => handleSendMessage('إيه أقرب محطة كارجاس لتموين الغاز الطبيعي لموقعي الحالي ومفيهاش زحمة؟') },
    { label: '🛠️ أقرب مركز تحويل سيارات كارجاس', action: () => handleSendMessage('فين أقرب مركز كارجاس معتمد لتحويل السيارات للغاز الطبيعي؟') },
    { label: '🛢️ مراكز زيوت كارجاس المعتمدة (BP/Castrol)', action: () => handleSendMessage('عاوز أقرب مركز غيار زيوت كارجاس المعتمد لزيوت الغاز الطبيعي') },
    { label: '🔍 فحص واختبار أسطوانات الغاز', action: () => handleSendMessage('أماكن مراكز فحص واختبار أسطوانات الغاز التابعة لكارجاس وشهادة الصلاحية') },
    { label: '⚠️ إرشادات السلامة بنظام STOP', action: () => onOpenSafetyModal() },
  ];

  return (
    <>
      {/* Floating Avatar Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 left-6 z-[800] flex items-center gap-3 animate-in fade-in zoom-in-75 duration-300">
          <div className="hidden sm:flex bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-cyan-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>اسأل مُعين رفيق الطريق</span>
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              speechService.playChime('turn');
            }}
            className="group relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-500 p-0.5 shadow-2xl shadow-cyan-900/50 hover:scale-105 active:scale-95 transition cursor-pointer flex items-center justify-center"
            title="تحدث مع مُعين - المساعد الذكي"
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center border-2 border-cyan-400/50">
              <Bot className="w-8 h-8 text-cyan-300 group-hover:rotate-12 transition-transform" />
            </div>
            {/* Live indicator */}
            <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping"></span>
            <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </button>
        </div>
      )}

      {/* Expanded Voice & Chat Modal/Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 left-0 w-full sm:w-[420px] bg-slate-950/95 border-r border-cyan-500/30 z-[1050] shadow-2xl backdrop-blur-2xl flex flex-col text-white animate-in slide-in-from-left duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-base text-white">مُعين رفيق الطريق</h3>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                    عزوتي الذكي
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  ناطق بالمصري | إرشاد لحظي وتجنب الزحام
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-xl border transition ${
                  isMuted 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
                title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-cyan-500/20 text-slate-100 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-500">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'moein' && !isMuted && (
                    <button
                      onClick={() => handleSpeakText(msg.text)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>إعادة النطق</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-cyan-400 bg-slate-900/80 p-3 rounded-2xl border border-cyan-500/30 w-fit">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                <span>مُعين بيفكر ويجهزلك أحسن طريق...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/40">
            <div className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>موضوعات سريعة جاهزة:</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={q.action}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-cyan-950 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 border border-slate-700 text-[11px] font-medium shrink-0 cursor-pointer transition"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-800 bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب سؤالك لمُعين (عن أي محطة أو زحام)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-2.5 bg-gradient-to-tr from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-40 text-white rounded-xl cursor-pointer shrink-0 shadow"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
            <div className="text-[10px] text-center text-slate-500 mt-1.5">
              تطوير شركة عزوتي للبرمجيات | المطور محمد عبد الرحمن يوسف
            </div>
          </div>
        </div>
      )}
    </>
  );
};
