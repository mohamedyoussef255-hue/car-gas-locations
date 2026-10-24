import { Station } from '../types';
import { INITIAL_CARGAS_STATIONS } from '../data/initialStations';

const CACHE_KEY = 'cargas_stations_cache_v3';
const CACHE_META_KEY = 'cargas_stations_cache_meta_v3';
const CURRENT_CACHE_VERSION = '3.0';

export interface CacheMetadata {
  version: string;
  cachedAt: string;
  stationCount: number;
  quotaSavedPercent: number;
  storageSizeKb: number;
  isOfflineReady: boolean;
}

/**
 * Loads stations from local device storage (caching) to eliminate repeated server/Google API calls.
 */
export function loadCachedStations(): { stations: Station[]; isFromCache: boolean; meta: CacheMetadata | null } {
  try {
    const rawData = localStorage.getItem(CACHE_KEY);
    const rawMeta = localStorage.getItem(CACHE_META_KEY);

    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate at least one valid station
        const validStations = parsed.filter((s: any) => s && s.id && typeof s.lat === 'number' && typeof s.lng === 'number');
        if (validStations.length > 0) {
          let meta: CacheMetadata | null = null;
          if (rawMeta) {
            try {
              meta = JSON.parse(rawMeta);
            } catch {}
          }
          return {
            stations: validStations,
            isFromCache: true,
            meta: meta || {
              version: CURRENT_CACHE_VERSION,
              cachedAt: new Date().toISOString(),
              stationCount: validStations.length,
              quotaSavedPercent: 100,
              storageSizeKb: Math.round(new Blob([rawData]).size / 1024),
              isOfflineReady: true
            }
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error reading station cache from localStorage:', err);
  }

  // Fallback to default initial stations and immediately cache them locally
  saveStationsToCache(INITIAL_CARGAS_STATIONS);

  return {
    stations: INITIAL_CARGAS_STATIONS,
    isFromCache: false,
    meta: {
      version: CURRENT_CACHE_VERSION,
      cachedAt: new Date().toISOString(),
      stationCount: INITIAL_CARGAS_STATIONS.length,
      quotaSavedPercent: 100,
      storageSizeKb: Math.round(new Blob([JSON.stringify(INITIAL_CARGAS_STATIONS)]).size / 1024),
      isOfflineReady: true
    }
  };
}

/**
 * Persists station list and metadata to device storage.
 */
export function saveStationsToCache(stations: Station[]): boolean {
  if (!stations || stations.length === 0) return false;

  try {
    const json = JSON.stringify(stations);
    localStorage.setItem(CACHE_KEY, json);

    // Also mirror to legacy key for backwards compatibility
    localStorage.setItem('cargas_stations_v2', json);

    const sizeKb = Math.round(new Blob([json]).size / 1024);
    const meta: CacheMetadata = {
      version: CURRENT_CACHE_VERSION,
      cachedAt: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      stationCount: stations.length,
      quotaSavedPercent: 100,
      storageSizeKb: sizeKb,
      isOfflineReady: true
    };
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
    return true;
  } catch (err) {
    console.warn('LocalStorage quota limit reached, attempting compressed cache:', err);
    try {
      // Strip redundant fields if quota exceeded
      const compactStations = stations.map(s => ({
        ...s,
        customLogoSvg: undefined,
      }));
      const compactJson = JSON.stringify(compactStations);
      localStorage.setItem(CACHE_KEY, compactJson);
      localStorage.setItem('cargas_stations_v2', compactJson);
      return true;
    } catch (e2) {
      console.error('Failed to save stations to cache:', e2);
      return false;
    }
  }
}

/**
 * Returns cache metadata or null if not yet cached.
 */
export function getCacheMetadata(): CacheMetadata | null {
  try {
    const rawMeta = localStorage.getItem(CACHE_META_KEY);
    if (rawMeta) {
      return JSON.parse(rawMeta);
    }
  } catch {}
  return null;
}

/**
 * Clears local cache and restores the default initial stations.
 */
export function clearStationCache(): Station[] {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_META_KEY);
    localStorage.removeItem('cargas_stations_v2');
  } catch {}
  saveStationsToCache(INITIAL_CARGAS_STATIONS);
  return INITIAL_CARGAS_STATIONS;
}
