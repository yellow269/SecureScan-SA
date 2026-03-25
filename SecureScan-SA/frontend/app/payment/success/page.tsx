import Link from 'next/link';

export default function PaymentSuccessPage({ searchParams }: { searchParams: { sub?: string } }) {
  const sub = searchParams?.sub;
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="glass rounded-2xl p-7 shadow-soft">
          <h2 className="text-2xl font-bold">Subscription started</h2>
          <p className="mt-2 text-slate-300">
            PayFast returned success. Your backend will receive the webhook shortly and enable automated scans.
          </p>
          {sub ? <div className="mt-3 text-sm text-slate-400">Subscription reference: {sub}</div> : null}
          <div className="mt-6 flex gap-3">
            <Link className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500" href="/dashboard">
              Go to dashboard
            </Link>
            <Link className="rounded-xl border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800" href="/payment">
              View plans
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

