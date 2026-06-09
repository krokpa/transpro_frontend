'use client';

import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SkeletonTable } from './Skeleton';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  keyExtractor: (row: T) => string;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  emptyMessage?: string;
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T>({
  data,
  columns,
  isLoading,
  keyExtractor,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  onSort,
  emptyMessage = 'Aucun résultat',
  actions,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string) => {
    if (!onSort) return;
    const nextDir: SortDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(nextDir);
    onSort(key, nextDir);
  };

  const cols = actions ? [...columns, { key: '__actions', header: '', sortable: false }] : columns;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {cols.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none',
                    col.sortable && onSort && 'cursor-pointer hover:text-gray-800',
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && onSort && (
                      <span className="text-gray-300">
                        {sortKey === col.key && sortDir === 'asc' ? (
                          <ChevronUp size={12} className="text-brand-500" />
                        ) : sortKey === col.key && sortDir === 'desc' ? (
                          <ChevronDown size={12} className="text-brand-500" />
                        ) : (
                          <ChevronsUpDown size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <SkeletonTable rows={5} cols={cols.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-4 py-10 text-center text-gray-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Page {currentPage} sur {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = totalPages <= 5 ? i + 1 : Math.max(1, currentPage - 2) + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={clsx(
                    'w-7 h-7 rounded-lg text-xs font-medium transition',
                    page === currentPage
                      ? 'bg-brand-500 text-white'
                      : 'hover:bg-gray-100 text-gray-600',
                  )}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
