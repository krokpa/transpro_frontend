'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketTemplatesApi } from '@/lib/api';
import { Plus, Copy, Star, Pencil, Trash2, TicketCheck, FileText, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const PAPER_LABELS: Record<string, string> = {
  THERMAL_80: 'Thermique 80mm',
  THERMAL_58: 'Thermique 58mm',
  A4: 'A4',
};

type Template = Record<string, any>;

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100/50 transition"
      >
        <span className="flex items-center gap-2"><Info size={15} /> Comment ça marche ?</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-blue-800">
          {[
            { step: '1', title: 'Créez un modèle', desc: 'Choisissez un nom et le format papier (thermique 80mm recommandé pour les imprimantes de gare).' },
            { step: '2', title: 'Éditez le design', desc: 'Ajoutez des éléments (texte, QR code, lignes) depuis la palette, positionnez-les par glisser-déposer.' },
            { step: '3', title: 'Insérez des variables', desc: 'Utilisez {{passenger_name}}, {{origin}}, {{departure_date}}, {{booking_ref}}, etc. pour des données dynamiques.' },
            { step: '4', title: 'Définissez par défaut', desc: 'Le modèle par défaut est utilisé automatiquement au guichet et en billetterie. Changez-le à tout moment.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{step}</div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-blue-700/70 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketTemplatesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPaperSize, setNewPaperSize] = useState('THERMAL_80');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ticket-templates'],
    queryFn: () => ticketTemplatesApi.list() as any,
  });

  const templates: Template[] = Array.isArray(data) ? data : [];

  const createMut = useMutation({
    mutationFn: (d: any) => ticketTemplatesApi.create(d) as any,
    onSuccess: (tpl) => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      setShowCreate(false);
      setNewName('');
      toast.success('Modèle créé');
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: string) => ticketTemplatesApi.setDefault(id) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Modèle défini par défaut');
    },
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => ticketTemplatesApi.duplicate(id) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Modèle dupliqué');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ticketTemplatesApi.remove(id) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      setDeletingId(null);
      toast.success('Modèle supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modèles de tickets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Concevez vos modèles d'impression de billets physiques
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
        >
          <Plus size={16} />
          Nouveau modèle
        </button>
      </div>

      <HowItWorks />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <TicketCheck size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Aucun modèle de ticket</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez votre premier modèle pour imprimer des billets physiques
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition"
          >
            <Plus size={16} /> Créer un modèle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-brand-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{tpl.name}</p>
                      {tpl.isDefault && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                          Par défaut
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {PAPER_LABELS[tpl.paperSize] ?? tpl.paperSize}
                    </p>
                  </div>
                </div>
              </div>

              {tpl.description && (
                <p className="text-xs text-gray-500 -mt-1">{tpl.description}</p>
              )}

              <div className="text-xs text-gray-400">
                {Array.isArray(tpl.layout) ? tpl.layout.length : 0} élément(s)
              </div>

              <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
                <Link
                  href={`/dashboard/ticket-templates/${tpl.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition"
                >
                  <Pencil size={12} /> Éditer
                </Link>
                <button
                  onClick={() => duplicateMut.mutate(tpl.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                >
                  <Copy size={12} /> Dupliquer
                </button>
                {!tpl.isDefault && (
                  <button
                    onClick={() => setDefaultMut.mutate(tpl.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                  >
                    <Star size={12} /> Défaut
                  </button>
                )}
                <button
                  onClick={() => setDeletingId(tpl.id)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nouveau modèle</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du modèle
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Ticket standard thermique"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format papier
                </label>
                <select
                  value={newPaperSize}
                  onChange={(e) => setNewPaperSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Object.entries(PAPER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                disabled={!newName.trim() || createMut.isPending}
                onClick={() => createMut.mutate({ name: newName.trim(), paperSize: newPaperSize })}
                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition"
              >
                {createMut.isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Supprimer le modèle ?</h2>
            <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deletingId)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition"
              >
                {deleteMut.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
