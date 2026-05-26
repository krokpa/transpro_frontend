'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '@/lib/api';
import { X, RefreshCw, Save, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

type CellType = 'STANDARD' | 'VIP' | 'EXPRESS' | 'EMPTY';

interface GridCell {
  row: number;
  col: number;
  type: CellType;
  number: string;
}

export interface SeatLayoutEditorProps {
  vehicleId: string;
  vehicleInfo: { plate: string; brand: string; model: string };
  initialLayout: { rows: number; columns: number; seats: any[] };
  onClose: () => void;
  onSaved: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const TOOL_CONFIG: { type: CellType; label: string; inactiveCls: string; activeCls: string }[] = [
  {
    type: 'STANDARD',
    label: 'Standard',
    inactiveCls: 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-400',
    activeCls: 'bg-gray-600 text-white border-gray-600',
  },
  {
    type: 'VIP',
    label: 'VIP',
    inactiveCls: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400',
    activeCls: 'bg-amber-500 text-white border-amber-500',
  },
  {
    type: 'EXPRESS',
    label: 'Express',
    inactiveCls: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400',
    activeCls: 'bg-blue-500 text-white border-blue-500',
  },
  {
    type: 'EMPTY',
    label: 'Espace vide',
    inactiveCls: 'bg-white text-gray-400 border-dashed border-gray-300 hover:border-gray-400',
    activeCls: 'bg-gray-200 text-gray-700 border-gray-400',
  },
];

// ── Grid helpers ──────────────────────────────────────────────────────────────

function buildGridFromLayout(rows: number, cols: number, seats: any[]): GridCell[][] {
  const grid: GridCell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r + 1,
      col: c + 1,
      type: 'EMPTY' as CellType,
      number: '',
    })),
  );

  for (const seat of seats) {
    const r = seat.row - 1;
    const c = seat.column - 1;
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      grid[r][c] = {
        row: seat.row,
        col: seat.column,
        type: seat.isAisle ? 'EMPTY' : ((seat.class as CellType) ?? 'STANDARD'),
        number: seat.number ?? '',
      };
    }
  }

  return grid;
}

function generateFreshGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r + 1,
      col: c + 1,
      type: 'STANDARD' as CellType,
      number: `${r + 1}${COL_LETTERS[c] ?? String(c + 1)}`,
    })),
  );
}

function gridToSeatLayout(grid: GridCell[]): { rows: number; columns: number; seats: any[] } {
  const allCells = grid;
  const maxRow = Math.max(...allCells.map((c) => c.row), 0);
  const maxCol = Math.max(...allCells.map((c) => c.col), 0);

  const seats = allCells
    .filter((c) => c.type !== 'EMPTY')
    .map((c) => ({
      number: c.number,
      row: c.row,
      column: c.col,
      isAisle: false,
      class: c.type,
    }));

  return { rows: maxRow, columns: maxCol, seats };
}

// ── Cell component ────────────────────────────────────────────────────────────

function SeatCell({
  cell,
  onMouseDown,
  onMouseEnter,
}: {
  cell: GridCell;
  onMouseDown: () => void;
  onMouseEnter: () => void;
}) {
  const isEmpty = cell.type === 'EMPTY';
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      onMouseEnter={onMouseEnter}
      className={`w-10 h-10 rounded-lg border text-[9px] font-bold transition-all select-none leading-none flex items-center justify-center ${
        isEmpty
          ? 'bg-transparent border-dashed border-gray-200 text-gray-300 hover:border-gray-300'
          : cell.type === 'VIP'
          ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
          : cell.type === 'EXPRESS'
          ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
      }`}
      title={isEmpty ? 'Espace vide' : `${cell.number} · ${cell.type}`}
    >
      {isEmpty ? '·' : cell.number}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SeatLayoutEditor({
  vehicleId,
  vehicleInfo,
  initialLayout,
  onClose,
  onSaved,
}: SeatLayoutEditorProps) {
  const qc = useQueryClient();

  const [grid, setGrid] = useState<GridCell[][]>(() =>
    buildGridFromLayout(initialLayout.rows, initialLayout.columns, initialLayout.seats),
  );
  const [activeTool, setActiveTool] = useState<CellType>('STANDARD');
  const [isDragging, setIsDragging] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [regenRows, setRegenRows] = useState(String(initialLayout.rows || 10));
  const [regenCols, setRegenCols] = useState(String(initialLayout.columns || 4));

  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const flatCells = grid.flat();
  const seatCount = flatCells.filter((c) => c.type !== 'EMPTY').length;
  const vipCount = flatCells.filter((c) => c.type === 'VIP').length;
  const expressCount = flatCells.filter((c) => c.type === 'EXPRESS').length;

  useEffect(() => {
    const stop = () => setIsDragging(false);
    window.addEventListener('mouseup', stop);
    return () => window.removeEventListener('mouseup', stop);
  }, []);

  const applyTool = useCallback(
    (row: number, col: number) => {
      setGrid((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        const cell = next[row - 1][col - 1];
        const willBeEmpty = activeTool === 'EMPTY';
        const wasEmpty = cell.type === 'EMPTY';
        next[row - 1][col - 1] = {
          ...cell,
          type: activeTool,
          // Preserve number when switching classes; assign when restoring an empty cell
          number: willBeEmpty
            ? ''
            : wasEmpty
            ? `${row}${COL_LETTERS[col - 1] ?? String(col)}`
            : cell.number,
        };
        return next;
      });
    },
    [activeTool],
  );

  function regenerate() {
    const r = Math.max(1, Math.min(20, parseInt(regenRows) || 10));
    const c = Math.max(1, Math.min(8, parseInt(regenCols) || 4));
    setGrid(generateFreshGrid(r, c));
    setShowRegen(false);
    toast.success(`Grille regénérée : ${r} rangées × ${c} colonnes`);
  }

  const updateMutation = useMutation({
    mutationFn: ({ layout, capacity }: { layout: any; capacity: number }) =>
      vehiclesApi.update(vehicleId, { seatLayout: layout, capacity }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Plan des sièges sauvegardé');
      onSaved();
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  function handleSave() {
    if (seatCount === 0) {
      toast.error('Ajoutez au moins un siège avant de sauvegarder.');
      return;
    }
    const layout = gridToSeatLayout(flatCells);
    updateMutation.mutate({ layout, capacity: seatCount });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseUp={() => setIsDragging(false)}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Éditeur de plan des sièges</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {vehicleInfo.brand} {vehicleInfo.model} ·{' '}
              <span className="font-mono">{vehicleInfo.plate}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Tool palette */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500">Pinceau :</span>
              {TOOL_CONFIG.map(({ type, label, inactiveCls, activeCls }) => (
                <button
                  key={type}
                  onClick={() => setActiveTool(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    activeTool === type ? activeCls : inactiveCls
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRegen(!showRegen)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition"
            >
              <RefreshCw size={11} /> Regénérer
            </button>
          </div>

          {/* Regen form */}
          {showRegen && (
            <div className="flex items-end gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rangées (max 20)</label>
                <input
                  type="number" min="1" max="20"
                  value={regenRows}
                  onChange={(e) => setRegenRows(e.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Colonnes (max 8)</label>
                <input
                  type="number" min="1" max="8"
                  value={regenCols}
                  onChange={(e) => setRegenCols(e.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={regenerate}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Générer
              </button>
              <p className="text-xs text-orange-600 pb-0.5">⚠ Efface la disposition actuelle</p>
            </div>
          )}

          {/* Front-of-bus indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="flex items-center gap-1 shrink-0">
              <ChevronRight size={11} />Avant du bus
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {/* Grid */}
          <div
            className="overflow-x-auto cursor-crosshair"
            onMouseLeave={() => setIsDragging(false)}
          >
            <div className="w-fit mx-auto space-y-1.5 select-none">
              {/* Column headers */}
              <div className="flex gap-1.5 ml-8">
                {Array.from({ length: cols }, (_, c) => (
                  <div key={c} className="w-10 text-center text-xs text-gray-400 font-semibold">
                    {COL_LETTERS[c] ?? String(c + 1)}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {grid.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-1.5">
                  <div className="w-6 text-right text-xs text-gray-400 font-semibold shrink-0">
                    {rowIdx + 1}
                  </div>
                  {row.map((cell) => (
                    <SeatCell
                      key={`${cell.row}-${cell.col}`}
                      cell={cell}
                      onMouseDown={() => {
                        setIsDragging(true);
                        applyTool(cell.row, cell.col);
                      }}
                      onMouseEnter={() => {
                        if (isDragging) applyTool(cell.row, cell.col);
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend + stats */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-gray-100 border border-gray-200 inline-block" />
                Standard
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-100 border border-amber-300 inline-block" />
                VIP
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-100 border border-blue-300 inline-block" />
                Express
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded border-dashed border border-gray-300 inline-block" />
                Espace vide
              </span>
            </div>
            <div className="text-xs text-gray-600 text-right">
              <span className="font-semibold text-gray-900">{seatCount}</span> siège{seatCount !== 1 ? 's' : ''}
              {vipCount > 0 && (
                <> · <span className="text-amber-600 font-medium">{vipCount} VIP</span></>
              )}
              {expressCount > 0 && (
                <> · <span className="text-blue-600 font-medium">{expressCount} Express</span></>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Cliquez ou faites glisser pour peindre les sièges. Utilisez "Espace vide" pour créer un couloir ou supprimer un siège.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
          <p className="text-xs text-gray-400">
            Grille actuelle : {rows} rangées × {cols} colonnes
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || seatCount === 0}
              className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-60"
            >
              {updateMutation.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Sauvegarde...</>
                : <><Save size={14} /> Sauvegarder</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
