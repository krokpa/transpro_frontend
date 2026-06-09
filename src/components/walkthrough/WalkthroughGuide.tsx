'use client';

import { useEffect, useState, useCallback } from 'react';
import { Joyride, STATUS, type EventData, type Step } from 'react-joyride';
import { isWalkthroughDone, markWalkthroughDone } from '@/lib/walkthrough';

type Props = {
  role: string;
  steps: Step[];
};

export function WalkthroughGuide({ role, steps }: Props) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!isWalkthroughDone(role)) {
      // Délai pour laisser le DOM se stabiliser après le rendu initial
      const t = setTimeout(() => setRun(true), 900);
      return () => clearTimeout(t);
    }
  }, [role]);

  const handleEvent = useCallback(
    (data: EventData) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        markWalkthroughDone(role);
        setRun(false);
      }
    },
    [role],
  );

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: '#f97316',
        overlayColor: 'rgba(15, 23, 42, 0.52)',
        zIndex: 9999,
        showProgress: true,
        skipBeacon: true,
        buttons: ['back', 'primary', 'skip'] as any,
        overlayClickAction: false,
        spotlightRadius: 10,
        scrollOffset: 80,
      }}
      locale={{
        back: '← Précédent',
        close: 'Fermer',
        last: 'Terminer ✓',
        next: 'Suivant →',
        open: 'Ouvrir',
        skip: 'Passer le tutoriel',
      }}
      styles={{
        tooltip: {
          borderRadius: '16px',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.20)',
          padding: '20px',
          maxWidth: '340px',
        } as React.CSSProperties,
        tooltipTitle: {
          fontSize: '15px',
          fontWeight: '700',
          marginBottom: '8px',
          color: '#0f172a',
        } as React.CSSProperties,
        tooltipContent: {
          fontSize: '13.5px',
          color: '#475569',
          lineHeight: '1.65',
          padding: '0 0 4px',
        } as React.CSSProperties,
        buttonNext: {
          backgroundColor: '#f97316',
          borderRadius: '10px',
          padding: '8px 18px',
          fontSize: '13px',
          fontWeight: '600',
          border: 'none',
          outline: 'none',
        } as React.CSSProperties,
        buttonBack: {
          color: '#64748b',
          fontSize: '13px',
          fontWeight: '500',
          marginRight: '8px',
        } as React.CSSProperties,
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '12px',
        } as React.CSSProperties,
      } as any}
    />
  );
}

// Nécessaire pour JSX dans le fichier
import React from 'react';
