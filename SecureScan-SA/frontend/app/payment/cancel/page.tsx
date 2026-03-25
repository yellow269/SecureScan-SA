import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="glass rounded-2xl p-7 shadow-soft">
          <h2 className="text-2xl font-bold">Subscription cancelled</h2>
          <p className="mt-2 text-slate-300">You can choose a plan again any time.</p>
          <div className="mt-6 flex gap-3">
            <Link className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500" href="/payment">
              Choose a plan
            </Link>
            <Link className="rounded-xl border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

