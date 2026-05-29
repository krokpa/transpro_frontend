'use client';
import { useState, useEffect } from 'react';

export interface FavCompany {
  id: string;
  name: string;
  logo?: string | null;
  slug: string;
  city?: { name: string } | null;
}

export interface FavStation {
  id: string;
  name: string;
  address?: string | null;
  city?: { name: string } | null;
}

interface FavoritesStore {
  companies: FavCompany[];
  stations: FavStation[];
}

const KEY = 'transpro_passenger_favorites';

function loadFromStorage(): FavoritesStore {
  if (typeof window === 'undefined') return { companies: [], stations: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { companies: [], stations: [] };
  } catch {
    return { companies: [], stations: [] };
  }
}

function persist(data: FavoritesStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function useFavorites() {
  const [favs, setFavs] = useState<FavoritesStore>({ companies: [], stations: [] });

  useEffect(() => {
    setFavs(loadFromStorage());
  }, []);

  function toggleCompany(company: FavCompany) {
    setFavs((prev) => {
      const exists = prev.companies.some((c) => c.id === company.id);
      const next: FavoritesStore = exists
        ? { ...prev, companies: prev.companies.filter((c) => c.id !== company.id) }
        : {
            ...prev,
            companies: [
              ...prev.companies,
              { id: company.id, name: company.name, logo: company.logo, slug: company.slug, city: company.city },
            ],
          };
      persist(next);
      return next;
    });
  }

  function toggleStation(station: FavStation) {
    setFavs((prev) => {
      const exists = prev.stations.some((s) => s.id === station.id);
      const next: FavoritesStore = exists
        ? { ...prev, stations: prev.stations.filter((s) => s.id !== station.id) }
        : {
            ...prev,
            stations: [
              ...prev.stations,
              { id: station.id, name: station.name, address: station.address, city: station.city },
            ],
          };
      persist(next);
      return next;
    });
  }

  function isCompanyFavorite(id: string) {
    return favs.companies.some((c) => c.id === id);
  }

  function isStationFavorite(id: string) {
    return favs.stations.some((s) => s.id === id);
  }

  return { favs, toggleCompany, toggleStation, isCompanyFavorite, isStationFavorite };
}
