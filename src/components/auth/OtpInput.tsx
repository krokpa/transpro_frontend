'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

export function OtpInput({ length = 6, onComplete, error, disabled }: Props) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [shake, setShake] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Shake quand une erreur apparaît
  useEffect(() => {
    if (error) {
      setShake(true);
      setValues(Array(length).fill(''));
      inputs.current[0]?.focus();
      const t = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(t);
    }
  }, [error, length]);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const digit = raw.replace(/\D/g, '').slice(-1);
      const next = [...values];
      next[index] = digit;
      setValues(next);

      if (digit && index < length - 1) {
        inputs.current[index + 1]?.focus();
      }

      if (next.every(Boolean)) {
        onComplete(next.join(''));
      }
    },
    [values, length, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        if (values[index]) {
          const next = [...values];
          next[index] = '';
          setValues(next);
        } else if (index > 0) {
          inputs.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputs.current[index + 1]?.focus();
      }
    },
    [values, length],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!digits) return;
      const next = Array(length).fill('');
      digits.split('').forEach((d, i) => { next[i] = d; });
      setValues(next);
      const focusIdx = Math.min(digits.length, length - 1);
      inputs.current[focusIdx]?.focus();
      if (digits.length === length) onComplete(digits);
    },
    [length, onComplete],
  );

  return (
    <div className="space-y-3">
      <motion.div
        className="flex gap-2 justify-center"
        animate={shake ? { x: [-6, 6, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {values.map((val, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`
              w-11 h-13 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
              ${val ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
              ${error ? 'border-red-400 bg-red-50' : ''}
              focus:border-brand-500 focus:ring-2 focus:ring-brand-100
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            style={{ height: '3.25rem' }}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-red-500 text-sm text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
