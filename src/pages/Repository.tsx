import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Bookmark,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  FolderKanban,
  Check,
  Loader2,
} from 'lucide-react';
import { PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import ConfirmationDialog from '../components/ConfirmationDialog';
import RepositoryItemModal from '../components/RepositoryItemModal';
import ViewItemModal from '../components/ViewItemModal';
import DateRangePicker from '../components/DateRangePicker';
import { useToast } from '../components/Toast';
import { supabase, asArray } from '../lib/client';
import { navigate } from '../lib/router';
import { effectiveStatus, formatDate, dueDateClass, truncate, todayISO } from '../lib/utils';
import type { FollowUp, Meeting } from '../lib/types';

const ITEMS_PER_PAGE = 5;

interface AdvancedFilters {
  type: string;
  status: string;
  criticality: string;
  meetingId: string;
  assignedTo: string;
  dueFrom: string | null;
  dueTo: string | null;
}

interface Preset {
  id: string;
  name: string;
  filters: AdvancedFilters;
}

const EMPTY_FILTERS: AdvancedFilters = {
  type: '',
  status: '',
  criticality: '',
  meetingId: '',
  assignedTo: '',
  dueFrom: null,
  dueTo: null,
};

export default function Repository({ params }: { params: URLSearchParams }) {
  const { toast } = useToast();
  const [items, setItems] = useState<FollowUp[] | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [viewItem, setViewItem] = useState<FollowUp | null>(null);
  const [editItem, setEditItem] = useState<FollowUp | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FollowUp | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const urlType = params.get('type') ?? '';
  const urlStatus = params.get('status') ?? '';
  const urlStatusNot = params.get('statusNot') ?? '';
  const hasUrlFilters = Boolean(urlType || urlStatus || urlStatusNot);

  const load = useCallback(async () => {
    const [itemsRes, meetingsRes] = await Promise.all([
      supabase.from<FollowUp>('follow_ups').select(),
      supabase.from<Meeting>('meetings').select(),
    ]);
    setItems(asArray(itemsRes.data));
    setMeetings(asArray(meetingsRes.data));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, filters, urlType, urlStatus, urlStatusNot]);

  const meetingTitle = useMemo(() => {
    const map = new Map(meetings.map((m) => [m.id, m.title]));
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [meetings]);

  const people = useMemo(() => {
    const set = new Set<string>();
    for (const item of items ?? []) if (item.assigned_to) set.add(item.assigned_to);
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const query = search.trim().toLowerCase();
    let result = items.filter((item) => {
      const eff = effectiveStatus(item);
      if (urlType && item.type !== urlType) return false;
      if (urlStatus && eff !== urlStatus) return false;
      if (urlStatusNot === 'completed' && eff === 'completed') return false;
      if (urlStatusNot && urlStatusNot !== 'completed' && item.status === urlStatusNot) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.status === 'overdue' && eff !== 'overdue') return false;
      if (filters.status && filters.status !== 'overdue' && (item.status !== filters.status || eff === 'overdue')) return false;
      if (filters.criticality && item.criticality !== filters.criticality) return false;
      if (filters.meetingId && item.meeting_id !== filters.meetingId) return false;
      if (filters.assignedTo && item.assigned_to !== filters.assignedTo) return false;
      if (filters.dueFrom && (!item.follow_up_date || item.follow_up_date < filters.dueFrom)) return false;
      if (filters.dueTo && (!item.follow_up_date || item.follow_up_date > filters.dueTo)) return false;
      if (query) {
        const haystack = `${item.item_title} ${item.notes} ${item.assigned_to}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      const av = a.follow_up_date ?? null;
      const bv = b.follow_up_date ?? null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [items, search, filters, urlType, urlStatus, urlStatusNot, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleComplete = async (item: FollowUp) => {
    setTogglingId(item.id);
    const completing = item.status !== 'completed';
    await supabase
      .from<FollowUp>('follow_ups')
      .update({
        status: completing ? 'completed' : 'to_do',
        completed_on: completing ? todayISO() : null,
      })
      .eq('id', item.id);
    setTogglingId(null);
    toast(completing ? 'Item marked complete.' : 'Item reopened.');
    void load();
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    await supabase.from<FollowUp>('follow_ups').delete().eq('id', deleteItem.id);
    setDeleteItem(null);
    toast('Item deleted.');
    void load();
  };

  const applyPreset = (preset: Preset) => {
    setFilters(preset.filters);
    setFiltersOpen(true);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    setPresets((prev) => [...prev, { id: String(Date.now()), name, filters: { ...filters } }]);
    setPresetName('');
  };

  const clearAllFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  const badgeList: string[] = [];
  if (urlType) badgeList.push(`Type: ${urlType}`);
  if (urlStatus) badgeList.push(`Status: ${urlStatus}`);
  if (urlStatusNot) badgeList.push(`Excluding: ${urlStatusNot}`);

  if (!items) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Follow-up Repository"
        subtitle="Track all actions, follow-ups and RAID items in one place."
        actions={
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} />
            New Follow-up
          </button>
        }
      />

      {hasUrlFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          {badgeList.map((b) => (
            <Badge key={b} className="bg-brand-50 text-brand-700">
              Filtered by: {b}
            </Badge>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
          <input
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, notes or assignee…"
          />
        </div>
        <button className="btn-secondary" onClick={() => setFiltersOpen((o) => !o)}>
          <SlidersHorizontal size={16} />
          Filters
        </button>
        <button className="btn-ghost" onClick={clearAllFilters}>
          <RotateCcw size={16} />
          Clear
        </button>
      </div>

      {presets.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button key={p.id} className="badge border border-brand-200 bg-brand-50 px-3 py-1 text-brand-700 hover:bg-brand-100" onClick={() => applyPreset(p)}>
              <Bookmark size={12} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {filtersOpen && (
        <div className="card mb-4 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-700">Advanced Filters</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <label className="label">Type</label>
              <select className="input" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                <option value="">All</option>
                <option value="Action">Action</option>
                <option value="Follow-up">Follow-up</option>
                <option value="RAID">RAID</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="">All</option>
                <option value="to_do">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="label">Criticality</label>
              <select className="input" value={filters.criticality} onChange={(e) => setFilters((f) => ({ ...f, criticality: e.target.value }))}>
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Source Meeting</label>
              <select className="input" value={filters.meetingId} onChange={(e) => setFilters((f) => ({ ...f, meetingId: e.target.value }))}>
                <option value="">All Meetings</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {truncate(m.title, 25)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Assigned To</label>
              <select className="input" value={filters.assignedTo} onChange={(e) => setFilters((f) => ({ ...f, assignedTo: e.target.value }))}>
                <option value="">All People</option>
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Due Date Range</label>
              <DateRangePicker
                start={filters.dueFrom}
                end={filters.dueTo}
                onChange={(dueFrom, dueTo) => setFilters((f) => ({ ...f, dueFrom, dueTo }))}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button className="btn-secondary" onClick={clearAllFilters}>
              Reset All Filters
            </button>
            <div className="flex items-center gap-2">
              <input
                className="input w-52"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name…"
              />
              <button className="btn-secondary" onClick={savePreset} disabled={!presetName.trim()}>
                <Bookmark size={16} />
                Save as Preset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FolderKanban size={24} />}
              title="No items found"
              message="Get started by adding your first follow-up item."
              action={
                <button className="btn-primary" onClick={() => setAddOpen(true)}>
                  <Plus size={16} />
                  New Follow-up
                </button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FolderKanban size={24} />}
              title="No items found"
              message="No items match your current filters. Try adjusting filters or add a new item."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="th w-10">Done</th>
                  <th className="th">Item</th>
                  <th className="th">Type</th>
                  <th className="th">Source Meeting</th>
                  <th className="th">
                    <button
                      className="flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800"
                      onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    >
                      Due Date {sortDir === 'asc' ? '↑' : '↓'}
                    </button>
                  </th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const completed = item.status === 'completed';
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-50 transition hover:bg-slate-50 ${completed ? 'opacity-50' : ''}`}
                    >
                      <td className="td">
                        <button
                          onClick={() => toggleComplete(item)}
                          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                            completed ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 hover:border-brand-400'
                          }`}
                          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {togglingId === item.id ? (
                            <Loader2 size={12} className="animate-spin text-white" />
                          ) : completed ? (
                            <Check size={13} />
                          ) : null}
                        </button>
                      </td>
                      <td className="td max-w-[280px]">
                        <p className={`truncate font-medium text-slate-900 ${completed ? 'line-through' : ''}`} title={item.item_title}>
                          {truncate(item.item_title, 40)}
                        </p>
                      </td>
                      <td className="td">
                        <Badge
                          className={
                            item.type === 'Action'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.type === 'RAID'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-blue-50 text-blue-700'
                          }
                        >
                          {item.type}
                        </Badge>
                      </td>
                      <td className="td max-w-[200px]">
                        <p className="truncate text-xs text-slate-500" title={meetingTitle(item.meeting_id) ?? ''}>
                          {truncate(meetingTitle(item.meeting_id) ?? '—', 25)}
                        </p>
                      </td>
                      <td className="td whitespace-nowrap">
                        <span className={dueDateClass(item)}>{formatDate(item.follow_up_date)}</span>
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-0.5">
                          <button className="btn-icon" onClick={() => setViewItem(item)} aria-label="View item" title="View">
                            <Eye size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => setEditItem(item)} aria-label="Edit item" title="Edit">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-icon text-red-500 hover:bg-red-50" onClick={() => setDeleteItem(item)} aria-label="Delete item" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
            </p>
            <div className="flex items-center gap-1">
              <button className="btn-icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
                    n === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button className="btn-icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ViewItemModal open={viewItem !== null} onClose={() => setViewItem(null)} item={viewItem} meetingTitle={meetingTitle(viewItem?.meeting_id ?? null)} />

      {editItem && (
        <RepositoryItemModal
          open={editItem !== null}
          onClose={() => setEditItem(null)}
          meetings={meetings}
          initial={editItem}
          onSaved={() => void load()}
        />
      )}

      <RepositoryItemModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        meetings={meetings}
        initial={null}
        onSaved={() => void load()}
      />

      <ConfirmationDialog
        open={deleteItem !== null}
        title="Delete Item?"
        message={`Are you sure you want to delete '${deleteItem?.item_title ?? ''}'? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}