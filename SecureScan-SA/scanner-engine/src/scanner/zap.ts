import { env } from '../config/env';
import type { Finding } from './lightChecks';

function mapZapRiskToSeverity(riskRaw: unknown): Finding['severity'] {
  const risk = Number(riskRaw);
  if (Number.isNaN(risk)) return 'MEDIUM';
  // ZAP risk is typically: 0=Informational, 1=Low, 2=Medium, 3=High (sometimes as 0..3).
  if (risk <= 1) return 'LOW';
  if (risk === 2) return 'MEDIUM';
  if (risk === 3) return 'HIGH';
  return 'CRITICAL';
}

async function zapJson<T>(pathWithQuery: string): Promise<T> {
  const apikey = env.ZAP_API_KEY ? `&apikey=${encodeURIComponent(env.ZAP_API_KEY)}` : '';
  const joiner = pathWithQuery.includes('?') ? '' : '?';
  const url = `${env.ZAP_URL}${pathWithQuery}${joiner}${apikey}`.replace(/\?\&/, '?');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ZAP request failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function runZapActiveScan(targetUrl: string): Promise<{
  findings: Finding[];
  rawAlerts: any[];
  scanId?: string;
}> {
  if (!env.ZAP_URL) return { findings: [], rawAlerts: [] };

  // Start an active scan. ZAP typically responds with a scanId.
  const start = await zapJson<any>(
    `/JSON/ascan/action/scan/?url=${encodeURIComponent(targetUrl)}&recurse=true&inScopeOnly=true`
  );
  const scanId = String(start?.scanId ?? start?.scan_id ?? '');
  if (!scanId) return { findings: [], rawAlerts: [], scanId: undefined };

  // Poll for scan completion.
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    const status = await zapJson<any>(`/JSON/ascan/view/status/?scanId=${encodeURIComponent(scanId)}`);
    const pct = Number(status?.status ?? status?.progress ?? 0);
    if (pct >= 100) break;
    await new Promise(r => setTimeout(r, 3000));
  }

  // Fetch alerts for the base URL.
  const alertsResp = await zapJson<any>(
    `/JSON/core/view/alerts/?baseurl=${encodeURIComponent(targetUrl)}`
  );
  const alerts: any[] = Array.isArray(alertsResp?.alerts) ? alertsResp.alerts : [];

  const findings: Finding[] = alerts
    .filter(a => a)
    .map(a => {
      const issueType = String(a.alert ?? a.name ?? 'ZAP Alert');
      const severity = mapZapRiskToSeverity(a.risk ?? a.riskcode);
      const explanation = String(a.description ?? a.other ?? '');
      const recommendedFix = String(a.solution ?? a.fix ?? a.description ?? '');
      return {
        issueType,
        severity,
        explanation: explanation || 'ZAP detected a potential issue.',
        recommendedFix: recommendedFix || 'Review ZAP alert details and apply the recommended mitigation.'
      };
    });

  return { findings, rawAlerts: alerts, scanId };
}

