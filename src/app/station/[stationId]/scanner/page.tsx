'use client';

import { useState, useEffect, useRef } from 'react';
import { paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import { ScanLine, CheckCircle, XCircle, Loader2, RotateCcw, User, MapPin, Clock, Hash } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'error';

export default function StationScannerPage() {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} }
    };
  }, []);

  async function startScanner() {
    setState('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-station');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop();
          scannerRef.current = null;
          await processQr(decodedText);
        },
        () => {},
      );
    } catch (err: any) {
      setState('error');
      setErrorMsg(err?.message?.includes('NotAllowed') ? 'Accès caméra refusé' : 'Impossible d\'ouvrir la caméra');
    }
  }

  async function processQr(qrData: string) {
    setState('loading');
    try {
      const res = await paymentsApi.scanTicket(qrData) as any;
      setResult(res);
      setState('success');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? 'Billet invalide ou déjà scanné');
      setState('error');
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await processQr(manualInput.trim());
    setManualInput('');
  }

  function reset() { setState('idle'); setResult(null); setErrorMsg(''); setManualInput(''); }

  return (
    <div className="p-6 max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Scanner billets</h1>
        <p className="text-gray-400 text-sm">Validez les billets des passagers</p>
      </div>

      {state === 'idle' && (
        <div className="space-y-4">
          <button
            onClick={startScanner}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-4 flex items-center justify-center gap-3 text-lg transition shadow-lg shadow-brand-500/20"
          >
            <ScanLine size={24} /> Scanner un QR code
          </button>
          <div className="text-center text-gray-400 text-xs">— ou saisir manuellement —</div>
          <form onSubmit={handleManual} className="flex gap-2">
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Données QR code..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" className="bg-brand-500 text-white px-4 rounded-lg text-sm font-semibold hover:bg-brand-600 transition">
              Valider
            </button>
          </form>
        </div>
      )}

      {state === 'scanning' && (
        <div className="space-y-4">
          <div id="qr-reader-station" className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: 300 }} />
          <button onClick={reset} className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition">
            Annuler
          </button>
        </div>
      )}

      {state === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 size={40} className="text-brand-500 animate-spin" />
          <p className="text-gray-500">Vérification en cours...</p>
        </div>
      )}

      {state === 'success' && result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-green-800">Billet Valide ✓</p>
            <p className="text-green-600 text-sm mt-1">
              {result.alreadyScanned ? 'Déjà scanné précédemment' : 'Premier passage validé'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <User size={14} className="text-gray-400" />
              {result.booking?.passenger?.firstName} {result.booking?.passenger?.lastName}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin size={14} className="text-gray-400" />
              {result.booking?.trip?.route?.originCity?.name} → {result.booking?.trip?.route?.destinationCity?.name}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock size={14} className="text-gray-400" />
              {dayjs(result.booking?.trip?.departureAt).format('DD/MM/YYYY HH:mm')}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Hash size={14} className="text-gray-400" />
              Siège {result.ticket?.seatNumber} · Réf. {result.booking?.reference}
            </div>
          </div>
          <button onClick={reset} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 font-semibold transition flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Scanner suivant
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <XCircle size={48} className="text-red-500 mx-auto mb-3" />
            <p className="text-xl font-bold text-red-800">Billet Invalide</p>
            <p className="text-red-600 text-sm mt-1">{errorMsg}</p>
          </div>
          <button onClick={reset} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 font-semibold transition flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
