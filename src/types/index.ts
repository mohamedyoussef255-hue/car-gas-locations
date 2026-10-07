export type CargasFacilityType = 'station' | 'conversion_center' | 'oil_center' | 'cylinder_testing';

export type CongestionLevel = 'low' | 'medium' | 'high';

export interface Station {
  id: string;
  name: string;
  company: 'كارجاس';
  facilityType: CargasFacilityType; // محطة تموين / مركز تحويل / مركز زيوت / فحص أسطوانات
  address: string;
  lat: number;
  lng: number;
  cng: boolean; // غاز طبيعي مضغوط
  petrol: boolean; // بنزين
  conversionCenter: boolean; // مركز تحويل وصيانة غاز
  oilCenter: boolean; // مركز زيوت كارجاس / BP معتمد
  cylinderInspection: boolean; // مركز فحص واختبار أسطوانات
  cngNozzles: number; // عدد مسدسات الغاز
  pressureBar?: number; // ضغط الغاز (مثال: 200 - 220 bar)
  congestionLevel: CongestionLevel; // أخضر، أصفر، أحمر
  waitTimeMinutes: number; // وقت الانتظار المتوقع بالدقائق
  verified: boolean; // موثقة 100%
  workingHours: string; // 24 ساعة أو مواعيد المركز
  services: string[]; // قائمة الخدمات
  phone?: string;
  notes?: string;
  voiceGuideText?: string; // إرشاد صوتي مخصص لمن لا يقرأ أو يكتب
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
  simpleDriverMode: boolean; // وضع السائق فائق البساطة
}
