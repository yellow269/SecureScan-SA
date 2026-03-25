export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="glass rounded-2xl p-8 shadow-soft">
          <h1 className="text-4xl font-bold">SecureScan SA</h1>
          <p className="mt-3 text-slate-300">
            Scan your business website for security risks and get a clear score + fixes.
          </p>
          <div className="mt-8 flex gap-3">
            <a
              className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500"
              href="/login"
            >
              Login
            </a>
            <a className="rounded-xl bg-slate-800 px-4 py-2 font-semibold hover:bg-slate-700" href="/signup">
              Create account
            </a>
            <a className="rounded-xl border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800" href="/payment">
              View plans
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

