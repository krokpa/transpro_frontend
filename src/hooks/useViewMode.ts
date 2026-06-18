'use client';

import { useState, useEffect } from 'react';
import type { ViewMode } from '@/components/ui/ViewToggle';

export function useViewMode(key: string, defaultMode: ViewMode = 'list'): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    const stored = localStorage.getItem(`view-mode:${key}`) as ViewMode | null;
    if (stored === 'list' || stored === 'grid') setMode(stored);
  }, [key]);

  function update(m: ViewMode) {
    setMode(m);
    localStorage.setItem(`view-mode:${key}`, m);
  }

  return [mode, update];
}
