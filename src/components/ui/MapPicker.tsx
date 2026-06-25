'use client';

import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { useBranding } from '@/lib/branding';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MapProvider = 'leaflet' | 'mapbox';

// ── Config (read from env, override per-instance via prop) ────────────────────

const ENV_PROVIDER: MapProvider =
  (process.env.NEXT_PUBLIC_MAP_PROVIDER as MapProvider) === 'mapbox' ? 'mapbox' : 'leaflet';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

// Default centre: Abidjan
const DEFAULT_LAT = 5.3364;
const DEFAULT_LNG = -4.0267;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Override the global NEXT_PUBLIC_MAP_PROVIDER for this instance. */
  provider?: MapProvider;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapPicker({ lat, lng, onChange, provider }: MapPickerProps) {
  const activeProvider = provider ?? ENV_PROVIDER;
  const { primaryColor } = useBranding();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (activeProvider === 'mapbox') {
      initMapbox();
    } else {
      initLeaflet();
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Clear marker when coords removed externally ───────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;
    if (lat == null || lng == null) {
      if (activeProvider === 'mapbox') {
        markerRef.current?.remove();
        markerRef.current = null;
      } else {
        markerRef.current?.remove();
        markerRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // ── Mapbox GL JS ─────────────────────────────────────────────────────────

  async function initMapbox() {
    const mapboxgl = (await import('mapbox-gl')).default;

    // Re-vérifier après l'import async — le composant peut avoir été démonté
    if (!containerRef.current || mapRef.current) return;

    // Inject Mapbox CSS once
    if (!document.getElementById('mapbox-gl-css')) {
      const link = document.createElement('link');
      link.id = 'mapbox-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] =
      lat != null && lng != null ? [lng, lat] : [DEFAULT_LNG, DEFAULT_LAT];

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 13,
    });

    if (lat != null && lng != null) {
      const marker = new mapboxgl.Marker({ draggable: true, color: primaryColor })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    map.on('click', (e: any) => {
      const { lat: newLat, lng: newLng } = e.lngLat;
      if (markerRef.current) {
        markerRef.current.setLngLat([newLng, newLat]);
      } else {
        const marker = new mapboxgl.Marker({ draggable: true, color: primaryColor })
          .setLngLat([newLng, newLat])
          .addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
        });
        markerRef.current = marker;
      }
      onChange(+newLat.toFixed(6), +newLng.toFixed(6));
    });

    mapRef.current = map;
  }

  // ── Leaflet (OpenStreetMap) ───────────────────────────────────────────────

  async function initLeaflet() {
    const L = (await import('leaflet')).default;

    // Re-vérifier après l'import async — le composant peut avoir été démonté
    if (!containerRef.current || mapRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Fix broken default icon paths in webpack
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const center: [number, number] =
      lat != null && lng != null ? [lat, lng] : [DEFAULT_LAT, DEFAULT_LNG];

    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (lat != null && lng != null) {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
      });
      markerRef.current = marker;
    }

    map.on('click', (e: any) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        const marker = L.marker([newLat, newLng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(+pos.lat.toFixed(6), +pos.lng.toFixed(6));
        });
        markerRef.current = marker;
      }
      onChange(+newLat.toFixed(6), +newLng.toFixed(6));
    });

    mapRef.current = map;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        className="w-full h-64 rounded-xl border border-gray-200 overflow-hidden"
        style={{ position: 'relative', zIndex: 0 }}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <MapPin size={11} />
          {lat != null && lng != null
            ? `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E — glissez ou cliquez pour déplacer`
            : 'Cliquez sur la carte pour placer un marqueur (optionnel)'}
        </p>
        <span className="text-xs text-gray-300 uppercase tracking-wide">
          {activeProvider === 'mapbox' ? '⬛ Mapbox' : '🌍 OpenStreetMap'}
        </span>
      </div>
    </div>
  );
}
