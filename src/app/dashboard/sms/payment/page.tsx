'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { smsPackagesApi } from '@/lib/api';

export default function SmsPaymentResultPage() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get('status') ?? 'success'; // success | error
  const purchaseId = params.get('purchaseId');
  const [checking, setChecking] = useState(!!purchaseId && status === 'success');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!purchaseId || status !== 'success') {
      setChecking(false);
      return;
    }
    smsPackagesApi.confirmRedirect(purchaseId).then((res: any) => {
      setConfirmed(res?.status === 'SUCCESS');
    }).finally(() => setChecking(false));
  }, [purchaseId, status]);

  const success = status === 'success';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 space-y-5">
      {checking ? (
        <>
          <Loader2 size={40} className="animate-spin text-brand-500" />
          <p className="text-slate-600">Confirmation du paiement en cours…</p>
        </>
      ) : success ? (
        <>
          <CheckCircle2 size={56} className="text-green-500" />
          <h1 className="text-2xl font-bold text-slate-900">Paiement réussi !</h1>
          <p className="text-slate-500">Vos crédits SMS ont été ajoutés à votre compte.</p>
          <button onClick={() => router.push('/dashboard/sms')}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl px-6 py-3 transition">
            Voir mes crédits
          </button>
        </>
      ) : (
        <>
          <XCircle size={56} className="text-red-500" />
          <h1 className="text-2xl font-bold text-slate-900">Paiement échoué</h1>
          <p className="text-slate-500">Le paiement n'a pas pu être complété. Aucun montant n'a été débité.</p>
          <button onClick={() => router.push('/dashboard/sms')}
            className="border border-slate-200 text-slate-700 font-semibold rounded-xl px-6 py-3 hover:bg-slate-50 transition">
            Réessayer
          </button>
        </>
      )}
    </div>
  );
}
