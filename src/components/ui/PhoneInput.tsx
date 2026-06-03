'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

// ── Pays ──────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'CI', flag: '🇨🇮', dialCode: '+225', name: "Côte d'Ivoire" },
  { code: 'SN', flag: '🇸🇳', dialCode: '+221', name: 'Sénégal' },
  { code: 'ML', flag: '🇲🇱', dialCode: '+223', name: 'Mali' },
  { code: 'BF', flag: '🇧🇫', dialCode: '+226', name: 'Burkina Faso' },
  { code: 'GN', flag: '🇬🇳', dialCode: '+224', name: 'Guinée' },
  { code: 'TG', flag: '🇹🇬', dialCode: '+228', name: 'Togo' },
  { code: 'BJ', flag: '🇧🇯', dialCode: '+229', name: 'Bénin' },
  { code: 'CM', flag: '🇨🇲', dialCode: '+237', name: 'Cameroun' },
  { code: 'NG', flag: '🇳🇬', dialCode: '+234', name: 'Nigeria' },
  { code: 'GH', flag: '🇬🇭', dialCode: '+233', name: 'Ghana' },
  { code: 'NE', flag: '🇳🇪', dialCode: '+227', name: 'Niger' },
  { code: 'FR', flag: '🇫🇷', dialCode: '+33',  name: 'France' },
] as const;

type Country = (typeof COUNTRIES)[number];

function parsePhone(full: string): { country: Country; local: string } {
  const country = COUNTRIES.find((c) => full.startsWith(c.dialCode));
  if (country) return { country, local: full.slice(country.dialCode.length) };
  return { country: COUNTRIES[0], local: full.startsWith('+') ? full.slice(1) : full };
}

// ── Composant ─────────────────────────────────────────────────────────────────

type Props = {
  value: string;
  onChange: (full: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
};

export function PhoneInput({
  value,
  onChange,
  placeholder = '07 XX XX XX XX',
  className = '',
  disabled = false,
  required = false,
  id,
}: Props) {
  const { country: initCountry, local: initLocal } = parsePhone(value ?? '');
  const [country, setCountry] = useState<Country>(initCountry);
  const [local, setLocal]     = useState(initLocal);
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState('');
  const dropdownRef           = useRef<HTMLDivElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);

  // Sync value → local state when parent resets (ex: reset form)
  useEffect(() => {
    if (value === '' || value == null) {
      setLocal('');
      setCountry(COUNTRIES[0]);
    }
  }, [value]);

  // Ferme le dropdown au clic en dehors
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus la recherche à l'ouverture
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setQ('');
  }, [open]);

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^\d\s]/g, '');
    setLocal(digits);
    const clean = digits.replace(/\s/g, '');
    onChange(clean ? `${country.dialCode}${clean}` : '');
  }

  function handleCountrySelect(c: Country) {
    setCountry(c);
    setOpen(false);
    const clean = local.replace(/\s/g, '');
    onChange(clean ? `${c.dialCode}${clean}` : '');
  }

  const filtered = q
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) || c.dialCode.includes(q))
    : COUNTRIES;

  const inputCls =
    'flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400';

  return (
    <div className={`relative flex items-center border border-gray-200 rounded-lg overflow-visible focus-within:ring-2 focus-within:ring-brand-500 ${className}`}>
      {/* ── Sélecteur pays ── */}
      <div ref={dropdownRef} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          className="flex items-center gap-1 px-3 py-2.5 border-r border-gray-200 hover:bg-gray-50 transition disabled:opacity-50 h-full"
        >
          <span className="text-lg leading-none">{country.flag}</span>
          <span className="text-xs font-semibold text-gray-600 tabular-nums">{country.dialCode}</span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher…"
                  className="text-xs bg-transparent outline-none flex-1 placeholder-gray-400"
                />
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition ${
                      c.code === country.code ? 'bg-orange-50 text-brand-600 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 text-left truncate">{c.name}</span>
                    <span className="text-xs tabular-nums text-gray-400">{c.dialCode}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-xs text-center text-gray-400">Aucun résultat</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* ── Saisie numéro ── */}
      <input
        id={id}
        type="tel"
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`${inputCls} px-3 py-2.5`}
      />
    </div>
  );
}
