'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Vulnerability = {
  issueType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
  recommendedFix: string;
};

type Scan = {
  id: string;
  status: string;
  score: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  domain: string;
  vulnerabilities: Vulnerability[];
};

export default function ScanReportPage() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiFetch<{ scan: Scan }>(`/api/scans/${scanId}`);
        setScan(resp.scan);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : 'Failed to load report');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId]);

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900/50 bg-red-950/20 p-6">
          <div className="font-semibold text-red-200">Error</div>
          <div className="mt-2 text-slate-200">{error}</div>
        </div>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl text-slate-300">Loading report…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="glass rounded-2xl p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Scan Report</h1>
              <div className="mt-1 text-slate-300">Domain: {scan.domain}</div>
              <div className="mt-1 text-slate-300">Status: {scan.status}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Security Score</div>
              <div className="text-3xl font-bold">
                {scan.score === null ? 'N/A' : (
                  <span className={scan.score >= 80 ? 'text-emerald-300' : scan.score >= 50 ? 'text-amber-300' : 'text-red-300'}>
                    {scan.score}/100
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold">Vulnerability Findings</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Issue Type</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Explanation</th>
                    <th className="px-3 py-2">Recommended Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.vulnerabilities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-slate-300">No findings recorded.</td>
                    </tr>
                  ) : (
                    scan.vulnerabilities.map(v => (
                      <tr key={v.issueType + v.severity} className="border-t border-slate-800/60 align-top">
                        <td className="px-3 py-3 font-semibold">{v.issueType}</td>
                        <td className="px-3 py-3">
                          <span className={
                            v.severity === 'CRITICAL' ? 'text-red-300' :
                            v.severity === 'HIGH' ? 'text-red-200' :
                            v.severity === 'MEDIUM' ? 'text-amber-300' :
                            'text-slate-300'
                          }>{v.severity}</span>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{v.explanation}</td>
                        <td className="px-3 py-3 text-slate-200">{v.recommendedFix}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 text-xs text-slate-500">
            Note: ZAP deep scanning can be integrated in the scanner engine. This MVP uses lightweight checks plus ZAP scaffolding.
          </div>
        </div>
      </div>
    </main>
  );
}

