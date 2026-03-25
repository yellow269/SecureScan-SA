'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/token';

type Stats = { totalScans: number; avgScore: number | null; scans30dCount: number };

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const me = await apiFetch<{ role: string }>('/api/auth/me');
        setRole(me.role);
        const s = await apiFetch<Stats>('/api/admin/stats');
        setStats(s);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Failed to load admin');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-2xl text-slate-300">Login required.</div>
      </main>
    );
  }

  if (role !== 'ADMIN') {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800/60 bg-slate-900/20 p-6 text-slate-200">
          Admin access only.
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-900/50 bg-red-950/20 p-6 text-red-200">{error}</div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-2xl text-slate-300">Loading admin stats…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="mt-1 text-slate-300">Subscriptions and scan statistics.</p>

        <div className="mt-8 glass rounded-2xl p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-4">
              <div className="text-sm text-slate-400">Total scans</div>
              <div className="mt-1 text-2xl font-bold">{stats.totalScans}</div>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-4">
              <div className="text-sm text-slate-400">Avg score</div>
              <div className="mt-1 text-2xl font-bold">{stats.avgScore ?? 'N/A'}</div>
            </div>
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-4">
              <div className="text-sm text-slate-400">Scans last 30d</div>
              <div className="mt-1 text-2xl font-bold">{stats.scans30dCount}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

