import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Station, NavigationState, AppConfig, CargasFacilityType, CongestionLevel } from './types';
import { INITIAL_CARGAS_STATIONS } from './data/initialStations';
import { calculateRoute, getDistanceMeters } from './services/routingService';
import { speechService } from './services/speechService';
import { MapComponent, MapStyleType } from './components/MapComponent';
import { HeaderBar } from './components/HeaderBar';
import { NavigationOverlay } from './components/NavigationOverlay';
import { StationDetailSheet } from './components/StationDetailSheet';
import { StopSafetyModal } from './components/StopSafetyModal';
import { AdminModal } from './components/AdminModal';
import { KmzUploaderModal } from './components/KmzUploaderModal';
import { VoiceNavigatorModal } from './components/VoiceNavigatorModal';
import { StationsListDrawer } from './components/StationsListDrawer';
import { CargasNationwideModal } from './components/CargasNationwideModal';
import { DragDropMapTool } from './components/DragDropMapTool';
import { CARGAS_LOGO_SVG } from './utils/cargasLogo';
import { getStoredCustomLogo, saveStoredCustomLogo } from './utils/imageCompressor';
import { Locate, Building2, Move, Mic, MicOff, X } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  adminPassword: '0000',
  cargasOnlyMode: true,
  hideOtherPOIs: true,
  moeinVoiceEnabled: true,
  moeinVisibleToUsers: true,
  moeinAllowedTopics: ['محطات كارجاس', 'مراكز التحويل', 'مراكز الزيوت', 'نظام STOP للسلامة'],
  moeinCustomPromptNote: 'أنت المساعد الذكي لمواقع ومحطات ومراكز كارجاس للغاز الطبيعي للسيارات، تحدث بصوت شاكر المصري الودود ووجه السائقين خطوة بخطوة.',
  brandAccentColor: '#008844',
  theme: 'dark',
  language: 'ar',
  appTitle: 'كارجاس - الغاز الطبيعي للسيارات',
  appSubtitle: 'محطات الغاز • مراكز التحويل • مراكز الزيوت المعتمدة',
  ezoutiBadgeVisible: true,
  trafficCrowdAlertsEnabled: true,
  simpleDriverMode: true,

  showNearestStationBtn: true,
  nearestStationBtnText: 'أقرب محطة كارجاس',
  showVoiceMicBtn: true,
  voiceMicBtnText: 'أوامر صوتية',
  showNationwideBtn: true,
  nationwideBtnText: 'محطات كار جاس',
  showStopSafetyBtn: true,
  showAudioMuteBtn: true,
  showLocateMeBtn: true,
  showBottomDrawer: true,
  showCrowdBadges: true,
  showFacilityFilters: true,
  headerNoticeText: '',
  globalStationLogoUrl: '',
  customAppLogoUrl: '',
  sloganText: 'كارجاس\nطريقنا واحد',
  gasFilterText: 'محطات الغاز',
  conversionFilterText: 'مراكز التحويل والصيانة',
  oilFilterText: 'مراكز الزيوت (BP)',
  inspectionFilterText: 'فحص الأسطوانات',
  // Map Frame & App Outer Background Defaults
  enableMapFrame: true,
  mapFrameWidth: 3,
  mapFrameColor: '#059669',
  mapFrameRadius: 18,
  mapFrameStyle: 'solid',
  appOuterBgColor: '#090d16',
  mapFramePadding: 4,
  customGovernorates: [
    { id: 'all', label: 'كل المحافظات', keywords: [] },
    { id: 'cairo_giza', label: 'القاهرة والجيزة', keywords: ['القاهرة', 'الجيزة', 'مدينة نصر', 'مصر الجديدة', 'أكتوبر', 'الدقي', 'المعادي', 'حلوان', 'شبرا'] },
    { id: 'alex', label: 'الإسكندرية والساحل', keywords: ['الإسكندرية', 'برج العرب', 'العجمي', 'سموحة', 'الساحل'] },
    { id: 'canal', label: 'مدن القناة (السويس وبورسعيد والإسماعيلية)', keywords: ['السويس', 'بورسعيد', 'الإسماعيلية'] },
    { id: 'delta', label: 'الدلتا (الغربية والدقهلية والبحيرة والمنوفية)', keywords: ['طنطا', 'المنصورة', 'الغربية', 'الدقهلية', 'دمنهور', 'الزقازيق', 'الشرقية', 'المنوفية', 'شبين الكوم'] },
    { id: 'upper_egypt', label: 'الصعيد (بني سويف والمنيا وأسيوط وقنا وسوهاج)', keywords: ['بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان'] },
    { id: 'tenth', label: 'العاشر من رمضان ومدن القناة الشرقية', keywords: ['العاشر', 'بلبيس', 'بدر', 'الشروق'] }
  ],
};

export default function App() {
  // Load stations from localStorage or initial Cargas stations (Strictly Cargas only)
  const [stations, setStations] = useState<Station[]>(() => {
    try {
      const saved = localStorage.getItem('cargas_stations_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cargasOnly = parsed.filter((s: any) => s.company === 'كارجاس');
        if (cargasOnly.length > 0) return cargasOnly;
      }
    } catch {}
    return INITIAL_CARGAS_STATIONS;
  });

  // App Config with permanent custom logo restoration
  const [config, setConfig] = useState<AppConfig>(() => {
    const storedLogo = getStoredCustomLogo();
    try {
      const saved = localStorage.getItem('cargas_config_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          customAppLogoUrl: parsed.customAppLogoUrl || storedLogo || '',
          globalStationLogoUrl: parsed.globalStationLogoUrl || storedLogo || ''
        };
      }
    } catch {}
    return {
      ...DEFAULT_CONFIG,
      customAppLogoUrl: storedLogo || '',
      globalStationLogoUrl: storedLogo || ''
    };
  });

  // User Live Location (Defaults to Cairo - Nasr City / Almazah corridor)
  const [userLocation, setUserLocation] = useState<[number, number]>([30.0750, 31.3450]);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [isGpsContinuous, setIsGpsContinuous] = useState<boolean>(false);
  const gpsWatchIdRef = useRef<number | null>(null);

  // Direct Hands-Free Voice Assistant States (تلقي الصوت مباشرة دون فتح نافذة وبدعم عالمي لكافة المتصفحات)
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [voiceExecutionStatus, setVoiceExecutionStatus] = useState<string>('');
  const [showQuickVoiceBar, setShowQuickVoiceBar] = useState<boolean>(false);
  const voiceRecognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<any>(null);
  const isRecordingAudioRef = useRef<boolean>(false);

  // Clean up GPS tracking & Speech / Audio Recognition on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      }
      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  // Selected station
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFacility, setSelectedFacility] = useState<CargasFacilityType | 'all'>('all');
  const [filterLowCrowd, setFilterLowCrowd] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('google_streets');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCycleMapStyle = () => {
    const styles: MapStyleType[] = ['google_streets', 'google_hybrid', 'google_terrain', 'dark', 'osm'];
    const nextIdx = (styles.indexOf(mapStyle) + 1) % styles.length;
    setMapStyle(styles[nextIdx]);
  };

  // Modals
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState<boolean>(false);
  const [isNationwideModalOpen, setIsNationwideModalOpen] = useState<boolean>(false);
  const [isKmzModalOpen, setIsKmzModalOpen] = useState<boolean>(false);
  const [isVoiceNavigatorOpen, setIsVoiceNavigatorOpen] = useState<boolean>(false);

  // Handle importing stations from KMZ / KML
  const handleImportKmzStations = (imported: Station[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setStations(imported);
    } else {
      const existingIds = new Set(stations.map(s => s.id));
      const fresh = imported.filter(s => !existingIds.has(s.id));
      setStations(prev => [...fresh, ...prev]);
    }
    if (imported.length > 0) {
      setSelectedStation(imported[0]);
    }
    setToastMessage(`✅ تم استيراد وإضافة ${imported.length} محطة من ملف KMZ بنجاح!`);
  };

  // Admin Drag & Drop Positioning and Custom Logo Tool States
  const [isDragDropToolOpen, setIsDragDropToolOpen] = useState<boolean>(false);
  const [isAdminEditMode, setIsAdminEditMode] = useState<boolean>(false);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string>(() => {
    return getStoredCustomLogo() || '';
  });

  // Handle station dragged to a new position on the map
  const handleStationPositionChange = (stationId: string, newLat: number, newLng: number) => {
    setStations(prev => prev.map(s => {
      if (s.id === stationId) {
        return {
          ...s,
          lat: parseFloat(newLat.toFixed(6)),
          lng: parseFloat(newLng.toFixed(6)),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
    setToastMessage('📍 تم تعديل الموقع الفعلي للمحطة بنجاح!');
    speechService.playChime('turn');
  };

  // Apply custom uploaded logo to ALL stations across the whole map AND to the app logo itself permanently
  const handleApplyLogoToAllStations = (logoUrl: string) => {
    saveStoredCustomLogo(logoUrl);
    setStations(prev => prev.map(s => ({
      ...s,
      customLogoUrl: logoUrl || undefined,
      updatedAt: new Date().toISOString()
    })));
    setConfig(prev => ({
      ...prev,
      globalStationLogoUrl: logoUrl || undefined,
      customAppLogoUrl: logoUrl || undefined
    }));
    setUploadedLogoUrl(logoUrl);
    setToastMessage(logoUrl ? `✍️ تم تثبيت اللوجو وتطبيقه على التطبيق وكافة المحطات بالخريطة (${stations.length} محطة) بنجاح!` : 'تمت استعادة الشعار الرسمي لكافة المحطات وللتطبيق');
    speechService.playChime('turn');
  };

  // Handle dropping a new facility token onto the map
  const handleDropNewStation = (lat: number, lng: number, data: any) => {
    const facilityType: CargasFacilityType = data.facilityType || 'station';
    const name: string = data.name || 'محطة كارجاس متكاملة';
    const customLogoUrl: string = data.customLogoUrl || uploadedLogoUrl || config.globalStationLogoUrl || '';

    const newStation: Station = {
      id: `cargas-drop-${Date.now()}`,
      name,
      company: 'كارجاس',
      facilityType,
      address: `الموقع الميداني المحدد على الخريطة (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      customLogoUrl: customLogoUrl || undefined,
      cng: data.cng ?? true,
      petrol: facilityType === 'station',
      conversionCenter: data.conversionCenter ?? (facilityType === 'conversion_center'),
      oilCenter: data.oilCenter ?? (facilityType === 'oil_center'),
      cylinderInspection: data.cylinderInspection ?? (facilityType === 'cylinder_testing'),
      cngNozzles: 8,
      pressureBar: 220,
      congestionLevel: 'low',
      waitTimeMinutes: 3,
      verified: true,
      workingHours: '24 ساعة',
      services: ['تموين غاز طبيعي كارجاس', 'خدمات سيارات'],
      notes: 'تمت إضافتها وتثبيت موقعها بالسحب والإفلات المباشر على الخريطة'
    };

    setStations(prev => [newStation, ...prev]);
    setSelectedStation(newStation);
    setToastMessage(` تم إنشاء وتثبيت "${name}" في هذا الموقع فورياً!`);
    speechService.playChime('arrive');
  };

  // Navigation State
  const [navigation, setNavigation] = useState<NavigationState>({
    isActive: false,
    targetStation: null,
    currentStepIndex: 0,
    isMuted: false,
    voiceSpeed: 0.95,
    remainingDistanceKm: 0,
    remainingDurationMin: 0,
    routeCoordinates: [],
    steps: [],
    isSimulating: false,
  });

  const simulationIntervalRef = useRef<any>(null);

  // Save to localStorage safely (protect against quota errors)
  useEffect(() => {
    try {
      localStorage.setItem('cargas_stations_v2', JSON.stringify(stations));
    } catch (err) {
      console.warn('LocalStorage quota limit reached, saving optimized station data:', err);
      try {
        const currentGlobalLogo = config.globalStationLogoUrl || config.customAppLogoUrl || getStoredCustomLogo();
        const optimized = stations.map(s => ({
          ...s,
          customLogoUrl: (s.customLogoUrl && s.customLogoUrl === currentGlobalLogo) ? undefined : s.customLogoUrl
        }));
        localStorage.setItem('cargas_stations_v2', JSON.stringify(optimized));
      } catch {}
    }
  }, [stations, config.globalStationLogoUrl, config.customAppLogoUrl]);

  useEffect(() => {
    try {
      localStorage.setItem('cargas_config_v2', JSON.stringify(config));
    } catch {}
    if (config.customAppLogoUrl) {
      saveStoredCustomLogo(config.customAppLogoUrl);
    }
  }, [config]);

  // Try fetching user GPS location
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setGpsActive(true);
        },
        () => {
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Filtered Cargas Stations
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // Hidden station check (unless in admin edit mode)
      if (station.isHidden && !isAdminEditMode) {
        return false;
      }

      // Cargas Only Mode check
      if (config.cargasOnlyMode && station.company !== 'كارجاس') {
        return false;
      }

      // Facility type match
      if (selectedFacility === 'station' && !station.cng) return false;
      if (selectedFacility === 'conversion_center' && !station.conversionCenter) return false;
      if (selectedFacility === 'oil_center' && !station.oilCenter) return false;
      if (selectedFacility === 'cylinder_testing' && !station.cylinderInspection) return false;

      // Low crowd only
      if (filterLowCrowd && station.congestionLevel !== 'low') {
        return false;
      }

      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const combined = `${station.name} ${station.address} ${station.services.join(' ')} ${station.notes || ''}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }
      return true;
    });
  }, [stations, selectedFacility, filterLowCrowd, searchQuery, config.cargasOnlyMode, isAdminEditMode]);

  // One-Click Nearest Cargas Site (Voice response in Shakir's voice)
  const handleUpdateStationName = (stationId: string, newName: string) => {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    const updated = stations.map(s => s.id === stationId ? { ...s, name: trimmed, updatedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } : s);
    setStations(updated);
    if (selectedStation && selectedStation.id === stationId) {
      setSelectedStation(prev => prev ? { ...prev, name: trimmed } : null);
    }
    showToast(`✅ تم حفظ وتعديل اسم المحطة: "${trimmed}"`);
  };

  const handleFindNearest = () => {
    speechService.playChime('turn');
    const sorted = [...stations].sort((a, b) => {
      return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
             getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
    });

    if (sorted.length > 0) {
      const nearest = sorted[0];
      const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
      
      // Close blocking sheet and start turn-by-turn navigation directly
      setSelectedStation(null);
      handleStartNavigation(nearest);
      
      const reply = `بدأنا الملاحة فوراً لأقرب محطة ليك: ${nearest.name}، على بعد ${distKm} كيلو، ووقت الانتظار ${nearest.waitTimeMinutes} دقيقة. تفاصيل المحطة متاحة ليك في الشاشة بدون تعطيل الملاحة!`;
      speechService.speak(reply, { priority: true });
      showToast(`🚀 جاري الملاحة لأقرب محطة: ${nearest.name} (${distKm} كم)`);
    }
  };

  // Start Navigation
  const handleStartNavigation = async (station: Station) => {
    // Check crowd alert if enabled
    if (config.trafficCrowdAlertsEnabled && station.congestionLevel === 'high' && !navigation.isMuted) {
      speechService.playChime('alert');
      speechService.speak(`تنبيه: محطة ${station.name} بها زحام حالياً ووقت الانتظار حوالي ${station.waitTimeMinutes} دقيقة. جاري التوجيه.`, { priority: true });
    }

    const route = await calculateRoute(userLocation, [station.lat, station.lng], station.name);

    setNavigation({
      isActive: true,
      targetStation: station,
      currentStepIndex: 0,
      isMuted: navigation.isMuted,
      voiceSpeed: 0.95,
      remainingDistanceKm: route.distanceKm,
      remainingDurationMin: route.durationMin,
      routeCoordinates: route.coordinates,
      steps: route.steps,
      isSimulating: false,
    });

    // Close detail drawer
    setSelectedStation(null);

    // Initial voice instruction
    if (!navigation.isMuted) {
      speechService.playChime('turn');
      const startText = `بدأت الملاحة نحو محطة ${station.name}. ${route.steps[0]?.instruction || 'اتجه نحو المسار المحدد'}`;
      speechService.speak(startText, { priority: true });
    }
  };

  // Stop Navigation
  const handleStopNavigation = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setNavigation(prev => ({
      ...prev,
      isActive: false,
      targetStation: null,
      isSimulating: false,
      steps: [],
      routeCoordinates: [],
    }));
    speechService.stop();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !navigation.isMuted;
    setNavigation(prev => ({ ...prev, isMuted: nextMuted }));
    speechService.setMuted(nextMuted);
  };

  // Navigation Simulation (Turns & movement along route)
  const handleToggleSimulation = () => {
    if (navigation.isSimulating) {
      // Stop
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setNavigation(prev => ({ ...prev, isSimulating: false }));
    } else {
      // Start simulation
      setNavigation(prev => ({ ...prev, isSimulating: true }));
      simulationIntervalRef.current = setInterval(() => {
        setNavigation(prev => {
          if (!prev.isActive || prev.steps.length === 0) return prev;
          const nextIndex = prev.currentStepIndex + 1;
          if (nextIndex >= prev.steps.length) {
            // Arrived!
            if (simulationIntervalRef.current) {
              clearInterval(simulationIntervalRef.current);
              simulationIntervalRef.current = null;
            }
            if (!prev.isMuted) {
              speechService.playChime('arrive');
              speechService.speak(`وصلت إلى وجهتك: ${prev.targetStation?.name}. تموين آمن بالغاز الطبيعي!`, { priority: true });
            }
            return {
              ...prev,
              currentStepIndex: prev.steps.length - 1,
              isSimulating: false,
              remainingDistanceKm: 0,
              remainingDurationMin: 0
            };
          }

          // Advance to next step
          const nextStep = prev.steps[nextIndex];
          // Update simulated user location to step location
          if (nextStep?.location) {
            setUserLocation(nextStep.location);
          }

          const remainingKm = Math.max(0.1, prev.remainingDistanceKm - (prev.steps[prev.currentStepIndex]?.distance || 150) / 1000);
          const remainingMin = Math.max(1, Math.round((remainingKm / 30) * 60));

          return {
            ...prev,
            currentStepIndex: nextIndex,
            remainingDistanceKm: remainingKm,
            remainingDurationMin: remainingMin
          };
        });
      }, 4500);
    }
  };

  const handleNextStep = () => {
    setNavigation(prev => {
      const nextIndex = Math.min(prev.steps.length - 1, prev.currentStepIndex + 1);
      if (prev.steps[nextIndex]?.location) {
        setUserLocation(prev.steps[nextIndex].location);
      }
      return { ...prev, currentStepIndex: nextIndex };
    });
  };

  const handlePrevStep = () => {
    setNavigation(prev => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1)
    }));
  };

  // Update Station Congestion from user report
  const handleUpdateCongestion = (stationId: string, level: CongestionLevel, waitTime: number) => {
    setStations(prev => prev.map(s => {
      if (s.id === stationId) {
        return {
          ...s,
          congestionLevel: level,
          waitTimeMinutes: waitTime,
          updatedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        };
      }
      return s;
    }));
    if (selectedStation?.id === stationId) {
      setSelectedStation(prev => prev ? { ...prev, congestionLevel: level, waitTimeMinutes: waitTime } : null);
    }
  };

  // Direct Hands-Free Voice Command Processor (معالجة الأوامر الصوتية فوراً وتنفيذها دون أي نوافذ)
  const processDirectVoiceCommand = (command: string, customReply?: string) => {
    const q = command.trim().toLowerCase();
    if (!q) return;

    speechService.playChime('turn');

    // 1. Command: Stop Navigation (إيقاف الملاحة)
    if (q.includes('وقف الملاحة') || q.includes('الغاء الملاحة') || q.includes('إيقاف الملاحة') || q.includes('stop navigation')) {
      handleStopNavigation();
      showToast('🛑 تم إيقاف مسار الملاحة');
      speechService.speak(customReply || 'تم إيقاف الملاحة.', { priority: true });
      return;
    }

    // 2. Command: Continuous GPS Tracking (تفعيل الجي بي اس لتحديد الموقع تلقائياً وبشكل مستمر)
    if (
      (q.includes('تفعيل') || q.includes('شغل') || q.includes('فتح') || q.includes('تتبع') || q.includes('ابدا')) &&
      (q.includes('جي بي اس') || q.includes('gps') || q.includes('تتبع') || q.includes('موقع') || q.includes('تلقائي')) ||
      q.includes('تفعيل الجي بي اس') ||
      q.includes('تفعيل gps') ||
      q.includes('تحديد الموقع تلقائيا') ||
      q.includes('تتبع موقعي')
    ) {
      handleToggleContinuousGps(true);
      return;
    }

    // 3. Command: Stop GPS Tracking (إيقاف تتبع الجي بي اس)
    if (
      (q.includes('ايقاف') || q.includes('إيقاف') || q.includes('الغاء') || q.includes('وقف') || q.includes('قفل')) &&
      (q.includes('جي بي اس') || q.includes('gps') || q.includes('تتبع'))
    ) {
      handleToggleContinuousGps(false);
      return;
    }

    // 4. Command: Find Nearest Station (أقرب محطة لموقعي - يبدأ الملاحة فوراً)
    if (
      q.includes('اقرب') || 
      q.includes('أقرب') || 
      q.includes('قريب') || 
      q.includes('موقعي') || 
      q.includes('هنا') ||
      q.includes('اقرب محطة') ||
      q.includes('أقرب محطة لموقعي') ||
      q.includes('عايز محطة') ||
      q.includes('فين محطة')
    ) {
      const sorted = [...stations].sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });
      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setSelectedStation(null);
        handleStartNavigation(nearest);
        const reply = customReply || `بدأنا الملاحة فوراً لأقرب محطة كار جاس ليك: ${nearest.name}، على بعد ${distKm} كم. وقت الانتظار ${nearest.waitTimeMinutes} دقيقة.`;
        speechService.speak(reply, { priority: true });
        showToast(`🚀 بدأنا الملاحة لأقرب محطة: ${nearest.name} (${distKm} كم)`);
        return;
      }
    }

    // 5. Command: Conversion Center (مراكز التحويل والصيانة)
    if (q.includes('تحويل') || q.includes('صيانة') || q.includes('تركيب غاز')) {
      const convStations = stations.filter(s => s.conversionCenter);
      const sorted = convStations.sort((a, b) => 
        getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
        getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng)
      );
      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setSelectedStation(null);
        handleStartNavigation(nearest);
        const reply = customReply || `أقرب مركز تحويل وصيانة معتمد لكار جاس هو ${nearest.name}، على بعد ${distKm} كم، وبدأنا الملاحة نحوه.`;
        speechService.speak(reply, { priority: true });
        showToast(`🛠️ مركز تحويل وصيانة: ${nearest.name}`);
        return;
      }
    }

    // 6. Command: Oil Centers (مراكز زيوت بي بي)
    if (q.includes('زيت') || q.includes('زيوت') || q.includes('bp') || q.includes('بي بي')) {
      const oilStations = stations.filter(s => s.oilCenter);
      const sorted = oilStations.sort((a, b) => 
        getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
        getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng)
      );
      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setSelectedStation(null);
        handleStartNavigation(nearest);
        const reply = customReply || `أقرب مركز زيوت بي بي معتمد في كار جاس هو ${nearest.name}، على بعد ${distKm} كم، وجاري توجيهك.`;
        speechService.speak(reply, { priority: true });
        showToast(`🛢️ مركز زيوت بي بي: ${nearest.name}`);
        return;
      }
    }

    // 7. Command: Cylinder Testing (فحص واختبار الأسطوانات)
    if (q.includes('فحص') || q.includes('أسطوان') || q.includes('اسطوان')) {
      const testStations = stations.filter(s => s.cylinderInspection);
      const sorted = testStations.sort((a, b) => 
        getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
        getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng)
      );
      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setSelectedStation(null);
        handleStartNavigation(nearest);
        const reply = customReply || `أقرب مركز فحص واختبار أسطوانات هو ${nearest.name}، على بعد ${distKm} كم، وبدأنا الملاحة.`;
        speechService.speak(reply, { priority: true });
        showToast(`🔍 فحص أسطوانات: ${nearest.name}`);
        return;
      }
    }

    // 8. Command: Low Congestion (محطة رايقة بدون زحام)
    if (q.includes('رايق') || q.includes('زحمة') || q.includes('زحام') || q.includes('فاضي') || q.includes('طابور')) {
      const lowCrowd = stations.filter(s => s.congestionLevel === 'low').sort((a, b) => 
        getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
        getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng)
      );
      if (lowCrowd.length > 0) {
        const nearest = lowCrowd[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setSelectedStation(null);
        handleStartNavigation(nearest);
        const reply = customReply || `لقيتلك محطة كار جاس رايقة بدون طوابير: ${nearest.name} على بعد ${distKm} كم، وقت الانتظار ${nearest.waitTimeMinutes} دقيقة بس!`;
        speechService.speak(reply, { priority: true });
        showToast(`🟢 محطة رايقة: ${nearest.name}`);
        return;
      }
    }

    // 9. Command: Search by Area / Name / District
    const cleanQ = q
      .replace(/محطة|محطه|كار جاس|كارجاس|عايز|عاوز|فين|اروح|مركز/g, '')
      .trim();

    const matched = stations.filter(s => {
      const fullText = `${s.name} ${s.address} ${s.services.join(' ')} ${s.notes || ''}`.toLowerCase();
      return fullText.includes(cleanQ || q);
    }).sort((a, b) => 
      getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
      getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng)
    );

    if (matched.length > 0) {
      const best = matched[0];
      const distKm = (getDistanceMeters(userLocation[0], userLocation[1], best.lat, best.lng) / 1000).toFixed(1);
      setSelectedStation(null);
      handleStartNavigation(best);
      const reply = customReply || `وجدت محطة كار جاس: ${best.name} على بعد ${distKm} كم. بدأنا الملاحة نحوها فوراً.`;
      speechService.speak(reply, { priority: true });
      showToast(`🚀 جاري الملاحة: ${best.name}`);
      return;
    }

    // Fallback: search filter
    setSearchQuery(command);
    showToast(`بحث عن: ${command}`);
    speechService.speak(customReply || `جاري البحث على الخريطة عن ${command}`, { priority: true });
  };

  // Universal MediaRecorder Engine (يعمل في كافة المتصفحات Safari, iOS, Chrome, Firefox بدون قيود)
  const startMediaRecorderVoice = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceExecutionStatus('⚡ اضغط على الأمر المطلوب مباشرة:');
        setShowQuickVoiceBar(true);
        speechService.playChime('turn');
        speechService.speak('اختر أمرك المطلوب وسأوجهك فوراً!', { priority: true });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingAudioRef.current = true;
      setIsListeningVoice(true);
      setShowQuickVoiceBar(false);
      speechService.playChime('turn');
      setVoiceExecutionStatus('🎙️ جارٍ الاستماع عبر المايك... تحدث بأمرك الآن');

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListeningVoice(false);
        isRecordingAudioRef.current = false;
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch {}

        if (audioChunksRef.current.length === 0) {
          setVoiceExecutionStatus('');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 600) {
          setVoiceExecutionStatus('');
          return;
        }

        setVoiceExecutionStatus('⏳ جاري فهم الأمر الصوتي وتنفيذه...');

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string)?.split(',')[1];
              if (!base64Data) {
                setVoiceExecutionStatus('');
                return;
              }

              const res = await fetch('/api/voice-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Data, mimeType })
              });

              if (res.ok) {
                const data = await res.json();
                const transcript = data.transcript || 'أقرب محطة لموقعي';
                setLiveTranscript(transcript);
                setVoiceExecutionStatus(`✅ تم الفهم: «${transcript}» - جاري التنفيذ...`);
                processDirectVoiceCommand(transcript, data.reply);
              } else {
                setVoiceExecutionStatus('✅ جاري توجيهك لأقرب محطة كار جاس...');
                processDirectVoiceCommand('أقرب محطة لموقعي');
              }
            } catch (err) {
              console.warn('Voice command parse error:', err);
              processDirectVoiceCommand('أقرب محطة لموقعي');
            }

            setTimeout(() => {
              setVoiceExecutionStatus('');
              setLiveTranscript('');
            }, 3500);
          };
        } catch (e) {
          console.warn('Voice file reading error:', e);
          processDirectVoiceCommand('أقرب محطة لموقعي');
        }
      };

      mediaRecorder.start(250);

      // Auto-stop after 4.2 seconds so user doesn't have to keep pressing
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try { mediaRecorderRef.current.stop(); } catch {}
        }
      }, 4200);

    } catch (err: any) {
      console.warn('Microphone permission or capture error:', err);
      setIsListeningVoice(false);
      isRecordingAudioRef.current = false;
      // Never show "unsupported" error! Show friendly quick commands bar right on screen
      setVoiceExecutionStatus('⚡ اضغط على أمرك السريع لتنفيذه فوراً:');
      setShowQuickVoiceBar(true);
      speechService.playChime('turn');
      speechService.speak('اختر أمرك المطلوب وسأوجهك فوراً!', { priority: true });
    }
  };

  // Direct Toggle Voice Recognition (يبدأ مباشرة في الاستماع بالصوت دون فتح نافذة وبدون الضغط باستمرار)
  const handleToggleDirectVoice = () => {
    // If currently listening, stop immediately and submit
    if (isListeningVoice) {
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch {}
        return;
      }

      if (voiceRecognitionRef.current) {
        try { voiceRecognitionRef.current.stop(); } catch {}
      }
      setIsListeningVoice(false);
      setVoiceExecutionStatus('');
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // If browser supports native Web Speech API, try it first
    if (SpeechRecognitionClass) {
      try {
        if (voiceRecognitionRef.current) {
          try { voiceRecognitionRef.current.stop(); } catch {}
        }

        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'ar-EG'; // Egyptian Arabic
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;

        voiceTranscriptRef.current = '';
        setLiveTranscript('');
        setVoiceExecutionStatus('🎙️ استمع إليك الآن... تحدث بأمرك');

        recognition.onstart = () => {
          setIsListeningVoice(true);
          setShowQuickVoiceBar(false);
          speechService.playChime('turn');
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
            voiceTranscriptRef.current = text;
            setLiveTranscript(text);
          }
        };

        recognition.onend = () => {
          setIsListeningVoice(false);
          const spoken = voiceTranscriptRef.current.trim();
          if (spoken) {
            setVoiceExecutionStatus(`✅ تم التقاط: «${spoken}» - جاري التنفيذ...`);
            processDirectVoiceCommand(spoken);
            setTimeout(() => {
              setVoiceExecutionStatus('');
              setLiveTranscript('');
            }, 3500);
          } else {
            setVoiceExecutionStatus('');
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Direct speech recognition error, switching to universal audio recorder:', e?.error);
          setIsListeningVoice(false);
          // Seamless fallback to universal MediaRecorder so user NEVER gets blocked or sees "unsupported"
          startMediaRecorderVoice();
        };

        voiceRecognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Native speech recognition failed to start, falling back to MediaRecorder:', err);
      }
    }

    // In Safari, Firefox, iOS, embedded browsers, or if SpeechRecognition was absent:
    // Seamlessly start universal MediaRecorder!
    startMediaRecorderVoice();
  };

  // Toggle or start continuous GPS tracking (تحديد وتتبع الموقع تلقائياً وبشكل مستمر)
  const handleToggleContinuousGps = (forceEnable?: boolean) => {
    const shouldEnable = forceEnable !== undefined ? forceEnable : !isGpsContinuous;

    if (!shouldEnable) {
      if (gpsWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      setIsGpsContinuous(false);
      setGpsActive(false);
      showToast('تم إيقاف تتبع GPS التلقائي');
      speechService.speak('تم إيقاف التتبع التلقائي للجي بي اس', { priority: true });
      return;
    }

    if (!navigator.geolocation) {
      showToast('متصفحك لا يدعم نظام تحديد المواقع GPS');
      speechService.speak('عذراً، متصفحك لا يدعم نظام الجي بي اس', { priority: true });
      return;
    }

    // Clear existing watch if present
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    }

    // Instant initial location acquisition
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setGpsActive(true);
      },
      (err) => {
        console.warn('Initial GPS query warning:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Continuous watchPosition for automatic real-time tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setGpsActive(true);
        setIsGpsContinuous(true);
      },
      (err) => {
        console.warn('GPS continuous tracking error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setIsGpsContinuous(false);
          setGpsActive(false);
          showToast('يرجى السماح بصلاحية الموقع GPS من إعدادات المتصفح');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 15000,
      }
    );

    gpsWatchIdRef.current = watchId;
    setIsGpsContinuous(true);
    setGpsActive(true);
    showToast('🛰️ تم تفعيل نظام GPS للتتبع المستمر وتحديث موقعك تلقائياً!');
    speechService.playChime('arrive');
    speechService.speak('تم تفعيل نظام الجي بي اس بنجاح، وجاري تتبع وتحديث موقعك تلقائياً وبشكل مستمر على الخريطة! 🛰️', { priority: true });
  };

  // Re-center on user GPS or toggle continuous tracking
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('تعذر الوصول إلى GPS. تم اعتماد الموقع التقديري بمدينة نصر / القاهرة.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGpsActive(true);
        showToast('تم تحديد وتثبيت موقعك الحالي بدقة عبر GPS بنجاح! 📍');
        speechService.playChime('arrive');
      },
      () => {
        showToast('تعذر الوصول إلى GPS. تم اعتماد الموقع التقديري بمدينة نصر / القاهرة.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Calculate map frame and outer background styles based on admin config with Mobile responsiveness
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const rawPadding = config.enableMapFrame ? (config.mapFramePadding ?? 4) : 0;
  const rawRadius = config.enableMapFrame ? (config.mapFrameRadius ?? 18) : 0;
  const rawWidth = config.enableMapFrame ? (config.mapFrameWidth ?? 3) : 0;

  // Adapt map frame elegantly to fit mobile screens without edge-cutting or overflow
  const mapFramePadding = isMobile ? Math.min(rawPadding, 2) : rawPadding;
  const mapFrameRadius = isMobile ? Math.min(rawRadius, 14) : rawRadius;
  const mapFrameWidth = isMobile ? Math.min(rawWidth, 2.5) : rawWidth;
  const mapFrameColor = config.mapFrameColor || '#059669';
  const mapFrameStyle = config.mapFrameStyle || 'solid';
  const appOuterBg = config.appOuterBgColor || '#090d16';

  let borderStyleCss = 'solid';
  let boxShadowCss = '0 10px 30px rgba(0,0,0,0.5)';
  if (mapFrameStyle === 'double') {
    borderStyleCss = 'double';
  } else if (mapFrameStyle === 'dashed') {
    borderStyleCss = 'dashed';
  } else if (mapFrameStyle === 'glow') {
    borderStyleCss = 'solid';
    boxShadowCss = `0 0 20px ${mapFrameColor}, 0 0 40px ${mapFrameColor}66, inset 0 0 15px ${mapFrameColor}44`;
  }

  return (
    <div 
      className="relative w-full h-screen min-h-[100dvh] max-h-[100dvh] overflow-hidden font-['Cairo'] select-none flex flex-col items-center justify-center transition-colors duration-300"
      style={{ backgroundColor: appOuterBg }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1300] bg-slate-900/95 text-white border border-emerald-500/60 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs md:text-sm font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Map with Admin-Controlled Responsive Mobile Frame */}
      <div
        className="relative w-full h-full overflow-hidden transition-all duration-300"
        style={{
          padding: `${mapFramePadding}px`,
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden transition-all duration-300 shadow-2xl"
          style={{
            borderWidth: `${mapFrameWidth}px`,
            borderColor: mapFrameColor,
            borderStyle: borderStyleCss,
            borderRadius: `${mapFrameRadius}px`,
            boxShadow: boxShadowCss,
          }}
        >
          <MapComponent
            stations={filteredStations}
            selectedStation={selectedStation}
            userLocation={userLocation}
            onSelectStation={(s) => setSelectedStation(s)}
            navigationState={navigation}
            mapStyle={mapStyle}
            onCycleMapStyle={handleCycleMapStyle}
            isAdminEditMode={isAdminEditMode}
            globalStationLogoUrl={config.globalStationLogoUrl || config.customAppLogoUrl || uploadedLogoUrl || getStoredCustomLogo()}
            onStationPositionChange={handleStationPositionChange}
            onDropNewStation={handleDropNewStation}
            hideOtherPOIs={config.hideOtherPOIs ?? true}
            isGpsActive={isGpsContinuous || gpsActive}
          />
        </div>
      </div>

      {/* Admin Drag and Drop Floating Tool (when activated) */}
      {isDragDropToolOpen && !navigation.isActive && (
        <DragDropMapTool
          stations={stations}
          onSaveStations={setStations}
          isAdminEditMode={isAdminEditMode}
          onToggleAdminEditMode={() => setIsAdminEditMode(!isAdminEditMode)}
          uploadedLogoUrl={uploadedLogoUrl || config.globalStationLogoUrl || config.customAppLogoUrl || getStoredCustomLogo()}
          onLogoUpload={(logo) => {
            saveStoredCustomLogo(logo);
            setUploadedLogoUrl(logo);
            setConfig(prev => ({
              ...prev,
              customAppLogoUrl: logo || undefined,
              globalStationLogoUrl: logo || undefined
            }));
            setToastMessage('✅ تم تثبيت اللوجو على التطبيق وجاهز للسحب على الخريطة!');
          }}
          onApplyLogoToAllStations={handleApplyLogoToAllStations}
          onStationDropToCreate={(data) => handleDropNewStation(data.lat, data.lng, data)}
          onClose={() => setIsDragDropToolOpen(false)}
        />
      )}

      {/* Direct Voice Assistant Live Status Floating Banner & Quick Commands (Non-blocking / No modal) */}
      {(isListeningVoice || voiceExecutionStatus || showQuickVoiceBar) && (
        <div className="fixed top-28 md:top-24 left-1/2 -translate-x-1/2 z-[1400] max-w-lg w-[94%] sm:w-auto px-4 py-3 rounded-2xl bg-slate-900/98 border-2 border-emerald-400 text-white shadow-2xl backdrop-blur-xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <span className={`w-3.5 h-3.5 rounded-full absolute ${isListeningVoice ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></span>
              <span className={`w-3.5 h-3.5 rounded-full relative ${isListeningVoice ? 'bg-rose-600' : 'bg-emerald-600'}`}></span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-emerald-300 truncate">
                {liveTranscript ? `«${liveTranscript}»` : (voiceExecutionStatus || '🎙️ جارٍ الاستماع... تحدث بأمرك الآن')}
              </div>
              <div className="text-[10px] text-slate-300 truncate">
                {isListeningVoice ? 'تحدث الآن: «أقرب محطة لموقعي» أو «تفعيل الجي بي اس» أو اسم المحطة' : 'تم التقاط وفهم الأمر الصوتي'}
              </div>
            </div>
            {isListeningVoice && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 h-5">
                  <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                  <span className="w-1.5 h-5 bg-teal-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-4 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDirectVoice}
                  className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow transition cursor-pointer active:scale-95 border border-emerald-300/40"
                  title="إنهاء التحدث وإرسال الأمر فوراً"
                >
                  إرسال ⚡
                </button>
              </div>
            )}
            <button
              onClick={() => {
                if (voiceRecognitionRef.current) {
                  try { voiceRecognitionRef.current.stop(); } catch {}
                }
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                  try { mediaRecorderRef.current.stop(); } catch {}
                }
                if (recordingTimeoutRef.current) {
                  clearTimeout(recordingTimeoutRef.current);
                }
                setIsListeningVoice(false);
                setVoiceExecutionStatus('');
                setShowQuickVoiceBar(false);
              }}
              className="p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* One-Tap Instant Command Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 border-t border-slate-700/60 pt-2 text-[11px]">
            <span className="text-[10px] font-bold text-amber-300 shrink-0">⚡ أوامر سريعة:</span>
            <button
              type="button"
              onClick={() => {
                setShowQuickVoiceBar(false);
                setVoiceExecutionStatus('✅ تم اختيار: أقرب محطة لموقعي');
                processDirectVoiceCommand('أقرب محطة لموقعي');
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-white font-bold whitespace-nowrap cursor-pointer transition active:scale-95 border border-emerald-400/40"
            >
              📍 أقرب محطة كارجاس
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickVoiceBar(false);
                setVoiceExecutionStatus('✅ تم اختيار: تفعيل الجي بي اس');
                processDirectVoiceCommand('تفعيل الجي بي اس');
              }}
              className="px-2.5 py-1 rounded-xl bg-teal-700/90 hover:bg-teal-600 text-white font-bold whitespace-nowrap cursor-pointer transition active:scale-95 border border-teal-400/40"
            >
              🛰️ تفعيل وتتبع GPS
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickVoiceBar(false);
                setVoiceExecutionStatus('✅ تم اختيار: مراكز التحويل');
                processDirectVoiceCommand('مراكز التحويل والصيانة');
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-700/90 hover:bg-amber-600 text-white font-bold whitespace-nowrap cursor-pointer transition active:scale-95 border border-amber-400/40"
            >
              🛠️ مراكز التحويل
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickVoiceBar(false);
                setVoiceExecutionStatus('✅ تم اختيار: مراكز الزيوت');
                processDirectVoiceCommand('مراكز زيوت بي بي');
              }}
              className="px-2.5 py-1 rounded-xl bg-blue-700/90 hover:bg-blue-600 text-white font-bold whitespace-nowrap cursor-pointer transition active:scale-95 border border-blue-400/40"
            >
              🛢️ زيوت بي بي BP
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickVoiceBar(false);
                setVoiceExecutionStatus('✅ تم اختيار: فحص الأسطوانات');
                processDirectVoiceCommand('فحص الأسطوانات');
              }}
              className="px-2.5 py-1 rounded-xl bg-purple-700/90 hover:bg-purple-600 text-white font-bold whitespace-nowrap cursor-pointer transition active:scale-95 border border-purple-400/40"
            >
              🔍 فحص الأسطوانات
            </button>
            {navigation.isActive && (
              <button
                type="button"
                onClick={() => {
                  setShowQuickVoiceBar(false);
                  setVoiceExecutionStatus('🛑 تم إيقاف الملاحة');
                  processDirectVoiceCommand('إيقاف الملاحة');
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-700/90 hover:bg-rose-600 text-white font-bold whitespace-nowrap cursor-pointer transition active:scale-95 border border-rose-400/40"
              >
                🛑 إيقاف الملاحة
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header Bar */}
      {!navigation.isActive && (
        <HeaderBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFacility={selectedFacility}
          onSelectFacility={setSelectedFacility}
          filterLowCrowd={filterLowCrowd}
          onToggleLowCrowd={() => setFilterLowCrowd(!filterLowCrowd)}
          mapStyle={mapStyle}
          onChangeMapStyle={setMapStyle}
          isMuted={navigation.isMuted}
          onToggleMute={handleToggleMute}
          onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
          onOpenNationwideModal={() => setIsNationwideModalOpen(true)}
          onSecretAdminTrigger={() => setIsAdminModalOpen(true)}
          onVoiceQuery={processDirectVoiceCommand}
          onFindNearest={handleFindNearest}
          onLocateMe={handleLocateMe}
          config={config}
          isGpsActive={gpsActive || isGpsContinuous}
          onToggleGpsTracking={() => handleToggleContinuousGps()}
          isListeningVoice={isListeningVoice}
          onToggleDirectVoice={handleToggleDirectVoice}
        />
      )}

      {/* Continuous GPS Live Tracking Indicator Badge */}
      {isGpsContinuous && !navigation.isActive && (
        <button
          onClick={() => handleToggleContinuousGps(false)}
          className="fixed top-24 left-4 z-[550] bg-slate-900/95 border-2 border-emerald-400 text-emerald-300 px-3.5 py-1.5 rounded-2xl text-[11px] font-black shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition active:scale-95 animate-in fade-in"
          title="نظام تتبع GPS التلقائي نشط - انقر للإيقاف"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>🛰️ GPS نشط (تتبع تلقائي مستمر)</span>
        </button>
      )}

      {/* Floating Buttons: Locate Me, Voice Navigator & Admin Drag Tools (KMZ button hidden from normal UI) */}
      {!navigation.isActive && (
        <div className="fixed top-40 right-4 z-[500] flex flex-col gap-2">
          {/* Direct Hands-Free Voice Assistant Floating Button (دون فتح نافذة) */}
          <button
            onClick={handleToggleDirectVoice}
            className={`w-12 h-12 rounded-2xl border-2 shadow-2xl backdrop-blur-md flex items-center justify-center cursor-pointer transition active:scale-95 group ${
              isListeningVoice
                ? 'bg-rose-600 text-white border-rose-300 ring-4 ring-rose-400/60 shadow-rose-500/50 animate-pulse'
                : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white border-emerald-400/80 shadow-emerald-500/30'
            }`}
            title={isListeningVoice ? "جارٍ الاستماع... انقر للإيقاف" : "أوامر صوتية فورية (انقر وتحدث دون نوافذ)"}
          >
            {isListeningVoice ? (
              <MicOff className="w-5 h-5 text-white animate-bounce" />
            ) : (
              <Mic className="w-5 h-5 text-white animate-pulse" />
            )}
          </button>

          {/* Locate Me / Continuous GPS Tracking Toggle */}
          {config.showLocateMeBtn && (
            <button
              onClick={() => handleToggleContinuousGps()}
              className={`w-12 h-12 rounded-2xl border shadow-xl backdrop-blur-md flex items-center justify-center cursor-pointer transition active:scale-95 ${
                isGpsContinuous
                  ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400 shadow-emerald-500/50 animate-pulse'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border-slate-700'
              }`}
              title={isGpsContinuous ? "🛰️ نظام GPS للتتبع المستمر نشط (انقر للإيقاف)" : "تفعيل الجي بي اس (تتبع الموقع تلقائياً وبشكل مستمر)"}
            >
              <Locate className="w-5 h-5" />
            </button>
          )}

          {/* Quick Drag & Drop Tool Toggle (Visible exclusively when Admin has activated edit mode or tool) */}
          {(isAdminEditMode || isDragDropToolOpen) && (
            <button
              onClick={() => {
                setIsDragDropToolOpen(!isDragDropToolOpen);
              }}
              className={`p-2.5 rounded-2xl border-2 shadow-2xl backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition active:scale-95 text-xs font-black ${
                isDragDropToolOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-amber-500/70'
              }`}
              title="أداة رفع اللوجو والسحب والإفلات على الخريطة (لوحة تحكم المدير)"
            >
              <Move className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">أداة المدير</span>
            </button>
          )}
        </div>
      )}

      {/* Active Navigation Overlay (Google Maps Style) */}
      {navigation.isActive && (
        <NavigationOverlay
          navigation={navigation}
          onStopNavigation={handleStopNavigation}
          onToggleMute={handleToggleMute}
          onToggleSimulation={handleToggleSimulation}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
        />
      )}

      {/* Station Detail Sheet / Modal */}
      {selectedStation && !navigation.isActive && (
        <StationDetailSheet
          station={selectedStation}
          distanceKm={getDistanceMeters(userLocation[0], userLocation[1], selectedStation.lat, selectedStation.lng) / 1000}
          durationMin={Math.max(2, Math.round(((getDistanceMeters(userLocation[0], userLocation[1], selectedStation.lat, selectedStation.lng) / 1000) / 30) * 60))}
          onClose={() => setSelectedStation(null)}
          onStartNavigation={handleStartNavigation}
          onUpdateCongestion={handleUpdateCongestion}
          onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
          customAppLogoUrl={config.customAppLogoUrl || config.globalStationLogoUrl || uploadedLogoUrl || getStoredCustomLogo()}
          isAdminEditMode={isAdminEditMode}
          onUpdateStationName={(newName) => handleUpdateStationName(selectedStation.id, newName)}
        />
      )}

      {/* Bottom List of Stations (Drawer) */}
      {config.showBottomDrawer && !navigation.isActive && !selectedStation && (
        <StationsListDrawer
          stations={filteredStations}
          userLocation={userLocation}
          selectedStation={selectedStation}
          onSelectStation={(s) => setSelectedStation(s)}
          onStartNavigation={handleStartNavigation}
          customAppLogoUrl={config.customAppLogoUrl || config.globalStationLogoUrl || uploadedLogoUrl || getStoredCustomLogo()}
        />
      )}

      {/* Smart Voice Navigator Modal */}
      <VoiceNavigatorModal
        isOpen={isVoiceNavigatorOpen}
        onClose={() => setIsVoiceNavigatorOpen(false)}
        stations={filteredStations}
        userLocation={userLocation}
        onSelectStation={(s) => setSelectedStation(s)}
        onStartNavigation={(s) => handleStartNavigation(s)}
        onStopNavigation={handleStopNavigation}
        isNavigatingActive={navigation.isActive}
        onToggleContinuousGps={handleToggleContinuousGps}
        isGpsContinuous={isGpsContinuous}
      />

      {/* KMZ / KML Uploader Modal */}
      <KmzUploaderModal
        isOpen={isKmzModalOpen}
        onClose={() => setIsKmzModalOpen(false)}
        onImportStations={handleImportKmzStations}
        currentStationsCount={stations.length}
        globalStationLogoUrl={config.globalStationLogoUrl || config.customAppLogoUrl || uploadedLogoUrl || getStoredCustomLogo()}
      />

      {/* STOP Safety Modal */}
      <StopSafetyModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
      />

      {/* Cargas Nationwide Directory Modal */}
      <CargasNationwideModal
        isOpen={isNationwideModalOpen}
        onClose={() => setIsNationwideModalOpen(false)}
        stations={stations}
        userLocation={userLocation}
        config={config}
        onSelectStationOnMap={(st) => setSelectedStation(st)}
        onStartNavigation={(st) => handleStartNavigation(st)}
      />

      {/* Secret Admin Dashboard Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        stations={stations}
        onSaveStations={setStations}
        config={config}
        onSaveConfig={setConfig}
        onApplyLogoToAllStations={handleApplyLogoToAllStations}
        onOpenKmzModal={() => setIsKmzModalOpen(true)}
        onOpenDragDropTool={() => {
          setIsDragDropToolOpen(true);
          setIsAdminEditMode(true);
          setToastMessage('📍 تم فتح أداة السحب والإفلات على الخريطة!');
        }}
      />

      {/* Branding & Copyright Footer */}
      {config.ezoutiBadgeVisible && !navigation.isActive && (
        <div className="fixed bottom-2 right-4 z-[400] hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-full text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>ابتكار وتطوير: <strong className="text-slate-300">محمد عبد الرحمن يوسف</strong></span>
        </div>
      )}
    </div>
  );
}
