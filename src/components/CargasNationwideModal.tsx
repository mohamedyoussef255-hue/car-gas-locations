import React, { useState } from 'react';
import { Station, CargasFacilityType } from '../types';
import { CARGAS_FACILITY_META, getCongestionBadge } from '../utils/companyAssets';
import { CARGAS_LOGO_SVG } from '../utils/cargasLogo';
import { getDistanceMeters, formatDistance } from '../services/routingService';
import { speechService } from '../services/speechService';
import { 
  X, 
  MapPin, 
  Navigation, 
  Volume2, 
  Wrench, 
  Droplets, 
  Search, 
  ExternalLink,
  Phone,
  Fuel,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface CargasNationwideModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  userLocation: [number, number];
  onSelectStationOnMap: (station: Station) => void;
  onStartNavigation: (station: Station) => void;
}

export const CargasNationwideModal: React.FC<CargasNationwideModalProps> = ({
  isOpen,
  onClose,
  stations,
  userLocation,
  onSelectStationOnMap,
  onStartNavigation,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<CargasFacilityType | 'all'>('all');
  const [searchWord, setSearchWord] = useState<string>('');

  if (!isOpen) return null;

  // Regions classification
  const regions = [
    { id: 'all', label: 'كل المحافظات' },
    { id: 'cairo_giza', label: 'القاهرة والجيزة' },
    { id: 'alex', label: 'الإسكندرية' },
    { id: 'canal', label: 'مدن القناة (السويس وبورسعيد)' },
    { id: 'delta', label: 'الدلتا (طنطا والمنصورة)' },
    { id: 'upper_egypt', label: 'الصعيد والعاشر' },
  ];

  const filtered = stations.filter(station => {
    // Region
    if (selectedRegion === 'cairo_giza') {
      const match = station.address.includes('القاهرة') || station.address.includes('الجيزة') || station.address.includes('مدينة نصر') || station.address.includes('مصر الجديدة') || station.address.includes('أكتوبر') || station.address.includes('الدقي') || station.address.includes('المعادي');
      if (!match) return false;
    } else if (selectedRegion === 'alex') {
      if (!station.address.includes('الإسكندرية') && !station.name.includes('الإسكندرية')) return false;
    } else if (selectedRegion === 'canal') {
      if (!station.address.includes('السويس') && !station.address.includes('بورسعيد') && !station.address.includes('الإسماعيلية')) return false;
    } else if (selectedRegion === 'delta') {
      if (!station.address.includes('طنطا') && !station.address.includes('المنصورة') && !station.address.includes('الغربية') && !station.address.includes('الدقهلية')) return false;
    } else if (selectedRegion === 'upper_egypt') {
      if (!station.address.includes('بني سويف') && !station.address.includes('العاشر')) return false;
    }

    // Facility filter
    if (selectedFacilityFilter === 'station' && !station.cng) return false;
    if (selectedFacilityFilter === 'conversion_center' && !station.conversionCenter) return false;
    if (selectedFacilityFilter === 'oil_center' && !station.oilCenter) return false;
    if (selectedFacilityFilter === 'cylinder_testing' && !station.cylinderInspection) return false;

    // Search word
    if (searchWord.trim()) {
      const q = searchWord.toLowerCase().trim();
      const text = `${station.name} ${station.address} ${station.services.join(' ')}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });

  // Sort by distance to user
  const sorted = [...filtered].sort((a, b) => {
    return getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng) -
           getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
  });

  const handleSpeakStation = (station: Station) => {
    speechService.playChime('turn');
    const distM = getDistanceMeters(userLocation[0], userLocation[1], station.lat, station.lng);
    const distKm = (distM / 1000).toFixed(1);
    const text = `محطة ${station.name}. على بعد ${distKm} كيلو لموقعك. فيها تموين غاز وزيوت معتمدة ووقت الانتظار ${station.waitTimeMinutes} دقيقة.`;
    speechService.speak(text, { priority: true });
  };

  return (
    <div className="fixed inset-0 z-[1250] flex items-center justify-center p-2 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/70 rounded-3xl shadow-2xl text-white max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-full bg-white p-1 border-2 border-emerald-500 shadow-xl overflow-hidden shrink-0">
              <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-400">
                شركة الغاز الطبيعي للسيارات | كارجاس CARGAS NGV
              </div>
              <h2 className="text-lg md:text-2xl font-black text-white">
                دليل مواقع ومحطات كارجاس على مستوى الجمهورية
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Region Filter Bars */}
        <div className="p-3 md:p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              placeholder="ابحث باسم المحطة أو المدينة أو المحافظة (مثال: ألماظة، رمسيس، أكتوبر، طنطا، السويس)..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {regions.map((reg) => (
              <button
                key={reg.id}
                onClick={() => setSelectedRegion(reg.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer border ${
                  selectedRegion === reg.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Facility Type Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedFacilityFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold ${
                selectedFacilityFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({stations.length})
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('station')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                selectedFacilityFilter === 'station' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⛽ محطات الغاز
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('conversion_center')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                selectedFacilityFilter === 'conversion_center' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🛠️ مراكز التحويل
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('oil_center')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                selectedFacilityFilter === 'oil_center' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🛢️ مراكز الزيوت (BP/كاسترول)
            </button>
            <button
              onClick={() => setSelectedFacilityFilter('cylinder_testing')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                selectedFacilityFilter === 'cylinder_testing' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🔍 فحص الأسطوانات
            </button>
          </div>
        </div>

        {/* Stations Cards List */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              لا توجد محطات تطابق هذا البحث في المنطقة المحددة.
            </div>
          ) : (
            sorted.map((station) => {
              const distM = getDistanceMeters(userLocation[0], userLocation[1], station.lat, station.lng);
              const facility = CARGAS_FACILITY_META[station.facilityType] || CARGAS_FACILITY_META.station;
              const congestion = getCongestionBadge(station.congestionLevel, station.waitTimeMinutes);

              return (
                <div
                  key={station.id}
                  className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/60 transition shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-white p-0.5 border border-emerald-500 shrink-0 overflow-hidden shadow">
                      <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-base text-white">{station.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${facility.badgeBg}`}>
                          {facility.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${congestion.color}`}>
                          {congestion.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{station.address}</p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-300">
                        {station.cng && (
                          <span className="bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 text-[11px]">
                            ⛽ {station.cngNozzles} مسدسات غاز
                          </span>
                        )}
                        {station.conversionCenter && (
                          <span className="bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800 text-[11px]">
                            🛠️ مركز تحويل معتمد
                          </span>
                        )}
                        {station.oilCenter && (
                          <span className="bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800 text-[11px]">
                            🛢️ غيار زيوت كارجاس
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Distance */}
                  <div className="flex items-center sm:flex-col items-end gap-2 shrink-0 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/50">
                    <div className="text-left">
                      <div className="text-sm font-black text-emerald-400">
                        {formatDistance(distM)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        انتظار: {station.waitTimeMinutes} د
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Read Voice Button (Shakir) */}
                      <button
                        onClick={() => handleSpeakStation(station)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 text-emerald-400 rounded-xl cursor-pointer"
                        title="اسمع بالصوت بصوت شاكر"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      {/* View on Map */}
                      <button
                        onClick={() => {
                          onSelectStationOnMap(station);
                          onClose();
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>على الخريطة</span>
                      </button>

                      {/* Start Navigation */}
                      <button
                        onClick={() => {
                          onStartNavigation(station);
                          onClose();
                        }}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>ملاحة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between px-4">
          <span>كافة مواقع محطات ومراكز كارجاس المعتمدة بجمهورية مصر العربية</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
