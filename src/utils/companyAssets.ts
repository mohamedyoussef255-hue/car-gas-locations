import { CompanyName, CongestionLevel } from '../types';

export interface CompanyBrand {
  name: CompanyName;
  arabicName: string;
  englishName: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  markerColor: string;
  iconSvg: string;
  description: string;
}

export const COMPANY_BRANDS: Record<CompanyName, CompanyBrand> = {
  'كارجاس': {
    name: 'كارجاس',
    arabicName: 'الغاز الطبيعي للسيارات (كارجاس)',
    englishName: 'CARGAS - Natural Gas Vehicles',
    badgeBg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40',
    badgeText: 'text-emerald-400',
    borderColor: '#10b981',
    markerColor: '#059669',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="3" fill="#10b981"/></svg>`,
    description: 'الشركة الرائدة في تزويد وتحويل وصيانة سيارات الغاز الطبيعي بمصر'
  },
  'غازتك': {
    name: 'غازتك',
    arabicName: 'المصرية الدولية للغاز (غازتك)',
    englishName: 'GASTEC',
    badgeBg: 'bg-blue-600/20 text-blue-400 border-blue-500/40',
    badgeText: 'text-blue-400',
    borderColor: '#3b82f6',
    markerColor: '#2563eb',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><path d="m13 2-2 2.5V8l2-1.5"/><path d="M13 14v8"/><path d="M4 14a8 8 0 0 1 16 0"/><circle cx="12" cy="14" r="2" fill="#3b82f6"/></svg>`,
    description: 'شبكة محطات متميزة وشراكات كبرى لتموين الغاز الطبيعي'
  },
  'عربية غاز': {
    name: 'عربية غاز',
    arabicName: 'عربية غاز (Arabia Gas)',
    englishName: 'Arabia Gas',
    badgeBg: 'bg-amber-600/20 text-amber-400 border-amber-500/40',
    badgeText: 'text-amber-400',
    borderColor: '#f59e0b',
    markerColor: '#d97706',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    description: 'محطات متطورة متخصصة في الغاز الطبيعي (عباس العقاد، ميدان سفير، إلخ)'
  },
  'ماستر جاس': {
    name: 'ماستر جاس',
    arabicName: 'ماستر جاس (طاقة عربية)',
    englishName: 'Master Gas - TAQA',
    badgeBg: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/40',
    badgeText: 'text-cyan-400',
    borderColor: '#06b6d4',
    markerColor: '#0891b2',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/><circle cx="12" cy="12" r="3" fill="#06b6d4"/></svg>`,
    description: 'محطات الغاز الطبيعي الذكية التابعة لمجموعة طاقة عربية'
  },
  'وطنية': {
    name: 'وطنية',
    arabicName: 'محطات وطنية / شيل أوت',
    englishName: 'Wataniya / ChillOut CNG',
    badgeBg: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/40',
    badgeText: 'text-yellow-400',
    borderColor: '#eab308',
    markerColor: '#ca8a04',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><circle cx="12" cy="12" r="10"/><polygon points="12 6 15 11 20 12 16 16 17 21 12 18 7 21 8 16 4 12 9 11 12 6" fill="#eab308"/></svg>`,
    description: 'محطات على المحاور السريعة والطرق الدائرية بالتعاون مع شركات الغاز'
  },
  'طاقة': {
    name: 'طاقة',
    arabicName: 'طاقة عربية للغاز',
    englishName: 'TAQA Gas',
    badgeBg: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40',
    badgeText: 'text-indigo-400',
    borderColor: '#6366f1',
    markerColor: '#4f46e5',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    description: 'حلول الغاز والكهرباء المتكاملة'
  },
  'أخرى': {
    name: 'أخرى',
    arabicName: 'محطة غاز مستقلة / معتمدة',
    englishName: 'Verified CNG Station',
    badgeBg: 'bg-slate-600/20 text-slate-300 border-slate-500/40',
    badgeText: 'text-slate-300',
    borderColor: '#64748b',
    markerColor: '#475569',
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-white"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 9h6"/></svg>`,
    description: 'محطة تموين مسجلة وموثقة'
  }
};

export function getCongestionBadge(level: CongestionLevel, waitMinutes: number) {
  switch (level) {
    case 'low':
      return {
        label: 'زحام خفيف (مريح)',
        color: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40',
        dotColor: 'bg-emerald-500',
        ringColor: '#10b981',
        timeText: `${waitMinutes} دقيقة انتظار تقريباً`
      };
    case 'medium':
      return {
        label: 'زحام متوسط',
        color: 'text-amber-400 bg-amber-950/80 border-amber-500/40',
        dotColor: 'bg-amber-500',
        ringColor: '#f59e0b',
        timeText: `${waitMinutes} دقائق انتظار`
      };
    case 'high':
      return {
        label: 'زحام شديد (طابور)',
        color: 'text-rose-400 bg-rose-950/80 border-rose-500/40',
        dotColor: 'bg-rose-500',
        ringColor: '#f43f5e',
        timeText: `${waitMinutes}+ دقيقة انتظار`
      };
  }
}
