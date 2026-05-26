'use client';

import { useState, useEffect, useRef } from 'react';
import { paymentsApi } from '@/lib/api';
import { formatCFA } from '@transpro/shared';
import {
  ScanLine, CheckCircle, XCircle, Loader2, RotateCcw,
  User, MapPin, Clock, Hash,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'error';

export default function ScannerPage() {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  async function startScanner() {
    setState('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
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
      setErrorMsg(err?.message ?? 'Impossible d\'accéder à la caméra');
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setState('idle');
  }

  async function processQr(qrData: string) {
    setState('loading');
    try {
      const res = await paymentsApi.scanTicket(qrData) as any;
      setResult(res);
      setState('success');
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = raw?.error ?? raw?.message ?? err?.message ?? 'Billet invalide';
      setErrorMsg(Array.isArray(msg) ? msg.join(' | ') : msg);
      setState('error');
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await processQr(manualInput.trim());
  }

  function reset() {
    setState('idle');
    setResult(null);
    setErrorMsg('');
    setManualInput('');
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scanner de billets</h1>
        <p className="text-sm text-gray-500 mt-1">Validez l'embarquement des passagers en scannant leur QR code</p>
      </div>

      {/* IDLE */}
      {state === 'idle' && (
        <div className="space-y-4">
          <button
            onClick={startScanner}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-base transition"
          >
            <ScanLine size={22} /> Scanner un QR code
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">ou saisir manuellement</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Coller les données du QR code..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-40"
            >
              Valider
            </button>
          </form>
        </div>
      )}

      {/* SCANNING */}
      {state === 'scanning' && (
        <div className="space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
            <div id="qr-reader" className="w-full h-full" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 border-2 border-white/60 rounded-xl relative">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">Pointez la caméra vers le QR code du billet</p>
          <button onClick={stopScanner} className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            Annuler
          </button>
        </div>
      )}

      {/* LOADING */}
      {state === 'loading' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-brand-500" />
          <p className="text-gray-600 font-medium">Vérification du billet...</p>
        </div>
      )}

      {/* SUCCESS */}
      {state === 'success' && result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <div>
              <p className="font-bold text-green-800 text-lg">Billet valide ✓</p>
              <p className="text-sm text-green-700">Siège {result.ticket?.seatNumber} — embarquement autorisé</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-bold text-gray-800">Informations passager</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <User size={14} className="text-gray-400" />
                <span>{result.booking?.passenger?.firstName} {result.booking?.passenger?.lastName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={14} className="text-gray-400" />
                <span>{result.booking?.trip?.route?.originCity?.name} → {result.booking?.trip?.route?.destinationCity?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={14} className="text-gray-400" />
                <span>{dayjs(result.booking?.trip?.departureAt).format('ddd D MMM · HH:mm')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Hash size={14} className="text-gray-400" />
                <span>Réf. {result.booking?.reference}</span>
              </div>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >
            <ScanLine size={18} /> Scanner le prochain billet
          </button>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <XCircle size={28} className="text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-800 text-lg">Billet invalide</p>
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
          >
            <RotateCcw size={16} /> Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
