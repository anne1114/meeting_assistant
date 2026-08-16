import { Menu, Sparkles } from 'lucide-react';
import { breadcrumbFor, type Route } from '../lib/router';

interface TopBarProps {
  route: Route;
  onMenuOpen: () => void;
}

export default function TopBar({ route, onMenuOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button className="btn-ghost p-1.5 md:hidden" onClick={onMenuOpen} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <p className="text-sm font-medium text-slate-500">{breadcrumbFor(route)}</p>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 md:flex">
        <Sparkles size={14} />
        AI Engine Active
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white md:hidden">M</div>
    </header>
  );
}