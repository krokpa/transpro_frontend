'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useBranding } from '@/lib/branding';

export default function AppLoader({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const { appName, logoUrl } = useBranding();

  useEffect(() => {
    // Zustand persist exposes hasHydrated() after rehydration from storage
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Already hydrated by the time this runs (fast storage)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => unsub();
  }, []);

  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          {/* Marque (logo ou nom configuré) */}
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={appName} className="h-11 w-auto max-w-[200px] object-contain" />
          ) : (
            <span className="text-2xl font-bold tracking-tight text-gray-900">{appName}</span>
          )}

          {/* Spinner (couleur de marque via --brand-500) */}
          <svg
            className="h-8 w-8 animate-spin text-brand-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
