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
import { MoeinVoiceBot } from './components/MoeinVoiceBot';
import { StationsListDrawer } from './components/StationsListDrawer';
import { CargasNationwideModal } from './components/CargasNationwideModal';
import { DragDropMapTool } from './components/DragDropMapTool';
import { CARGAS_LOGO_SVG } from './utils/cargasLogo';
import { getStoredCustomLogo, saveStoredCustomLogo } from './utils/imageCompressor';
import { Locate, Building2, Move } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  adminPassword: '0000',
  cargasOnlyMode: true,
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
  nearestStationBtnText: 'المحطة الأقرب لك',
  showVoiceMicBtn: true,
  voiceMicBtnText: 'المكان بصوتك',
  showNationwideBtn: true,
  nationwideBtnText: 'محطات كارجاس بالجمهورية',
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
  oilFilterText: 'مراكز الزيوت (BP/كاسترول)',
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
  const handleFindNearest = () => {
    speechService.playChime('turn');
    const sorted = [...stations].sort((a, b) => {
      return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
             getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
    });

    if (sorted.length > 0) {
      const nearest = sorted[0];
      const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
      setSelectedStation(nearest);
      const reply = `يا هلا بيك في كارجاس! أقرب محطة لمكانك هي ${nearest.name}، على بعد ${distKm} كيلو. حالة الزحام ${nearest.congestionLevel === 'low' ? 'رايقة وبدون طوابير' : 'متوسطة'}. اضغط على الزر الأخضر الكبير عشان تبدأ الملاحة فوراً!`;
      speechService.speak(reply, { priority: true });
      showToast(`📍 أقرب محطة كارجاس: ${nearest.name} (${distKm} كم)`);
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

  // Intelligent Voice & Text Query Handler (Search by voice or text)
  const handleVoiceQuery = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    speechService.playChime('turn');

    // Intent 1: "ايه اقرب محطة لموقعي الان" or "اقرب محطة"
    if (q.includes('اقرب') || q.includes('أقرب') || q.includes('موقعي') || q.includes('قريب')) {
      const sorted = [...stations].sort((a, b) => {
        return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
               getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
      });
      if (sorted.length > 0) {
        const nearest = sorted[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], nearest.lat, nearest.lng) / 1000).toFixed(1);
        setSelectedStation(nearest);
        const crowdDesc = nearest.congestionLevel === 'low' ? 'خفيف ورايق' : nearest.congestionLevel === 'medium' ? 'متوسط' : 'شديد';
        const reply = `يا باشا أقرب محطة لموقعك حالياً هي ${nearest.name} تابعة لـ ${nearest.company}، على بعد ${distKm} كم. حالة الزحام ${crowdDesc} ووقت الانتظار ${nearest.waitTimeMinutes} دقيقة.`;
        speechService.speak(reply, { priority: true });
        showToast(`📍 أقرب محطة: ${nearest.name} (${distKm} كم)`);
        return;
      }
    }

    // Intent 2: "بدون زحام" or "رايقة" or "مفيهاش زحمة"
    if (q.includes('زحام') || q.includes('زحمة') || q.includes('رايق') || q.includes('سريع')) {
      const lowCrowd = [...stations]
        .filter(s => s.congestionLevel === 'low')
        .sort((a, b) => getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) - getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng));
      if (lowCrowd.length > 0) {
        const best = lowCrowd[0];
        const distKm = (getDistanceMeters(userLocation[0], userLocation[1], best.lat, best.lng) / 1000).toFixed(1);
        setSelectedStation(best);
        const reply = `لقيتلك محطة رايقة وبدون طوابير: ${best.name} على بعد ${distKm} كم، ووقت الانتظار فيها ${best.waitTimeMinutes} دقيقة بس!`;
        speechService.speak(reply, { priority: true });
        showToast(`🟢 محطة رايقة: ${best.name}`);
        return;
      }
    }

    // Intent 3: Specific station or street match
    const matched = stations.find(s => {
      const text = `${s.name} ${s.address} ${s.company} ${s.notes || ''}`.toLowerCase();
      if (q.includes('عباس') && s.id.includes('abbas')) return true;
      if (q.includes('سفير') && s.id.includes('safir')) return true;
      if (q.includes('الماظة') && s.id.includes('almazah')) return true;
      if (q.includes('مكرم') && s.id.includes('makram')) return true;
      if (q.includes('الدقي') && s.id.includes('dokki')) return true;
      if (q.includes('معادي') && s.id.includes('maadi')) return true;
      if (q.includes('تسعين') && s.id.includes('90')) return true;
      if (q.includes('اكتوبر') && s.id.includes('october')) return true;
      return text.includes(q);
    });

    if (matched) {
      const distKm = (getDistanceMeters(userLocation[0], userLocation[1], matched.lat, matched.lng) / 1000).toFixed(1);
      setSelectedStation(matched);
      const reply = `تمام يا غالي، محطة ${matched.name} على بعد ${distKm} كم، وفيها ${matched.cngNozzles} مسدسات غاز ووقت الانتظار ${matched.waitTimeMinutes} دقيقة.`;
      speechService.speak(reply, { priority: true });
      showToast(`⛽ ${matched.name}`);
      return;
    }

    // Fallback: search filter
    setSearchQuery(query);
    showToast(`بحث عن: ${query}`);
    speechService.speak(`جاري البحث على الخريطة عن ${query}`, { priority: true });
  };

  // Re-center on user GPS
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setGpsActive(true);
          showToast('تم تحديد موقعك الحالي بدقة عبر GPS بنجاح! 📍');
        },
        () => {
          showToast('تعذر الوصول إلى GPS. تم اعتماد الموقع التقديري بمدينة نصر / القاهرة.');
        }
      );
    }
  };

  // Calculate map frame and outer background styles based on admin config
  const mapFramePadding = config.enableMapFrame ? (config.mapFramePadding ?? 4) : 0;
  const mapFrameWidth = config.enableMapFrame ? (config.mapFrameWidth ?? 3) : 0;
  const mapFrameRadius = config.enableMapFrame ? (config.mapFrameRadius ?? 18) : 0;
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
      className="relative w-screen h-screen overflow-hidden font-['Cairo'] select-none flex flex-col items-center justify-center transition-colors duration-300"
      style={{ backgroundColor: appOuterBg }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1300] bg-slate-900/95 text-white border border-emerald-500/60 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs md:text-sm font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Map with Admin-Controlled Customizable Frame */}
      <div
        className="relative w-full h-full overflow-hidden transition-all duration-300"
        style={{
          padding: `${mapFramePadding}px`,
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden transition-all duration-300"
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
          onVoiceQuery={handleVoiceQuery}
          onFindNearest={handleFindNearest}
          config={config}
        />
      )}

      {/* Floating Buttons: Locate Me & Nationwide Directory */}
      {!navigation.isActive && (
        <div className="fixed top-40 right-4 z-[500] flex flex-col gap-2">
          {/* Nationwide Cargas Directory Button */}
          {config.showNationwideBtn && (
            <button
              onClick={() => setIsNationwideModalOpen(true)}
              className="p-2.5 rounded-2xl bg-white hover:bg-slate-50 text-emerald-800 border-2 border-emerald-600 shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer transition active:scale-95 text-xs font-black group"
              title="دليل محطات ومواقع كارجاس على مستوى الجمهورية"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-white shrink-0 border border-emerald-600 p-0.5 flex items-center justify-center">
                {config.customAppLogoUrl ? (
                  <img src={config.customAppLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                )}
              </div>
              <span className="hidden sm:inline">{config.nationwideBtnText || 'محطات كارجاس بالجمهورية'}</span>
            </button>
          )}

          {/* Locate Me */}
          {config.showLocateMeBtn && (
            <button
              onClick={handleLocateMe}
              className="w-12 h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center cursor-pointer transition active:scale-95"
              title="موقعي الحالي"
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

      {/* Moein Voice & Chat Bot */}
      {config.moeinVisibleToUsers && !navigation.isActive && (
        <MoeinVoiceBot
          userLocation={userLocation}
          stations={filteredStations}
          config={config}
          onSelectStation={(s) => setSelectedStation(s)}
          onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />
      )}

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
        onOpenDragDropTool={() => {
          setIsDragDropToolOpen(true);
          setIsAdminEditMode(true);
          setToastMessage('📍 تم فتح أداة السحب والإفلات على الخريطة!');
        }}
      />

      {/* Ezouti Branding & Copyright Footer */}
      {config.ezoutiBadgeVisible && !navigation.isActive && (
        <div className="fixed bottom-2 right-4 z-[400] hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-full text-[10px] text-slate-400 backdrop-blur-sm pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>ابتكار وتطوير: <strong className="text-slate-300">محمد عبد الرحمن يوسف</strong> | شركة عزوتي للبرمجيات</span>
        </div>
      )}
    </div>
  );
}
