export type CompanyName = 'كارجاس' | 'غازتك' | 'عربية غاز' | 'ماستر جاس' | 'وطنية' | 'طاقة' | 'أخرى';

export type CongestionLevel = 'low' | 'medium' | 'high';

export interface Station {
  id: string;
  name: string;
  company: CompanyName;
  address: string;
  lat: number;
  lng: number;
  cng: boolean; // غاز طبيعي مضغوط
  petrol: boolean; // بنزين
  diesel?: boolean; // سولار
  cngNozzles: number; // عدد مسدسات الغاز
  pressureBar?: number; // ضغط الغاز (مثال: 200 - 220 bar)
  congestionLevel: CongestionLevel; // أخضر، أصفر، أحمر
  waitTimeMinutes: number; // وقت الانتظار المتوقع بالدقائق
  verified: boolean; // موثقة 100% لتجنب محطات جوجل الوهمية
  workingHours: string; // مثال: 24 ساعة أو 6 ص - 12 م
  conversionCenter: boolean; // مركز صيانة وتحويل غاز
  cylinderInspection: boolean; // فحص أسطوانات دوري
  services: string[]; // خدمات إضافية (سوبرماركت، غسيل، كافيه، إلخ)
  phone?: string;
  notes?: string;
  logoUrl?: string;
  updatedAt?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number; // بالمتر
  duration: number; // بالثواني
  maneuver: string; // turn-right, turn-left, straight, etc.
  location: [number, number]; // [lat, lng]
}

export interface NavigationState {
  isActive: boolean;
  targetStation: Station | null;
  currentStepIndex: number;
  isMuted: boolean;
  voiceSpeed: number;
  remainingDistanceKm: number;
  remainingDurationMin: number;
  routeCoordinates: [number, number][];
  steps: RouteStep[];
  isSimulating?: boolean;
}

export interface AppConfig {
  adminPassword: string;
  moeinVoiceEnabled: boolean;
  moeinVisibleToUsers: boolean;
  moeinAllowedTopics: string[];
  moeinCustomPromptNote: string;
  brandAccentColor: string;
  theme: 'dark' | 'light';
  language: 'ar' | 'en';
  appTitle: string;
  appSubtitle: string;
  ezoutiBadgeVisible: boolean;
  trafficCrowdAlertsEnabled: boolean;
}
