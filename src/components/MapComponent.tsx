import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Station, NavigationState } from '../types';
import { CARGAS_FACILITY_META, getCongestionBadge } from '../utils/companyAssets';
import { CARGAS_LOGO_SVG } from '../utils/cargasLogo';
import { Plus, Minus, Layers, Compass } from 'lucide-react';

export type MapStyleType = 'google_streets' | 'google_hybrid' | 'google_terrain' | 'dark' | 'osm';

interface MapComponentProps {
  stations: Station[];
  selectedStation: Station | null;
  userLocation: [number, number];
  onSelectStation: (station: Station) => void;
  navigationState: NavigationState;
  mapStyle: MapStyleType;
  onCycleMapStyle?: () => void;
}

interface TileServerConfig {
  url: string;
  subdomains: string[];
  attribution: string;
  maxZoom: number;
}

const TILE_SERVERS: Record<MapStyleType, TileServerConfig> = {
  // Google Maps Official Arabic Street Map
  google_streets: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&hl=ar&gl=eg&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
    maxZoom: 20
  },
  // Google Earth Hybrid (Satellite Imagery + Street Names & Places)
  google_hybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&hl=ar&gl=eg&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Earth & Google Maps',
    maxZoom: 20
  },
  // Google Terrain
  google_terrain: {
    url: 'https://mt{s}.google.com/vt/lyrs=p&hl=ar&gl=eg&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps Terrain',
    maxZoom: 18
  },
  // Dark Night Navigation Style
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CartoDB & OpenStreetMap',
    maxZoom: 19
  },
  // OpenStreetMap
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

export const MapComponent: React.FC<MapComponentProps> = ({
  stations,
  selectedStation,
  userLocation,
  onSelectStation,
  navigationState,
  mapStyle = 'google_streets',
  onCycleMapStyle
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stationMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    const activeConfig = TILE_SERVERS[mapStyle] || TILE_SERVERS.google_streets;
    tileLayerRef.current = L.tileLayer(activeConfig.url, {
      subdomains: activeConfig.subdomains,
      attribution: activeConfig.attribution,
      maxZoom: activeConfig.maxZoom,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Critical: Ensure Leaflet recalculates size accurately
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const activeConfig = TILE_SERVERS[mapStyle] || TILE_SERVERS.google_streets;
    tileLayerRef.current = L.tileLayer(activeConfig.url, {
      subdomains: activeConfig.subdomains,
      attribution: activeConfig.attribution,
      maxZoom: activeConfig.maxZoom,
    }).addTo(map);

    map.invalidateSize();
  }, [mapStyle]);

  // Update User Location Marker (Google Blue Pulsing Dot)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const userHtml = `
      <div class="relative flex items-center justify-center w-12 h-12">
        <div class="absolute w-12 h-12 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/40"></div>
        <div class="relative w-6 h-6 rounded-full bg-blue-600 border-3 border-white shadow-xl flex items-center justify-center">
          <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
        </div>
        <!-- Direction pointer -->
        <div class="absolute -top-1 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-blue-600"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userHtml,
      className: 'user-location-marker',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      userMarkerRef.current = L.marker(userLocation, {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [userLocation]);

  // Update Station Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const currentStationIds = new Set(stations.map(s => s.id));
    stationMarkersRef.current.forEach((marker, id) => {
      if (!currentStationIds.has(id)) {
        map.removeLayer(marker);
        stationMarkersRef.current.delete(id);
      }
    });

    stations.forEach(station => {
      const isSelected = selectedStation?.id === station.id;
      const isTarget = navigationState.targetStation?.id === station.id;
      const facility = CARGAS_FACILITY_META[station.facilityType] || CARGAS_FACILITY_META.station;
      const congestion = getCongestionBadge(station.congestionLevel, station.waitTimeMinutes);

      const markerHtml = `
        <div class="group relative cursor-pointer transition-transform duration-200 ${
          isSelected || isTarget ? 'scale-125 z-50' : 'hover:scale-110'
        }">
          ${isSelected || isTarget ? `<div class="absolute -inset-3 rounded-full bg-emerald-400/50 animate-pulse"></div>` : ''}
          
          <div class="relative flex flex-col items-center">
            <!-- Label Badge with Station Name & Crowd Dot -->
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-2xl border ${
              isSelected || isTarget
                ? 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400'
                : 'bg-slate-900/95 text-white border-slate-700/80 backdrop-blur-md'
            }">
              <span class="w-2.5 h-2.5 rounded-full ${congestion.dotColor}"></span>
              <span class="truncate max-w-[110px] font-black">${station.name.replace('محطة كارجاس ', 'كارجاس ')}</span>
              <span class="text-xs">${facility.iconText}</span>
            </div>

            <!-- Cargas NGV Round Logo Badge with Pin Pointer -->
            <div class="w-10 h-10 -mt-1 rounded-full bg-white p-0.5 shadow-2xl border-2 ${
              isSelected || isTarget ? 'border-emerald-400' : 'border-emerald-600'
            } flex items-center justify-center overflow-hidden">
              ${CARGAS_LOGO_SVG}
            </div>
            
            <!-- Pin Pointer Tail -->
            <div class="w-0 h-0 border-x-5 border-x-transparent border-t-7 border-t-emerald-600 -mt-0.5"></div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-station-pin',
        iconSize: [130, 68],
        iconAnchor: [65, 64],
      });

      let marker = stationMarkersRef.current.get(station.id);
      if (marker) {
        marker.setLatLng([station.lat, station.lng]);
        marker.setIcon(icon);
      } else {
        marker = L.marker([station.lat, station.lng], { icon }).addTo(map);
        marker.on('click', () => {
          onSelectStation(station);
        });
        stationMarkersRef.current.set(station.id, marker);
      }
    });
  }, [stations, selectedStation, navigationState.targetStation]);

  // Update Route Polyline
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (navigationState.isActive && navigationState.routeCoordinates.length > 0) {
      // Google Maps Navigation blue line
      const polyline = L.polyline(navigationState.routeCoordinates, {
        color: '#2563eb', // Google Maps navigation blue
        weight: 7,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;

      const bounds = polyline.getBounds();
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }, [navigationState.isActive, navigationState.routeCoordinates]);

  // Center on selected station
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStation) return;
    mapInstanceRef.current.flyTo([selectedStation.lat, selectedStation.lng], 15, {
      duration: 1.2
    });
  }, [selectedStation]);

  // Zoom controls
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Google Maps Style Floating Zoom Controls */}
      {!navigationState.isActive && (
        <div className="fixed bottom-24 right-4 z-[500] flex flex-col gap-1.5 shadow-2xl">
          <button
            onClick={handleZoomIn}
            className="w-11 h-11 bg-white hover:bg-slate-100 text-slate-800 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center font-bold text-lg cursor-pointer transition active:scale-95"
            title="تكبير"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-11 bg-white hover:bg-slate-100 text-slate-800 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center font-bold text-lg cursor-pointer transition active:scale-95"
            title="تصغير"
          >
            <Minus className="w-5 h-5" />
          </button>
          {onCycleMapStyle && (
            <button
              onClick={onCycleMapStyle}
              className="w-11 h-11 bg-white hover:bg-slate-100 text-slate-800 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center cursor-pointer transition active:scale-95 mt-1"
              title="تغيير نمط الخريطة (شوارع جوجل / قمر صناعي)"
            >
              <Layers className="w-5 h-5 text-blue-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
