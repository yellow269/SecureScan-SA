'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { clearToken, getToken } from '@/lib/token';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Website = { id: string; domain: string; lastScannedAt: string | null };
type ScanHistoryItem = { id: string; status: string; score: number | null; createdAt: string; website: { domain: string } };
type Alert = { id: string; message: string; createdAt: string; readAt: string | null; scanId: string | null; websiteId: string | null };

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    setToken(t);
  }, []);

  const latestScoreByDomain = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const s of scans) {
      if (!map.has(s.website.domain) && s.score !== null) map.set(s.website.domain, s.score);
    }
    return map;
  }, [scans]);

  async function refresh() {
    const t = getToken();
    if (!t) return;
    const [sitesResp, scansResp, alertsResp] = await Promise.all([
      apiFetch<{ websites: Website[] }>('/api/websites'),
      apiFetch<{ scans: ScanHistoryItem[] }>('/api/scans/history'),
      apiFetch<{ alerts: Alert[] }>('/api/alerts')
    ]);
    setWebsites(sitesResp.websites);
    setScans(scansResp.scans);
    setAlerts(alertsResp.alerts);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (!token) {
          setLoading(false);
          return;
        }
        await refresh();
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function addWebsite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/websites', {
        method: 'POST',
        body: JSON.stringify({ domain })
      });
      setDomain('');
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Failed to add website');
    }
  }

  async function runScan(websiteId: string) {
    setError(null);
    try {
      await apiFetch(`/api/websites/${websiteId}/scan`, { method: 'POST', body: JSON.stringify({}) });
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Failed to enqueue scan');
    }
  }

  async function markAlertRead(alertId: string) {
    try {
      await apiFetch(`/api/alerts/${alertId}/read`, { method: 'PATCH' });
      await refresh();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Failed to update alert');
    }
  }

  function logout() {
    clearToken();
    router.push('/');
  }

  if (!token) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-lg">
          <div className="glass rounded-2xl p-7 shadow-soft">
            <h2 className="text-2xl font-bold">Login required</h2>
            <p className="mt-2 text-slate-300">Sign in to view your website scans.</p>
            <div className="mt-6 flex gap-3">
              <Link className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500" href="/login">
                Login
              </Link>
              <Link className="rounded-xl border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800" href="/payment">
                Plans
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-slate-300">Your monitoring, scores, alerts, and scan history.</p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700"
            type="button"
          >
            Logout
          </button>
        </div>

        {error ? <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-red-200">{error}</div> : null}
        {loading ? <div className="mt-6 text-slate-300">Loading…</div> : null}

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <section className="glass rounded-2xl p-5 md:col-span-2">
            <h2 className="text-lg font-semibold">Websites being monitored</h2>

            <form className="mt-4 flex gap-3" onSubmit={addWebsite}>
              <input
                className="w-full rounded-xl bg-slate-900/60 px-3 py-2 outline-none ring-1 ring-slate-700"
                placeholder="example.co.za"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                required
              />
              <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500" type="submit">
                Add
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {websites.length === 0 ? (
                <div className="mt-3 text-slate-300">No websites yet. Add one above.</div>
              ) : (
                websites.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-slate-900/20 p-4">
                    <div>
                      <div className="font-semibold">{w.domain}</div>
                      <div className="mt-1 text-sm text-slate-300">
                        Latest score:{' '}
                        <span className="text-emerald-300">
                          {latestScoreByDomain.get(w.domain) ?? 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => runScan(w.id)}
                        className="rounded-xl bg-slate-800 px-3 py-2 font-semibold hover:bg-slate-700"
                        type="button"
                      >
                        Run scan
                      </button>
                      <Link
                        className="rounded-xl border border-slate-700 px-3 py-2 font-semibold hover:bg-slate-800"
                        href="/dashboard"
                      >
                        History
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Vulnerability alerts</h2>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-slate-300">No alerts yet. Run a scan to get findings.</div>
              ) : (
                alerts.slice(0, 10).map(a => (
                  <div key={a.id} className="rounded-xl border border-slate-800/60 bg-slate-900/20 p-4">
                    <div className="font-semibold">{a.message}</div>
                    <div className="mt-1 text-xs text-slate-300">{new Date(a.createdAt).toLocaleString()}</div>
                    {!a.readAt ? (
                      <button
                        type="button"
                        onClick={() => markAlertRead(a.id)}
                        className="mt-3 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500"
                      >
                        Mark read
                      </button>
                    ) : (
                      <div className="mt-3 text-xs text-slate-400">Read</div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-5 text-sm text-slate-300">
              Email alerts can be added by connecting a mail provider in the backend.
            </div>
          </section>
        </div>

        <section className="glass rounded-2xl p-5 mt-5">
          <h2 className="text-lg font-semibold">Scan history</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="px-3 py-2">Website</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Report</th>
                </tr>
              </thead>
              <tbody>
                {scans.slice(0, 20).map(s => (
                  <tr key={s.id} className="border-t border-slate-800/60">
                    <td className="px-3 py-2">{s.website.domain}</td>
                    <td className="px-3 py-2 capitalize">{s.status.toLowerCase()}</td>
                    <td className="px-3 py-2 font-semibold">
                      {s.score === null ? (
                        <span className="text-slate-400">N/A</span>
                      ) : (
                        <span className={s.score >= 80 ? 'text-emerald-300' : s.score >= 50 ? 'text-amber-300' : 'text-red-300'}>
                          {s.score}/100
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <Link className="text-emerald-400 hover:text-emerald-300" href={`/scan/${s.id}`}>
                        View report
                      </Link>
                    </td>
                  </tr>
                ))}
                {scans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-slate-300">
                      No scans yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

