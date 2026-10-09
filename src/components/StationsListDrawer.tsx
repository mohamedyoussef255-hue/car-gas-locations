import React, { useState } from 'react';
import { Station, CongestionLevel } from '../types';
import { CARGAS_FACILITY_META, getCongestionBadge } from '../utils/companyAssets';
import { CARGAS_LOGO_SVG } from '../utils/cargasLogo';
import { getDistanceMeters, formatDistance } from '../services/routingService';
import { 
  ChevronUp, 
  ChevronDown, 
  Navigation, 
  Fuel, 
  ShieldCheck, 
  Clock, 
  Gauge, 
  CheckCircle2,
  MapPin,
  List,
  Wrench,
  Droplets
} from 'lucide-react';

interface StationsListDrawerProps {
  stations: Station[];
  userLocation: [number, number];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onStartNavigation: (station: Station) => void;
  customAppLogoUrl?: string;
}

export const StationsListDrawer: React.FC<StationsListDrawerProps> = ({
  stations,
  userLocation,
  selectedStation,
  onSelectStation,
  onStartNavigation,
  customAppLogoUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Sort stations by distance to user
  const sortedStations = [...stations].sort((a, b) => {
    const distA = getDistanceMeters(userLocation[0], userLocation[1], a.lat, a.lng);
    const distB = getDistanceMeters(userLocation[0], userLocation[1], b.lat, b.lng);
    return distA - distB;
  });

  return (
    <div className={`fixed bottom-0 inset-x-0 z-[600] pointer-events-none transition-all duration-300 ${
      isExpanded ? 'h-[70vh]' : 'h-14 md:h-16'
    }`}>
      <div className="max-w-2xl mx-auto h-full p-2 md:p-3 flex flex-col justify-end">
        <div className="pointer-events-auto w-full h-full bg-slate-900/98 border-t-2 border-x-2 border-emerald-500/70 rounded-t-3xl shadow-2xl backdrop-blur-2xl flex flex-col text-white overflow-hidden">
          {/* Header Drag Handle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-2.5 px-4 flex items-center justify-between text-xs font-black text-slate-200 hover:text-white cursor-pointer bg-slate-800/80 border-b border-slate-700 shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full overflow-hidden bg-white p-0.5 border border-emerald-500 shrink-0 flex items-center justify-center">
                {customAppLogoUrl ? (
                  <img src={customAppLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                )}
              </div>
              <span className="text-emerald-400 font-black">أقرب مواقع ومحطات كارجاس لموقعك ({sortedStations.length} موقع)</span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="text-[11px]">{isExpanded ? 'تصغير' : 'عرض القائمة'}</span>
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </button>

          {/* Stations List Body */}
          {isExpanded && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {sortedStations.map((station) => {
                const distM = getDistanceMeters(userLocation[0], userLocation[1], station.lat, station.lng);
                const facility = CARGAS_FACILITY_META[station.facilityType] || CARGAS_FACILITY_META.station;
                const congestion = getCongestionBadge(station.congestionLevel, station.waitTimeMinutes);
                const isSelected = selectedStation?.id === station.id;

                return (
                  <div
                    key={station.id}
                    onClick={() => onSelectStation(station)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500/90 ring-2 ring-emerald-500'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800/90 hover:border-emerald-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-emerald-500 shrink-0 overflow-hidden shadow mt-0.5 flex items-center justify-center">
                          {station.customLogoUrl || customAppLogoUrl ? (
                            <img
                              src={station.customLogoUrl || customAppLogoUrl}
                              alt="Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-white">{station.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${facility.badgeBg}`}>
                              {facility.title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{station.address}</p>
                        </div>
                      </div>

                      {/* Distance Badge */}
                      <div className="text-left shrink-0">
                        <div className="text-xs font-black text-emerald-400">
                          {formatDistance(distM)}
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${congestion.color}`}>
                          {congestion.label}
                        </div>
                      </div>
                    </div>

                    {/* Features footer */}
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        {station.cng && <span>⛽ {station.cngNozzles} مسدسات غاز</span>}
                        {station.conversionCenter && <span className="text-amber-300">🛠️ مركز تحويل</span>}
                        {station.oilCenter && <span className="text-blue-300">🛢️ مركز زيوت</span>}
                        <span>⏱️ {station.waitTimeMinutes} د</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartNavigation(station);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>ملاحة 🚀</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

