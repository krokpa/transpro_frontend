'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketTemplatesApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Type, QrCode, Image, Square, Minus, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Trash2, ChevronLeft, Save, Eye, X,
  Plus, Variable, HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type ElementType = 'text' | 'qrcode' | 'image' | 'rect' | 'line';

interface TemplateElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAPER_SIZES: Record<string, { width: number; height: number; label: string }> = {
  THERMAL_80: { width: 302, height: 529, label: 'Thermique 80mm' },
  THERMAL_58: { width: 219, height: 529, label: 'Thermique 58mm' },
  A4: { width: 595, height: 842, label: 'A4' },
};

const VARIABLES = [
  { key: '{{passenger_name}}', label: 'Nom du passager' },
  { key: '{{passenger_phone}}', label: 'Téléphone' },
  { key: '{{origin}}', label: 'Ville de départ' },
  { key: '{{destination}}', label: 'Destination' },
  { key: '{{departure_date}}', label: 'Date de départ' },
  { key: '{{departure_time}}', label: 'Heure de départ' },
  { key: '{{seat_number}}', label: 'Numéro de siège' },
  { key: '{{trip_class}}', label: 'Classe' },
  { key: '{{price}}', label: 'Prix' },
  { key: '{{booking_ref}}', label: 'Référence réservation' },
  { key: '{{company_name}}', label: 'Nom de la compagnie' },
];

const SAMPLE_DATA: Record<string, string> = {
  '{{passenger_name}}': 'Konan Yves',
  '{{passenger_phone}}': '+225 07 08 09 10',
  '{{origin}}': 'Abidjan',
  '{{destination}}': 'Bouaké',
  '{{departure_date}}': '20/05/2026',
  '{{departure_time}}': '08:30',
  '{{seat_number}}': 'A12',
  '{{trip_class}}': 'VIP',
  '{{price}}': '5 500 FCFA',
  '{{booking_ref}}': 'TP-ABC123',
  '{{company_name}}': 'TransPro CI',
};

const ELEMENT_DEFAULTS: Record<ElementType, Partial<TemplateElement>> = {
  text: { width: 180, height: 28, content: 'Texte', fontSize: 14, color: '#000000', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left' },
  qrcode: { width: 80, height: 80, content: '{{booking_ref}}' },
  image: { width: 80, height: 40, content: '' },
  rect: { width: 160, height: 40, bgColor: '#f3f4f6', borderColor: '#d1d5db', borderWidth: 1, borderRadius: 4 },
  line: { width: 200, height: 2, bgColor: '#d1d5db' },
};

const PALETTE: { type: ElementType; label: string; icon: any }[] = [
  { type: 'text', label: 'Texte', icon: Type },
  { type: 'qrcode', label: 'QR Code', icon: QrCode },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'rect', label: 'Rectangle', icon: Square },
  { type: 'line', label: 'Ligne', icon: Minus },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return `el-${Math.random().toString(36).slice(2, 9)}`;
}

function substituteVars(text: string, preview: boolean): string {
  if (!preview) return text;
  return VARIABLES.reduce((acc, v) => acc.replaceAll(v.key, SAMPLE_DATA[v.key] ?? v.key), text);
}

// ─── Element Renderer ─────────────────────────────────────────────────────────

function RenderElement({ el, preview }: { el: TemplateElement; preview: boolean }) {
  if (el.type === 'text') {
    return (
      <div
        style={{
          width: '100%', height: '100%',
          fontSize: el.fontSize ?? 14,
          fontWeight: el.fontWeight ?? 'normal',
          fontStyle: el.fontStyle ?? 'normal',
          textAlign: el.textAlign as any ?? 'left',
          color: el.color ?? '#000',
          lineHeight: 1.3,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {substituteVars(el.content ?? '', preview)}
      </div>
    );
  }
  if (el.type === 'qrcode') {
    return (
      <div
        style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb' }}
      >
        {preview ? (
          <svg viewBox="0 0 100 100" style={{ width: '80%', height: '80%' }}>
            <rect x="5" y="5" width="40" height="40" fill="none" stroke="#000" strokeWidth="6"/>
            <rect x="15" y="15" width="20" height="20" fill="#000"/>
            <rect x="55" y="5" width="40" height="40" fill="none" stroke="#000" strokeWidth="6"/>
            <rect x="65" y="15" width="20" height="20" fill="#000"/>
            <rect x="5" y="55" width="40" height="40" fill="none" stroke="#000" strokeWidth="6"/>
            <rect x="15" y="65" width="20" height="20" fill="#000"/>
            {/* dots */}
            <rect x="55" y="55" width="8" height="8" fill="#000"/>
            <rect x="67" y="55" width="8" height="8" fill="#000"/>
            <rect x="79" y="55" width="8" height="8" fill="#000"/>
            <rect x="55" y="67" width="8" height="8" fill="#000"/>
            <rect x="79" y="67" width="8" height="8" fill="#000"/>
            <rect x="55" y="79" width="8" height="8" fill="#000"/>
            <rect x="67" y="79" width="8" height="8" fill="#000"/>
            <rect x="79" y="79" width="8" height="8" fill="#000"/>
          </svg>
        ) : (
          <span style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center', padding: 4 }}>QR</span>
        )}
      </div>
    );
  }
  if (el.type === 'image') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#f9fafb', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, color: '#9ca3af' }}>Logo</span>
      </div>
    );
  }
  if (el.type === 'rect') {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: el.bgColor ?? 'transparent',
        border: `${el.borderWidth ?? 1}px solid ${el.borderColor ?? '#d1d5db'}`,
        borderRadius: el.borderRadius ?? 0,
      }} />
    );
  }
  if (el.type === 'line') {
    return <div style={{ width: '100%', height: '100%', background: el.bgColor ?? '#d1d5db' }} />;
  }
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketTemplateEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState('THERMAL_80');
  const [previewMode, setPreviewMode] = useState(false);
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: template, isLoading } = useQuery({
    queryKey: ['ticket-template', params.id],
    queryFn: () => ticketTemplatesApi.get(params.id) as any,
  });

  useEffect(() => {
    if (template) {
      setElements(Array.isArray(template.layout) ? template.layout : []);
      setPaperSize(template.paperSize ?? 'THERMAL_80');
      setTemplateName(template.name ?? '');
    }
  }, [template]);

  const saveMut = useMutation({
    mutationFn: (data: any) => ticketTemplatesApi.update(params.id, data) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Modèle sauvegardé');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const selectedEl = elements.find((e) => e.id === selectedId) ?? null;

  const canvas = PAPER_SIZES[paperSize] ?? PAPER_SIZES.THERMAL_80;

  // Drag state
  const dragState = useRef<{ elId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const dx = (e.clientX - dragState.current.startX) * scale;
    const dy = (e.clientY - dragState.current.startY) * scale;
    setElements((prev) =>
      prev.map((el) =>
        el.id === dragState.current!.elId
          ? { ...el, x: Math.max(0, dragState.current!.origX + dx), y: Math.max(0, dragState.current!.origY + dy) }
          : el,
      ),
    );
  }, [canvas.width]);

  const handleCanvasMouseUp = useCallback(() => {
    dragState.current = null;
  }, []);

  function startDrag(e: React.MouseEvent, el: TemplateElement) {
    e.stopPropagation();
    e.preventDefault();
    dragState.current = { elId: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    setSelectedId(el.id);
  }

  function addElement(type: ElementType) {
    const defaults = ELEMENT_DEFAULTS[type];
    const newEl: TemplateElement = {
      id: uid(),
      type,
      x: 20,
      y: 20,
      width: defaults.width ?? 100,
      height: defaults.height ?? 30,
      ...defaults,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }

  function updateSelected(patch: Partial<TemplateElement>) {
    if (!selectedId) return;
    setElements((prev) => prev.map((e) => (e.id === selectedId ? { ...e, ...patch } : e)));
  }

  function insertVariable(v: string) {
    if (!selectedId) return;
    setElements((prev) =>
      prev.map((e) =>
        e.id === selectedId ? { ...e, content: (e.content ?? '') + v } : e,
      ),
    );
    setShowVarPicker(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-6 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push('/dashboard/ticket-templates')}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{templateName}</p>
          <p className="text-xs text-gray-400">{PAPER_SIZES[paperSize]?.label}</p>
        </div>
        <button
          onClick={() => setPreviewMode((p) => !p)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition',
            previewMode ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-50',
          )}
        >
          <Eye size={15} /> Aperçu
        </button>
        <button
          onClick={() => setShowHelp((p) => !p)}
          title="Aide"
          className={clsx(
            'p-1.5 rounded-lg transition',
            showHelp ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
          )}
        >
          <HelpCircle size={17} />
        </button>
        <button
          disabled={saveMut.isPending}
          onClick={() => saveMut.mutate({ layout: elements, paperSize })}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 transition"
        >
          <Save size={15} /> {saveMut.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <div className="w-48 bg-white border-r border-gray-100 p-3 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Éléments</p>
          <div className="space-y-1">
            {PALETTE.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => addElement(type)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition text-left"
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {elements.length > 0 && (
            <>
              <div className="my-3 h-px bg-gray-100" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Calques</p>
              <div className="space-y-0.5">
                {[...elements].reverse().map((el) => (
                  <button
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    className={clsx(
                      'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition',
                      selectedId === el.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {el.type === 'text' && <Type size={11} />}
                    {el.type === 'qrcode' && <QrCode size={11} />}
                    {el.type === 'image' && <Image size={11} />}
                    {el.type === 'rect' && <Square size={11} />}
                    {el.type === 'line' && <Minus size={11} />}
                    <span className="truncate">{el.type === 'text' ? (el.content?.slice(0, 16) || 'Texte') : el.type}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 overflow-auto flex flex-col">
          {/* Help panel */}
          {showHelp && (
            <div className="bg-blue-50 border-b border-blue-100 px-5 py-4 shrink-0">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-bold text-blue-800">Guide de l'éditeur</p>
                <button onClick={() => setShowHelp(false)} className="text-blue-400 hover:text-blue-700"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-blue-800">
                <div>
                  <p className="font-semibold mb-1">Ajouter des éléments</p>
                  <p className="text-blue-700/70 leading-relaxed">Cliquez sur un élément dans la palette à gauche (Texte, QR Code, Rectangle…) pour l'ajouter au canevas.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Positionner</p>
                  <p className="text-blue-700/70 leading-relaxed">Glissez-déposez chaque élément sur le canevas. Affinez la position exacte (X/Y) dans le panneau Propriétés à droite.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Variables dynamiques</p>
                  <p className="text-blue-700/70 leading-relaxed">Sélectionnez un texte puis cliquez <strong>Variables</strong> pour insérer <code className="bg-blue-100 px-0.5 rounded">{'{{passenger_name}}'}</code>, <code className="bg-blue-100 px-0.5 rounded">{'{{origin}}'}</code>, etc. Ils seront remplacés à l'impression.</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Aperçu & Sauvegarde</p>
                  <p className="text-blue-700/70 leading-relaxed">Cliquez <strong>Aperçu</strong> pour visualiser le rendu avec des données fictives. Puis <strong>Sauvegarder</strong> pour enregistrer les modifications.</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs font-semibold text-blue-800 mb-1.5">Variables disponibles</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <span key={v.key} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-[10px] font-mono">
                      {v.key} <span className="text-blue-500 font-sans">· {v.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto flex items-start justify-center p-8">
          <div
            style={{ transform: 'none' }}
            className="shadow-xl"
          >
            <div
              ref={canvasRef}
              onClick={(e) => { if (e.target === canvasRef.current) setSelectedId(null); }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{
                position: 'relative',
                width: canvas.width,
                height: canvas.height,
                background: '#fff',
                userSelect: 'none',
              }}
            >
              {elements.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', maxWidth: 160, lineHeight: 1.5 }}>
                    Cliquez sur un élément dans la palette pour commencer
                  </p>
                </div>
              )}
              {elements.map((el) => (
                <div
                  key={el.id}
                  onMouseDown={(e) => startDrag(e, el)}
                  style={{
                    position: 'absolute',
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    cursor: previewMode ? 'default' : 'move',
                    outline: !previewMode && selectedId === el.id ? '2px solid #6366f1' : 'none',
                    outlineOffset: 1,
                    boxSizing: 'border-box',
                  }}
                >
                  <RenderElement el={el} preview={previewMode} />
                </div>
              ))}
            </div>
          </div>
          </div>
          </div>

        {/* Right properties */}
        {!previewMode && selectedEl && (
          <div className="w-64 bg-white border-l border-gray-100 p-4 shrink-0 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Propriétés</p>
              <button
                onClick={deleteSelected}
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Position & Size */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Position & Taille</p>
              <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'width', 'height'] as const).map((prop) => (
                  <div key={prop}>
                    <label className="text-[10px] text-gray-400 uppercase">{prop}</label>
                    <input
                      type="number"
                      value={Math.round(selectedEl[prop] as number)}
                      onChange={(e) => updateSelected({ [prop]: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Text properties */}
            {selectedEl.type === 'text' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-600">Contenu</p>
                    <button
                      onClick={() => setShowVarPicker((p) => !p)}
                      className="flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-800"
                    >
                      <Variable size={10} /> Variables
                    </button>
                  </div>
                  {showVarPicker && (
                    <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                      {VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          onClick={() => insertVariable(v.key)}
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-brand-50 hover:text-brand-700 border-b border-gray-50 last:border-0"
                        >
                          <span className="font-mono text-brand-600 text-[10px]">{v.key}</span>
                          <br />
                          <span className="text-gray-500">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={selectedEl.content ?? ''}
                    onChange={(e) => updateSelected({ content: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-mono"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Typographie</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] text-gray-400">Taille (px)</label>
                      <input
                        type="number"
                        value={selectedEl.fontSize ?? 14}
                        onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">Couleur</label>
                      <input
                        type="color"
                        value={selectedEl.color ?? '#000000'}
                        onChange={(e) => updateSelected({ color: e.target.value })}
                        className="w-full h-7 border border-gray-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateSelected({ fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      className={clsx('p-1.5 rounded border text-xs transition', selectedEl.fontWeight === 'bold' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                    >
                      <Bold size={12} />
                    </button>
                    <button
                      onClick={() => updateSelected({ fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={clsx('p-1.5 rounded border text-xs transition', selectedEl.fontStyle === 'italic' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                    >
                      <Italic size={12} />
                    </button>
                    {(['left', 'center', 'right'] as const).map((a) => {
                      const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
                      return (
                        <button
                          key={a}
                          onClick={() => updateSelected({ textAlign: a })}
                          className={clsx('p-1.5 rounded border text-xs transition', selectedEl.textAlign === a ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                        >
                          <Icon size={12} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Rect properties */}
            {selectedEl.type === 'rect' && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Apparence</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-20">Fond</label>
                    <input
                      type="color"
                      value={selectedEl.bgColor ?? '#f3f4f6'}
                      onChange={(e) => updateSelected({ bgColor: e.target.value })}
                      className="h-6 w-10 border border-gray-200 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-20">Bordure</label>
                    <input
                      type="color"
                      value={selectedEl.borderColor ?? '#d1d5db'}
                      onChange={(e) => updateSelected({ borderColor: e.target.value })}
                      className="h-6 w-10 border border-gray-200 rounded cursor-pointer"
                    />
                    <input
                      type="number"
                      value={selectedEl.borderWidth ?? 1}
                      onChange={(e) => updateSelected({ borderWidth: Number(e.target.value) })}
                      className="w-12 px-1.5 py-1 border border-gray-200 rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-400 w-20">Radius</label>
                    <input
                      type="number"
                      value={selectedEl.borderRadius ?? 0}
                      onChange={(e) => updateSelected({ borderRadius: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Line properties */}
            {selectedEl.type === 'line' && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Ligne</p>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-400 w-20">Couleur</label>
                  <input
                    type="color"
                    value={selectedEl.bgColor ?? '#d1d5db'}
                    onChange={(e) => updateSelected({ bgColor: e.target.value })}
                    className="h-6 w-10 border border-gray-200 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
