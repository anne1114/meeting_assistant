import { LayoutDashboard, CalendarDays, FilePlus2, ClipboardList, StickyNote, FolderKanban, Sparkles, X } from 'lucide-react';
import { navigate, type Route } from '../lib/router';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  routeNames: Route['name'][];
}

const WORKSPACE_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, routeNames: ['dashboard'] },
  { label: 'Meetings', path: '/meetings', icon: CalendarDays, routeNames: ['meetings'] },
  { label: 'New Meeting', path: '/meetings/new', icon: FilePlus2, routeNames: ['meetings-new'] },
  { label: 'Review Output', path: '/outputs/review', icon: ClipboardList, routeNames: ['outputs-review'] },
  { label: 'Quick Notes', path: '/quick-notes', icon: StickyNote, routeNames: ['quick-notes'] },
];

const FOLLOWUP_ITEMS: NavItem[] = [
  { label: 'Repository', path: '/repository', icon: FolderKanban, routeNames: ['repository', 'outputs-select'] },
];

function NavLinks({ route, onNavigate }: { route: Route; onNavigate?: () => void }) {
  const isActive = (item: NavItem) => item.routeNames.includes(route.name);
  const render = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <li key={item.label}>
            <button
              onClick={() => {
                navigate(item.path);
                onNavigate?.();
              }}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                active
                  ? 'bg-brand-50/70 text-ink'
                  : 'text-taupe hover:bg-cream-100 hover:text-ink'
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition-all ${
                  active ? 'bg-brand-600' : 'bg-transparent'
                }`}
              />
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  active ? 'text-brand-600' : 'text-taupe group-hover:text-ink'
                }`}
              >
                <Icon size={18} strokeWidth={1.6} />
              </span>
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <p className="mb-2 mt-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-taupe-light">Workspace</p>
      {render(WORKSPACE_ITEMS)}
      <p className="mb-2 mt-8 px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-taupe-light">Follow-up</p>
      {render(FOLLOWUP_ITEMS)}
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-stone-200/70 px-5 py-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
        <span className="font-display text-[17px] font-medium leading-none">M</span>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="font-display text-[16px] font-medium leading-snug text-ink">Meeting Assistant</p>
        <p className="text-[11px] font-medium tracking-wide text-taupe">AI Project Follow-ups</p>
      </div>
    </div>
  );
}

function AIFooter() {
  return (
    <div className="mx-4 mb-4 rounded-2xl border border-stone-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-[1px]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600">
          <Sparkles size={15} strokeWidth={1.6} />
        </span>
        <p className="text-[13px] font-semibold text-ink">AI-Powered</p>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-taupe">
        Deterministic engine generates minutes, actions, RAID and status reports.
      </p>
    </div>
  );
}

export default function Sidebar({ route }: { route: Route }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-stone-200/70 bg-cream-50 md:flex">
      <Brand />
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks route={route} />
      </nav>
      <AIFooter />
    </aside>
  );
}

export function MobileNav({ route, open, onClose }: { route: Route; open: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 left-0 flex w-72 flex-col bg-cream-50 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="relative">
          <Brand />
          <button className="btn-icon absolute right-3 top-5" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks route={route} onNavigate={onClose} />
        </nav>
        <AIFooter />
      </div>
    </div>
  );
}
