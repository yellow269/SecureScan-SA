'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/token';
import Link from 'next/link';

type Plan = { id: string; name: string; priceZar: number; websitesLimit: number; interval: string };

function formatZar(priceZar: number) {
  const zar = priceZar / 100;
  return `R${zar.toFixed(2)}`;
}

export default function PaymentPage() {
  const [token, setToken] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const resp = await apiFetch<{ plans: Plan[] }>('/api/payments/plans');
        setPlans(resp.plans);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Failed to load plans');
      }
    })();
  }, [token]);

  async function subscribe(planId: string) {
    setError(null);
    setBusyPlanId(planId);
    try {
      const resp = await apiFetch<{
        subscriptionId: string;
        payfast: { url: string; method: 'POST' | 'GET'; fields: Record<string, string> };
      }>('/api/payments/payfast/recurring', {
        method: 'POST',
        body: JSON.stringify({ planId })
      });

      const { url, fields } = resp.payfast;

      // Browser POST redirect to PayFast.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.style.display = 'none';

      for (const [k, v] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = String(v);
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Payment failed to start');
    } finally {
      setBusyPlanId(null);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="glass rounded-2xl p-7 shadow-soft">
            <h2 className="text-2xl font-bold">Login to subscribe</h2>
            <p className="mt-2 text-slate-300">SecureScan SA requires an account to enable automated scans.</p>
            <div className="mt-6">
              <Link className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500" href="/login">
                Login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="mt-1 text-slate-300">Enable scheduled scans and get vulnerability alerts.</p>

        {error ? <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-red-200">{error}</div> : null}

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {plans.map(p => (
            <div key={p.id} className="glass rounded-2xl p-6 shadow-soft">
              <div className="text-sm text-slate-300">{p.interval} plan</div>
              <div className="mt-2 text-2xl font-bold">{p.name}</div>
              <div className="mt-2 text-4xl font-extrabold text-emerald-300">{formatZar(p.priceZar)}/month</div>
              <div className="mt-2 text-slate-300">{p.websitesLimit} website{p.websitesLimit === 1 ? '' : 's'}</div>
              <button
                type="button"
                disabled={busyPlanId === p.id}
                onClick={() => subscribe(p.id)}
                className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-60"
              >
                {busyPlanId === p.id ? 'Redirecting…' : 'Subscribe with PayFast'}
              </button>
              <div className="mt-4 text-xs text-slate-400">
                You will be redirected to PayFast to confirm the subscription.
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

