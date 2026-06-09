'use client';

export type BusSeat = { id: string; seatNumber: string; status: string };

const ACCENT: Record<string, { sel: string; hover: string; dot: string }> = {
  VIP:      { sel: 'bg-amber-500 border-amber-500 text-white scale-105 shadow-sm', hover: 'hover:border-amber-400 hover:bg-amber-50',  dot: 'bg-amber-500' },
  EXPRESS:  { sel: 'bg-blue-500  border-blue-500  text-white scale-105 shadow-sm', hover: 'hover:border-blue-400  hover:bg-blue-50',   dot: 'bg-blue-500' },
  STANDARD: { sel: 'bg-brand-500 border-brand-500 text-white scale-105 shadow-sm', hover: 'hover:border-brand-400 hover:bg-brand-50',  dot: 'bg-brand-500' },
};

function SeatBtn({ seat, selected, onToggle, accent }: {
  seat: BusSeat; selected: boolean; onToggle: (s: string) => void;
  accent: typeof ACCENT[string];
}) {
  const avail = seat.status === 'AVAILABLE';
  return (
    <button
      disabled={!avail}
      onClick={() => avail && onToggle(seat.seatNumber)}
      title={`Siège ${seat.seatNumber}${!avail ? ' — occupé' : ''}`}
      className={`w-8 h-9 rounded-t-lg rounded-b-sm text-[10px] font-bold border-2 transition-all flex items-center justify-center
        ${!avail
          ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
          : selected
          ? accent.sel
          : `bg-white border-gray-300 text-gray-600 ${accent.hover} hover:shadow-sm`
        }`}
    >
      {seat.seatNumber}
    </button>
  );
}

export function BusSeatMap({
  seats, selectedSeats, onToggle, tripClass,
}: {
  seats: BusSeat[]; selectedSeats: string[]; onToggle: (s: string) => void; tripClass: string;
}) {
  const accent = ACCENT[tripClass] ?? ACCENT.STANDARD;

  const sorted = [...seats].sort((a, b) => {
    const na = parseInt(a.seatNumber, 10), nb = parseInt(b.seatNumber, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.seatNumber.localeCompare(b.seatNumber);
  });

  const hasBackBench = sorted.length >= 5 && sorted.length % 4 === 1;
  const backBench = hasBackBench ? sorted.slice(-5) : [];
  const mainSeats = hasBackBench ? sorted.slice(0, -5) : sorted;
  const rows: BusSeat[][] = [];
  for (let i = 0; i < mainSeats.length; i += 4) rows.push(mainSeats.slice(i, i + 4));

  const availCount  = seats.filter((s) => s.status === 'AVAILABLE').length;
  const occupCount  = seats.length - availCount;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Bus shell */}
      <div
        className="relative bg-gray-50 border-2 border-gray-300 rounded-[20px] p-4 overflow-hidden"
        style={{ minWidth: 236 }}
      >
        {/* Side strips */}
        <div className="absolute left-0 top-12 bottom-12 w-2 bg-gray-200 rounded-r-sm" />
        <div className="absolute right-0 top-12 bottom-12 w-2 bg-gray-200 rounded-l-sm" />

        {/* Front */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b-2 border-dashed border-gray-300">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-5 h-4 border-2 border-gray-400 rounded-sm bg-white flex items-end justify-center pb-0.5">
              <div className="w-px h-2 bg-gray-400" />
            </div>
            <span className="text-[8px] text-gray-400 font-medium">Porte</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">Avant</span>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            </div>
            <span className="text-[8px] text-gray-400 font-medium">Chauf.</span>
          </div>
        </div>

        {/* Seat rows */}
        <div className="space-y-1.5 px-1">
          {rows.map((row, rIdx) => {
            const left = row.slice(0, 2), right = row.slice(2, 4);
            return (
              <div key={rIdx} className="flex items-center">
                <span className="text-[8px] text-gray-300 w-4 text-right mr-1 shrink-0">{rIdx + 1}</span>
                <div className="flex gap-1">
                  {left.map((s) => <SeatBtn key={s.id} seat={s} selected={selectedSeats.includes(s.seatNumber)} onToggle={onToggle} accent={accent} />)}
                  {left.length < 2 && <div className="w-8" />}
                </div>
                <div className="flex-1 flex items-center justify-center min-w-[20px]">
                  <div className="h-px w-full border-t border-dashed border-gray-200" />
                </div>
                <div className="flex gap-1">
                  {right.length === 0 && <><div className="w-8" /><div className="w-8" /></>}
                  {right.length === 1 && <div className="w-8" />}
                  {right.map((s) => <SeatBtn key={s.id} seat={s} selected={selectedSeats.includes(s.seatNumber)} onToggle={onToggle} accent={accent} />)}
                </div>
                <div className="w-4 ml-1 shrink-0" />
              </div>
            );
          })}

          {backBench.length > 0 && (
            <div className="mt-1 pt-1.5 border-t border-dashed border-gray-300">
              <div className="flex items-center justify-center gap-1">
                {backBench.map((s) => <SeatBtn key={s.id} seat={s} selected={selectedSeats.includes(s.seatNumber)} onToggle={onToggle} accent={accent} />)}
              </div>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-300 text-center">
          <span className="text-[8px] font-bold text-gray-400 tracking-widest uppercase">Arrière</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded border-2 border-gray-300 bg-white inline-block" />
          Libre ({availCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded inline-block ${accent.dot}`} />
          Sélectionné ({selectedSeats.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-gray-200 inline-block" />
          Occupé ({occupCount})
        </span>
      </div>
    </div>
  );
}
