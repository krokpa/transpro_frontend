'use client';

import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'list' | 'grid';

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className = '' }: Props) {
  return (
    <div className={`flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 ${className}`}>
      <button
        onClick={() => onChange('list')}
        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
          value === 'list' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}
        title="Vue liste"
        type="button"
      >
        <List size={15} />
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`flex items-center justify-center w-8 h-7 rounded-md transition-all ${
          value === 'grid' ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
        }`}
        title="Vue grille"
        type="button"
      >
        <LayoutGrid size={15} />
      </button>
    </div>
  );
}
