import { Menu } from 'lucide-react';
import { breadcrumbFor, type Route } from '../lib/router';

interface TopBarProps {
  route: Route;
  onMenuOpen: () => void;
}

export default function TopBar({ route, onMenuOpen }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-stone-200/70 bg-cream-50/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="btn-icon p-1.5 md:hidden" onClick={onMenuOpen} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-taupe">{breadcrumbFor(route)}</p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-full border border-stone-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur-sm lg:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          AI Engine Active
        </div>
      </div>
    </header>
  );
}
