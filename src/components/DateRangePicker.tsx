import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDate, toISODate } from '../lib/utils';

interface DateRangePickerProps {
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DateRangePicker({ start, end, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cells: (string | null)[] = [];
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISODate(new Date(month.getFullYear(), month.getMonth(), d)));
  }

  const navMonth = (delta: number) => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const handleDay = (iso: string) => {
    if (!pendingStart) {
      setPendingStart(iso);
      onChange(iso, null);
      return;
    }
    const [first, second] = pendingStart <= iso ? [pendingStart, iso] : [iso, pendingStart];
    onChange(first, second);
    setPendingStart(null);
    setOpen(false);
  };

  const clear = () => {
    onChange(null, null);
    setPendingStart(null);
  };

  const label = start && end ? `${formatDate(start)} - ${formatDate(end)}` : start ? `From ${formatDate(start)}` : 'Any date';

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1">
        <button type="button" className="input flex items-center gap-2 text-left" onClick={() => setOpen((o) => !o)}>
          <CalendarIcon size={16} className="text-slate-400" />
          <span className={start ? '' : 'text-slate-400'}>{label}</span>
        </button>
        {(start || end) && (
          <button type="button" className="btn-icon" onClick={clear} aria-label="Clear date range">
            <X size={16} />
          </button>
        )}
      </div>
      {open && (
        <div className="animate-scale-in absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="btn-icon" onClick={() => navMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-slate-800">
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <button type="button" className="btn-icon" onClick={() => navMonth(1)} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-xs font-semibold text-slate-400">
                {w}
              </span>
            ))}
            {cells.map((iso, i) =>
              iso ? (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDay(iso)}
                  className={`rounded-lg py-1.5 text-sm transition ${
                    start && end && iso >= start && iso <= end
                      ? 'bg-brand-100 text-brand-700'
                      : iso === pendingStart
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Number(iso.slice(8))}
                </button>
              ) : (
                <span key={`blank-${i}`} />
              )
            )}
          </div>
          <p className="mt-3 text-xs text-slate-400">Select a start date, then an end date.</p>
        </div>
      )}
    </div>
  );
}