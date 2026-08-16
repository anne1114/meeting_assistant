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
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-brand-600' : 'text-slate-400'} />
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
      {render(WORKSPACE_ITEMS)}
      <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Follow-up</p>
      {render(FOLLOWUP_ITEMS)}
    </>
  );
}

export default function Sidebar({ route }: { route: Route }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">M</div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">Meeting Assistant</p>
          <p className="text-xs text-slate-500">AI Project Follow-ups</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks route={route} />
      </nav>
      <div className="m-4 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-brand-100 p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-600" />
          <p className="text-sm font-semibold text-brand-800">AI-Powered</p>
        </div>
        <p className="mt-1 text-xs text-brand-700/80">
          Deterministic keyword engine generates minutes, actions, RAID and status reports.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav({ route, open, onClose }: { route: Route; open: boolean; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">M</div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Meeting Assistant</p>
              <p className="text-xs text-slate-500">AI Project Follow-ups</p>
            </div>
          </div>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks route={route} onNavigate={onClose} />
        </nav>
        <div className="m-4 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-brand-100 p-4">
          <p className="text-sm font-semibold text-brand-800">AI Engine Active</p>
          <p className="mt-1 text-xs text-brand-700/80">Deterministic output generation, running locally.</p>
        </div>
      </div>
    </div>
  );
}