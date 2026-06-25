'use client';

import { useEffect, useRef } from 'react';
import { useBranding } from '@/lib/branding';

type Provider = 'leaflet' | 'mapbox';

const ENV_PROVIDER: Provider =
  (process.env.NEXT_PUBLIC_MAP_PROVIDER as Provider) === 'mapbox' ? 'mapbox' : 'leaflet';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

const DEFAULT_LAT = 5.3364;
const DEFAULT_LNG = -4.0267;

export interface MapViewProps {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
  zoom?: number;
}

export default function MapView({ lat, lng, label, height = 220, zoom = 14 }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const { primaryColor } = useBranding();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (ENV_PROVIDER === 'mapbox') {
      initMapbox();
    } else {
      initLeaflet();
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initMapbox() {
    const mapboxgl = (await import('mapbox-gl')).default;

    if (!document.getElementById('mapbox-gl-css')) {
      const link = document.createElement('link');
      link.id = 'mapbox-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat] as [number, number],
      zoom,
    });

    const popup = label ? new mapboxgl.Popup({ offset: 25 }).setText(label) : undefined;

    new mapboxgl.Marker({ color: primaryColor })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    mapRef.current = map;
  }

  async function initLeaflet() {
    const L = (await import('leaflet')).default;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(containerRef.current!, { zoomControl: true }).setView([lat, lng], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    if (label) marker.bindPopup(label).openPopup();

    mapRef.current = map;
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height, position: 'relative', zIndex: 0 }}
    />
  );
}
