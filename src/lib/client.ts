import { db, save, type DB } from './db';
import { createClient } from '@supabase/supabase-js';

export type TableName = keyof DB;

const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
export const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = viteEnv.VITE_SUPABASE_ANON_KEY;

export const useRemoteDb = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export interface QueryError {
  message: string;
}

export interface QueryResult<T> {
  data: T | T[] | null;
  error: QueryError | null;
}

export function asArray<T>(data: T | T[] | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export function asSingle<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

class QueryBuilder<T> {
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private singleMode: 'maybe' | 'single' | null = null;
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private insertRows: Row[] = [];
  private updatePatch: Row = {};
  private upsertConflict: string | null = null;

  constructor(private table: TableName) {}

  select(_cols = '*'): this {
    return this;
  }

  eq(col: string, value: unknown): this {
    this.filters.push((r) => r[col] === value);
    return this;
  }

  neq(col: string, value: unknown): this {
    this.filters.push((r) => r[col] !== value);
    return this;
  }

  gt(col: string, value: unknown): this {
    this.filters.push((r) => (r[col] as never) > (value as never));
    return this;
  }

  gte(col: string, value: unknown): this {
    this.filters.push((r) => (r[col] as never) >= (value as never));
    return this;
  }

  lt(col: string, value: unknown): this {
    this.filters.push((r) => (r[col] as never) < (value as never));
    return this;
  }

  lte(col: string, value: unknown): this {
    this.filters.push((r) => (r[col] as never) <= (value as never));
    return this;
  }

  in_(col: string, values: unknown[]): this {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  maybeSingle(): this {
    this.singleMode = 'maybe';
    return this;
  }

  single(): this {
    this.singleMode = 'single';
    return this;
  }

  insert(rows: Partial<T> | Partial<T>[]): this {
    if (this.op === 'select') {
      this.op = 'insert';
      this.insertRows = (Array.isArray(rows) ? rows : [rows]) as Row[];
    }
    return this;
  }

  update(patch: Partial<T>): this {
    if (this.op === 'select') {
      this.op = 'update';
      this.updatePatch = patch as Row;
    }
    return this;
  }

  delete(): this {
    if (this.op === 'select') this.op = 'delete';
    return this;
  }

  upsert(rows: Partial<T> | Partial<T>[], opts?: { onConflict?: string }): this {
    if (this.op === 'select') {
      this.op = 'upsert';
      this.insertRows = (Array.isArray(rows) ? rows : [rows]) as Row[];
      this.upsertConflict = opts?.onConflict ?? null;
    }
    return this;
  }

  then<R1 = QueryResult<T>, R2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute(): Promise<QueryResult<T>> {
    return Promise.resolve().then(() => {
      try {
        switch (this.op) {
          case 'select':
            return this.runSelect();
          case 'insert':
            return this.runInsert();
          case 'update':
            return this.runUpdate();
          case 'delete':
            return this.runDelete();
          case 'upsert':
            return this.runUpsert();
        }
      } catch (e) {
        return { data: null, error: { message: String(e) } };
      }
    });
  }

  private matches(row: Row): boolean {
    return this.filters.every((f) => f(row));
  }

  private tableRows(): Row[] {
    return (db[this.table] as unknown as Row[]) ?? [];
  }

  private runSelect(): QueryResult<T> {
    let rows = this.tableRows().filter((r) => this.matches(r));
    if (this.orderCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[this.orderCol as string];
        const bv = b[this.orderCol as string];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = compareValues(av, bv);
        return this.orderAsc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (this.singleMode === 'maybe' || this.singleMode === 'single') {
      if (!rows[0] && this.singleMode === 'single') {
        return { data: null, error: { message: 'No rows found' } };
      }
      return { data: (rows[0] as T) ?? null, error: null };
    }
    return { data: rows as T[], error: null };
  }

  private runInsert(): QueryResult<T> {
    const inserted = this.insertRows.map((r) => {
      const row: Row = { ...r };
      if (!row.id) row.id = makeId();
      if (!row.created_at) row.created_at = new Date().toISOString();
      (db[this.table] as unknown as Row[]).push(row);
      return row;
    });
    save();
    if (this.singleMode) return { data: (inserted[0] as T) ?? null, error: null };
    return { data: inserted as T[], error: null };
  }

  private runUpdate(): QueryResult<T> {
    const rows = this.tableRows();
    for (const r of rows) {
      if (this.matches(r)) Object.assign(r, this.updatePatch);
    }
    save();
    return { data: null, error: null };
  }

  private runDelete(): QueryResult<T> {
    const rows = this.tableRows();
    const kept = rows.filter((r) => !this.matches(r));
    (db[this.table] as unknown as Row[]).length = 0;
    for (const r of kept) (db[this.table] as unknown as Row[]).push(r);
    save();
    return { data: null, error: null };
  }

  private runUpsert(): QueryResult<T> {
    const inserted: Row[] = [];
    for (const row of this.insertRows) {
      const existingIdx = this.upsertConflict
        ? this.tableRows().findIndex((r) => r[this.upsertConflict as string] === row[this.upsertConflict as string])
        : -1;
      const full: Row = { ...row };
      if (!full.id) full.id = makeId();
      if (!full.created_at) full.created_at = new Date().toISOString();
      if (existingIdx >= 0) {
        this.tableRows()[existingIdx] = full;
      } else {
        this.tableRows().push(full);
      }
      inserted.push(full);
    }
    save();
    if (this.singleMode) return { data: (inserted[0] as T) ?? null, error: null };
    return { data: inserted as T[], error: null };
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const localSupabase = {
  from<T>(table: TableName): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  },
};

export const supabase: typeof localSupabase = useRemoteDb
  ? (createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    }) as unknown as typeof localSupabase)
  : localSupabase;

export { save as persistDB };