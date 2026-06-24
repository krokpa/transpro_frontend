'use client';

import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useBranding } from '@/lib/branding';

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const { appName } = useBranding();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-500 text-white rounded-xl p-1.5"><KeyRound size={16} /></div>
            <span className="font-bold text-gray-900 text-sm">{appName}</span>
          </div>
          <Link href="/developer/register" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5">
            <ArrowLeft size={15} /> Retour
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
        <p className="text-sm text-gray-400 mt-2">Dernière mise à jour : {updated}</p>
        <div className="legal-body mt-8 space-y-6 text-[15px] leading-relaxed text-gray-700">
          {children}
        </div>
        <style jsx global>{`
          .legal-body h2 { font-size: 1.05rem; font-weight: 700; color: #111827; margin-top: 1.5rem; }
          .legal-body p { margin-top: .5rem; }
          .legal-body ul { list-style: disc; padding-left: 1.25rem; margin-top: .5rem; }
          .legal-body li { margin-top: .25rem; }
          .legal-body a { color: rgb(var(--brand-600)); font-weight: 500; }
        `}</style>
      </main>
    </div>
  );
}
