'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { _registerConfirmListener, _resolveConfirm, ConfirmOptions } from '@/lib/confirm';

const VARIANT_CFG = {
  danger: {
    Icon:    Trash2,
    iconCls: 'text-red-500 bg-red-50',
    btnCls:  'bg-red-500 hover:bg-red-600 text-white',
    defaultConfirm: 'Supprimer',
  },
  warning: {
    Icon:    AlertTriangle,
    iconCls: 'text-amber-500 bg-amber-50',
    btnCls:  'bg-amber-500 hover:bg-amber-600 text-white',
    defaultConfirm: 'Confirmer',
  },
  info: {
    Icon:    Info,
    iconCls: 'text-blue-500 bg-blue-50',
    btnCls:  'bg-blue-500 hover:bg-blue-600 text-white',
    defaultConfirm: 'Confirmer',
  },
} satisfies Record<string, { Icon: any; iconCls: string; btnCls: string; defaultConfirm: string }>;

export function ConfirmDialog() {
  const [state, setState] = useState<{ options: ConfirmOptions; id: number } | null>(null);

  useEffect(() => _registerConfirmListener(setState), []);

  function handle(value: boolean) {
    setState(null);
    _resolveConfirm(value);
  }

  const options = state?.options;
  const variant = options?.variant ?? 'danger';
  const cfg     = VARIANT_CFG[variant];
  const { Icon } = cfg;

  return (
    <Dialog.Root open={!!state} onOpenChange={(open) => !open && handle(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="
          fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200]
          data-[state=open]:animate-in  data-[state=open]:fade-in-0
          data-[state=closed]:animate-out data-[state=closed]:fade-out-0
        " />
        <Dialog.Content
          aria-describedby={options?.description ? 'confirm-desc' : undefined}
          className="
            fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201]
            w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 outline-none
            data-[state=open]:animate-in  data-[state=open]:fade-in-0  data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          "
        >
          {options && (
            <>
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconCls}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <Dialog.Title className="text-base font-semibold text-gray-900 leading-snug">
                    {options.title}
                  </Dialog.Title>
                  {options.description && (
                    <Dialog.Description id="confirm-desc" className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {options.description}
                    </Dialog.Description>
                  )}
                </div>
              </div>

              {/* Close ✕ */}
              <Dialog.Close asChild>
                <button
                  onClick={() => handle(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition"
                  aria-label="Fermer"
                >
                  <X size={15} />
                </button>
              </Dialog.Close>

              {/* Actions */}
              <div className="flex gap-2.5 mt-5 justify-end">
                <button
                  onClick={() => handle(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  {options.cancelLabel ?? 'Annuler'}
                </button>
                <button
                  onClick={() => handle(true)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${cfg.btnCls}`}
                >
                  {options.confirmLabel ?? cfg.defaultConfirm}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
