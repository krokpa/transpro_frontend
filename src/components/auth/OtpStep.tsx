'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Phone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { OtpInput } from './OtpInput';
import { otpApi } from '@/lib/api';

interface Props {
  phone: string;
  onVerified: (token: string) => void;
}

const RESEND_COOLDOWN = 120; // secondes

export function OtpStep({ phone, onVerified }: Props) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | undefined>();
  const [countdown, setCountdown] = useState(0);

  const sendOtp = useCallback(async () => {
    setSending(true);
    setOtpError(undefined);
    try {
      await otpApi.send(phone);
      setSent(true);
      setCountdown(RESEND_COOLDOWN);
      toast.success(`Code envoyé au ${phone}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }, [phone]);

  // Envoi automatique à l'arrivée sur l'étape
  useEffect(() => {
    sendOtp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Décompte resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleComplete = useCallback(
    async (code: string) => {
      setVerifying(true);
      setOtpError(undefined);
      try {
        const result = await otpApi.verify(phone, code) as any;
        setVerified(true);
        onVerified(result.phoneVerificationToken);
      } catch (err: any) {
        setOtpError(err.message);
      } finally {
        setVerifying(false);
      }
    },
    [phone, onVerified],
  );

  return (
    <div className="space-y-6 text-center">
      {/* Icône animée */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex justify-center"
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${verified ? 'bg-green-100' : 'bg-brand-50'}`}>
          {verified
            ? <CheckCircle2 size={32} className="text-green-500" />
            : <Phone size={32} className="text-brand-500" />
          }
        </div>
      </motion.div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Vérification du téléphone</h2>
        <p className="text-slate-500 text-sm mt-1">
          {verified
            ? 'Numéro vérifié avec succès !'
            : <>Entrez le code à 6 chiffres envoyé au<br /><span className="font-semibold text-slate-700">{phone}</span></>
          }
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!verified ? (
          <motion.div
            key="otp-input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {(sending && !sent) ? (
              <div className="flex justify-center py-4">
                <Loader2 size={24} className="animate-spin text-brand-500" />
              </div>
            ) : (
              <OtpInput
                onComplete={handleComplete}
                error={otpError}
                disabled={verifying}
              />
            )}

            {verifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Vérification…
              </div>
            )}

            {/* Resend */}
            {sent && !verifying && (
              <div className="text-sm text-slate-500">
                {countdown > 0 ? (
                  <span>Renvoyer dans <span className="font-semibold text-brand-600">{countdown}s</span></span>
                ) : (
                  <button
                    onClick={sendOtp}
                    disabled={sending}
                    className="flex items-center gap-1.5 mx-auto text-brand-500 hover:text-brand-600 font-medium transition"
                  >
                    <RefreshCw size={14} className={sending ? 'animate-spin' : ''} />
                    Renvoyer le code
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="verified"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="py-4"
          >
            <p className="text-green-600 font-semibold">Téléphone vérifié ✓</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
