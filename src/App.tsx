import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Station, NavigationState, AppConfig, CompanyName, CongestionLevel } from './types';
import { INITIAL_STATIONS } from './data/initialStations';
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
import { Compass, Locate, Volume2, ShieldCheck, Fuel } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  adminPassword: '0000',
  moeinVoiceEnabled: true,
  moeinVisibleToUsers: true,
  moeinAllowedTopics: ['محطات الغاز', 'حالة الزحام', 'الملاحة', 'نظام STOP للسلامة'],
  moeinCustomPromptNote: 'أكد دائماً على سلامة التموين وإطفاء المحرك ونزول الركاب، ووضح محطات كارجاس وعربية غاز بدقة.',
  brandAccentColor: '#10b981',
  theme: 'dark',
  language: 'ar',
  appTitle: 'محطات الغاز الطبيعي الذكية',
  appSubtitle: 'كارجاس • عربية غاز • غازتك • ماستر جاس | رفيقك مُعين',
  ezoutiBadgeVisible: true,
  trafficCrowdAlertsEnabled: true,
};

export default function App() {
  // Load stations from localStorage or initial
  const [stations, setStations] = useState<Station[]>(() => {
    try {
      const saved = localStorage.getItem('cng_stations_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STATIONS;
  });

  // App Config
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('cng_config_v1');
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CONFIG;
  });

  // User Live Location (Defaults to Nasr City / Abbas El Akkad Corridor)
  const [userLocation, setUserLocation] = useState<[number, number]>([30.0585, 31.3350]);
  const [gpsActive, setGpsActive] = useState<boolean>(false);

  // Selected station
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyName | 'الكل'>('الكل');
  const [filterOnlyVerified, setFilterOnlyVerified] = useState<boolean>(false);
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

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cng_stations_v1', JSON.stringify(stations));
    } catch {}
  }, [stations]);

  useEffect(() => {
    try {
      localStorage.setItem('cng_config_v1', JSON.stringify(config));
    } catch {}
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
          // Fallback to default Cairo coordinates
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Filtered Stations
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // Company match
      if (selectedCompany !== 'الكل' && station.company !== selectedCompany) {
        return false;
      }
      // Verified only
      if (filterOnlyVerified && !station.verified) {
        return false;
      }
      // Low crowd only
      if (filterLowCrowd && station.congestionLevel !== 'low') {
        return false;
      }
      // Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const combined = `${station.name} ${station.company} ${station.address} ${station.notes || ''}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }
      return true;
    });
  }, [stations, selectedCompany, filterOnlyVerified, filterLowCrowd, searchQuery]);

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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Cairo'] select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1300] bg-slate-900/95 text-white border border-emerald-500/60 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs md:text-sm font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Map (Google Maps Standard) */}
      <MapComponent
        stations={filteredStations}
        selectedStation={selectedStation}
        userLocation={userLocation}
        onSelectStation={(s) => setSelectedStation(s)}
        navigationState={navigation}
        mapStyle={mapStyle}
        onCycleMapStyle={handleCycleMapStyle}
      />

      {/* Header Bar */}
      {!navigation.isActive && (
        <HeaderBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCompany={selectedCompany}
          onSelectCompany={setSelectedCompany}
          filterOnlyVerified={filterOnlyVerified}
          onToggleVerified={() => setFilterOnlyVerified(!filterOnlyVerified)}
          filterLowCrowd={filterLowCrowd}
          onToggleLowCrowd={() => setFilterLowCrowd(!filterLowCrowd)}
          mapStyle={mapStyle}
          onChangeMapStyle={setMapStyle}
          isMuted={navigation.isMuted}
          onToggleMute={handleToggleMute}
          onOpenSafetyModal={() => setIsSafetyModalOpen(true)}
          onSecretAdminTrigger={() => setIsAdminModalOpen(true)}
          onVoiceQuery={handleVoiceQuery}
          appTitle={config.appTitle}
        />
      )}

      {/* Floating Locate Me Button */}
      {!navigation.isActive && (
        <div className="fixed top-36 right-4 z-[500] flex flex-col gap-2">
          <button
            onClick={handleLocateMe}
            className="w-12 h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-slate-700 shadow-xl backdrop-blur-md flex items-center justify-center cursor-pointer transition active:scale-95"
            title="موقعي الحالي"
          >
            <Locate className="w-5 h-5" />
          </button>
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
        />
      )}

      {/* Bottom List of Stations (Drawer) */}
      {!navigation.isActive && !selectedStation && (
        <StationsListDrawer
          stations={filteredStations}
          userLocation={userLocation}
          selectedStation={selectedStation}
          onSelectStation={(s) => setSelectedStation(s)}
          onStartNavigation={handleStartNavigation}
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

      {/* Secret Admin Dashboard Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        stations={stations}
        onSaveStations={setStations}
        config={config}
        onSaveConfig={setConfig}
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
