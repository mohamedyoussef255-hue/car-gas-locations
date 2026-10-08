export type CargasFacilityType = 'station' | 'conversion_center' | 'oil_center' | 'cylinder_testing';

export type CongestionLevel = 'low' | 'medium' | 'high';

export interface Station {
  id: string;
  name: string;
  company: string; // كارجاس أو أخرى
  facilityType: CargasFacilityType; // محطة تموين / مركز تحويل / مركز زيوت / فحص أسطوانات
  address: string;
  lat: number;
  lng: number;
  customLogoUrl?: string; // اللوجو المخصص للمحطة (مستخرج من KMZ أو رابط صورة)
  customLogoSvg?: string;
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
  voiceGuideText?: string; // إرشاد صوتي مخصص
  isHidden?: boolean; // إخفاء المحطة من الخريطة وعن المستخدمين
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
  adminPassword: string; // كلمة سر المدير الافتراضية 0000 مع إمكانية تعديلها
  cargasOnlyMode: boolean; // إظهار مواقع ومحطات كارجاس فقط للمستخدمين
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
  simpleDriverMode: boolean;

  // تحكم المدير في الأيقونات والأزرار بصفحات المستخدمين (إظهار/إخفاء/تعديل)
  showNearestStationBtn: boolean; // زر أقرب محطة
  nearestStationBtnText: string;  // نص زر أقرب محطة
  showVoiceMicBtn: boolean;       // زر الميكروفون
  voiceMicBtnText: string;        // نص زر الميكروفون
  showNationwideBtn: boolean;     // زر بيان المحطات بالجمهورية
  nationwideBtnText: string;      // نص زر بيان المحطات
  showStopSafetyBtn: boolean;     // زر ستوب للسلامة
  showAudioMuteBtn: boolean;      // زر كتم/تشغيل الصوت
  showLocateMeBtn: boolean;       // زر تحديد موقعي
  showBottomDrawer: boolean;      // قائمة المحطات السفلية
  showCrowdBadges: boolean;       // مؤشرات حالة الزحام
  showFacilityFilters: boolean;   // أزرار فلترة المحطات ومراكز الزيوت والتحويل
  headerNoticeText?: string;      // شريط تنويهات متحرك أعلى الخريطة
  globalStationLogoUrl?: string;  // الشعار العام الموحد لكافة المحطات على الخريطة
  customAppLogoUrl?: string;      // لوجو التطبيق المخصص المرفوع (يطبق على شريط الرأس والدليل والواجهة)
  sloganText?: string;            // شعار كارجاس النصي (مثال: كارجاس\nطريقنا واحد)
  gasFilterText?: string;         // اسم زر محطات الغاز
  conversionFilterText?: string;  // اسم زر مراكز التحويل والصيانة
  oilFilterText?: string;         // اسم زر مراكز الزيوت
  inspectionFilterText?: string;  // اسم زر فحص الأسطوانات
  customGovernorates?: Array<{ id: string; label: string; keywords: string[] }>; // تحكم المدير في المحافظات والأقاليم
}
