'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Navigation2, MapPin, Clock, CheckCircle2, LocateFixed, WifiOff } from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────────────────

const PROVIDER =
  (process.env.NEXT_PUBLIC_MAP_PROVIDER as string) === 'mapbox' ? 'mapbox' : 'leaflet';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const ARRIVAL_RADIUS_M = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function fmtEta(m: number) {
  const mins = Math.round(m / 67); // ~4 km/h walking
  return mins < 1 ? '< 1 min' : `${mins} min`;
}

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function NavigateInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const stationName = searchParams.get('name') ?? 'Gare';
  const stationLat  = parseFloat(searchParams.get('lat') ?? '0');
  const stationLng  = parseFloat(searchParams.get('lng') ?? '0');

  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<any>(null);
  const userMarkerRef    = useRef<any>(null);
  const polylineRef      = useRef<any>(null);   // Leaflet
  const sourceReadyRef   = useRef(false);       // Mapbox

  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [arrived,   setArrived]   = useState(false);
  const [denied,    setDenied]    = useState(false);
  const [followUser, setFollowUser] = useState(true);
  const followRef = useRef(true);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (PROVIDER === 'mapbox') initMapbox();
    else initLeaflet();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geolocation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDenied(true); return;
    }
    const id = navigator.geolocation.watchPosition(
      onPosition,
      () => setDenied(true),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPosition(pos: GeolocationPosition) {
    const { latitude: uLat, longitude: uLng } = pos.coords;
    const dist = haversine(uLat, uLng, stationLat, stationLng);
    setDistanceM(dist);
    if (dist <= ARRIVAL_RADIUS_M) setArrived(true);
    updateMap(uLat, uLng);
  }

  // ── Mapbox ──────────────────────────────────────────────────────────────────

  async function initMapbox() {
    const mapboxgl = (await import('mapbox-gl')).default;
    if (!document.getElementById('mapbox-nav-css')) {
      const l = document.createElement('link');
      l.id = 'mapbox-nav-css';
      l.rel = 'stylesheet';
      l.href = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css';
      document.head.appendChild(l);
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [stationLng, stationLat],
      zoom: 14,
    });

    // Station marker
    const el = document.createElement('div');
    el.innerHTML = `<div style="
      width:40px;height:40px;background:#F05A1A;border-radius:50%;
      border:3px solid white;box-shadow:0 2px 12px rgba(240,90,26,.4);
      display:flex;align-items:center;justify-content:center;
    ">
      <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>`;
    el.style.cursor = 'pointer';
    new mapboxgl.Marker({ element: el }).setLngLat([stationLng, stationLat]).addTo(map);

    map.on('load', () => {
      // Route line source
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#F05A1A', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.8 },
      });
      sourceReadyRef.current = true;
    });

    map.on('dragstart', () => { followRef.current = false; setFollowUser(false); });

    mapRef.current = map;
  }

  function updateMapboxPositions(uLat: number, uLng: number) {
    const map = mapRef.current;
    if (!map) return;

    // User marker
    if (!userMarkerRef.current) {
      const dot = document.createElement('div');
      dot.style.cssText = 'width:20px;height:20px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,.4);';
      const { default: mapboxgl } = require('mapbox-gl');
      mapboxgl.accessToken = MAPBOX_TOKEN;
      userMarkerRef.current = new mapboxgl.Marker({ element: dot }).setLngLat([uLng, uLat]).addTo(map);
    } else {
      userMarkerRef.current.setLngLat([uLng, uLat]);
    }

    // Route line
    if (sourceReadyRef.current) {
      (map.getSource('route') as any)?.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[uLng, uLat], [stationLng, stationLat]] },
        properties: {},
      });
    }

    if (followRef.current) map.panTo([uLng, uLat]);
  }

  // ── Leaflet ─────────────────────────────────────────────────────────────────

  async function initLeaflet() {
    const L = (await import('leaflet')).default;
    if (!document.getElementById('leaflet-nav-css')) {
      const l = document.createElement('link');
      l.id = 'leaflet-nav-css';
      l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current!, { zoomControl: false }).setView([stationLat, stationLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    const stationIcon = L.divIcon({
      html: `<div style="width:36px;height:36px;background:#F05A1A;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(240,90,26,.4);display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:16px;">📍</span></div>`,
      className: '',
      iconAnchor: [18, 18],
    });
    L.marker([stationLat, stationLng], { icon: stationIcon }).addTo(map);

    map.on('dragstart', () => { followRef.current = false; setFollowUser(false); });

    mapRef.current = map;
  }

  function updateLeafletPositions(uLat: number, uLng: number) {
    const map = mapRef.current;
    if (!map) return;

    // User dot marker
    if (!userMarkerRef.current) {
      const icon = (require('leaflet') as any).divIcon({
        html: `<div style="width:18px;height:18px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,.4);"></div>`,
        className: '',
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = (require('leaflet') as any).marker([uLat, uLng], { icon }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([uLat, uLng]);
    }

    // Polyline
    if (!polylineRef.current) {
      polylineRef.current = (require('leaflet') as any).polyline(
        [[uLat, uLng], [stationLat, stationLng]],
        { color: '#F05A1A', weight: 3, dashArray: '8, 8', opacity: 0.8 },
      ).addTo(map);
    } else {
      polylineRef.current.setLatLngs([[uLat, uLng], [stationLat, stationLng]]);
    }

    if (followRef.current) map.panTo([uLat, uLng]);
  }

  // ── Dispatch to correct provider ────────────────────────────────────────────

  function updateMap(uLat: number, uLng: number) {
    if (!mapRef.current) return;
    if (PROVIDER === 'mapbox') updateMapboxPositions(uLat, uLng);
    else updateLeafletPositions(uLat, uLng);
  }

  function centerOnUser() {
    if (!userMarkerRef.current || !mapRef.current) return;
    followRef.current = true;
    setFollowUser(true);
    if (PROVIDER === 'mapbox') {
      mapRef.current.flyTo({ center: userMarkerRef.current.getLngLat(), zoom: 15 });
    } else {
      mapRef.current.flyTo(userMarkerRef.current.getLatLng(), 15);
    }
  }

  function centerOnStation() {
    if (!mapRef.current) return;
    followRef.current = false;
    setFollowUser(false);
    if (PROVIDER === 'mapbox') {
      mapRef.current.flyTo({ center: [stationLng, stationLat], zoom: 15 });
    } else {
      mapRef.current.flyTo([stationLat, stationLng], 15);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    // Full-screen overlay that covers the sidebar + header
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">

      {/* Map */}
      <div ref={containerRef} className="flex-1" style={{ position: 'relative' }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center gap-2 pointer-events-none">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition pointer-events-auto"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2">
          <MapPin size={16} className="text-orange-500 shrink-0" />
          <span className="font-semibold text-gray-900 text-sm truncate">{stationName}</span>
          <span className="ml-auto text-[10px] text-gray-400 shrink-0 uppercase tracking-wide">
            {PROVIDER === 'mapbox' ? 'Mapbox' : 'OSM'}
          </span>
        </div>
      </div>

      {/* Location denied banner */}
      {denied && (
        <div className="absolute top-16 left-3 right-3 z-10 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <WifiOff size={15} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-600">Localisation refusée — activez-la dans votre navigateur</p>
        </div>
      )}

      {/* Arrived banner */}
      {arrived && (
        <div className="absolute bottom-36 left-4 right-4 z-10 bg-green-500 rounded-2xl p-4 flex items-center justify-center gap-2 shadow-lg shadow-green-500/30">
          <CheckCircle2 size={20} className="text-white" />
          <span className="text-white font-bold text-base">Vous êtes arrivé !</span>
        </div>
      )}

      {/* FABs */}
      <div className="absolute right-3 bottom-36 z-10 flex flex-col gap-2">
        <button
          onClick={centerOnStation}
          className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center text-orange-500 hover:bg-orange-50 transition"
          title="Centrer sur la gare"
        >
          <MapPin size={18} />
        </button>
        <button
          onClick={centerOnUser}
          className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition ${
            followUser ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 hover:bg-blue-50'
          }`}
          title="Suivre ma position"
        >
          <LocateFixed size={18} />
        </button>
      </div>

      {/* Bottom info card */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
        <div className="bg-white rounded-2xl shadow-2xl p-5">
          {denied ? (
            <p className="text-center text-gray-400 text-sm">
              Impossible de calculer la distance sans localisation.
            </p>
          ) : distanceM === null ? (
            <div className="flex items-center justify-center gap-3 text-gray-400">
              <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-sm">Localisation en cours…</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Navigation2 size={10} /> Distance
                </p>
                <p className="text-2xl font-black text-orange-500 leading-tight">{fmtDistance(distanceM)}</p>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <Clock size={10} /> À pied
                </p>
                <p className="text-2xl font-black text-blue-500 leading-tight">{fmtEta(distanceM)}</p>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => router.back()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Terminer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page (Suspense wrapper required by Next.js for useSearchParams) ────────────

export default function NavigatePage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div className="text-white text-sm">Chargement…</div>
      </div>
    }>
      <NavigateInner />
    </Suspense>
  );
}
