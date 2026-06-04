'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function FacebookCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash;        // #access_token=...&...
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');

    if (token && window.opener) {
      window.opener.postMessage(
        { type: 'FB_AUTH_SUCCESS', token },
        window.location.origin,
      );
    } else if (window.opener) {
      window.opener.postMessage(
        { type: 'FB_AUTH_ERROR' },
        window.location.origin,
      );
    }

    window.close();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm">Connexion Facebook en cours…</p>
      </div>
    </div>
  );
}
