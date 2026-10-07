import { CargasFacilityType, CongestionLevel } from '../types';
import { CARGAS_LOGO_SVG } from './cargasLogo';

export interface FacilityMeta {
  type: CargasFacilityType;
  title: string;
  badgeBg: string;
  badgeText: string;
  pinBg: string;
  iconText: string;
  shortDesc: string;
}

export const CARGAS_FACILITY_META: Record<CargasFacilityType, FacilityMeta> = {
  'station': {
    type: 'station',
    title: 'محطة تموين غاز طبيعي كارجاس',
    badgeBg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40',
    badgeText: 'text-emerald-400',
    pinBg: '#008844',
    iconText: '⛽',
    shortDesc: 'تموين غاز طبيعي مضغوط (CNG)'
  },
  'conversion_center': {
    type: 'conversion_center',
    title: 'مركز تحويل وصيانة سيارات كارجاس',
    badgeBg: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
    badgeText: 'text-amber-300',
    pinBg: '#d97706',
    iconText: '🛠️',
    shortDesc: 'تحويل سيارات للغاز + صيانة دورية'
  },
  'oil_center': {
    type: 'oil_center',
    title: 'مركز زيوت كارجاس المعتمدة (BP / Castrol)',
    badgeBg: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
    badgeText: 'text-blue-300',
    pinBg: '#2563eb',
    iconText: '🛢️',
    shortDesc: 'غيار زيوت كارجاس وبي بي وفلاتر'
  },
  'cylinder_testing': {
    type: 'cylinder_testing',
    title: 'مركز فحص واختبار أسطوانات كارجاس',
    badgeBg: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
    badgeText: 'text-purple-300',
    pinBg: '#7c3aed',
    iconText: '🔍',
    shortDesc: 'فحص واختبار أسطوانات دوري'
  }
};

export const COMPANY_BRANDS: Record<string, any> = {
  'كارجاس': {
    name: 'كارجاس',
    arabicName: 'الغاز الطبيعي للسيارات (كارجاس - NGV)',
    englishName: 'CARGAS - Natural Gas Vehicles',
    badgeBg: 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50',
    badgeText: 'text-emerald-300',
    borderColor: '#008844',
    markerColor: '#008844',
    logoSvg: CARGAS_LOGO_SVG,
    description: 'شركة الغاز الطبيعي للسيارات الرائدة في مصر'
  }
};

export function getCongestionBadge(level: CongestionLevel, waitMinutes: number) {
  switch (level) {
    case 'low':
      return {
        label: 'رايقة (2-4 د)',
        color: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40',
        dotColor: 'bg-emerald-500',
        ringColor: '#10b981',
        timeText: `${waitMinutes} دقيقة انتظار تقريباً`
      };
    case 'medium':
      return {
        label: 'متوسطة (8 د)',
        color: 'text-amber-300 bg-amber-950/80 border-amber-500/40',
        dotColor: 'bg-amber-500',
        ringColor: '#f59e0b',
        timeText: `${waitMinutes} دقائق انتظار`
      };
    case 'high':
      return {
        label: 'طابور (20+ د)',
        color: 'text-rose-300 bg-rose-950/80 border-rose-500/40',
        dotColor: 'bg-rose-500',
        ringColor: '#f43f5e',
        timeText: `${waitMinutes}+ دقيقة انتظار`
      };
  }
}
