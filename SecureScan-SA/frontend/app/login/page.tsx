'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setToken } from '@/lib/token';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const resp = await apiFetch<{ token: string } & { email: string; role: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password })
        }
      );
      setToken(resp.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.message ? String(err.message) : 'Login failed');
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-md">
        <div className="glass rounded-2xl p-7 shadow-soft">
          <h2 className="text-2xl font-bold">Login</h2>
          <p className="mt-1 text-slate-300">SecureScan SA dashboard access</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm text-slate-300">Email</label>
              <input
                className="mt-1 w-full rounded-xl bg-slate-900/60 px-3 py-2 outline-none ring-1 ring-slate-700"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Password</label>
              <input
                className="mt-1 w-full rounded-xl bg-slate-900/60 px-3 py-2 outline-none ring-1 ring-slate-700"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {error ? <div className="text-sm text-red-400">{error}</div> : null}

            <button
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
              type="submit"
            >
              Login
            </button>
          </form>

          <div className="mt-5 text-sm text-slate-300">
            No account? <a className="text-emerald-400" href="/signup">Create one</a>
          </div>
        </div>
      </div>
    </main>
  );
}

