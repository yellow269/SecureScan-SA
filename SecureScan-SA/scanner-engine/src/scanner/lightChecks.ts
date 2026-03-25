import { load } from 'cheerio';
import { z } from 'zod';
import type { Severity } from '@prisma/client';
import { runZapActiveScan } from './zap';
import net from 'net';

export type Finding = {
  issueType: string;
  severity: Severity;
  explanation: string;
  recommendedFix: string;
};

function normalizeDomain(input: string): string {
  const raw = input.trim();
  return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Identify our scanner politely.
        'User-Agent': 'SecureScan-SA/1.0'
      }
    });
    const text = await res.text().catch(() => '');
    return { res, text };
  } finally {
    clearTimeout(t);
  }
}

async function isTcpPortOpen(host: string, port: number, timeoutMs: number) {
  return new Promise<boolean>(resolve => {
    const socket = new net.Socket();
    const onClose = () => resolve(false);
    const onError = () => resolve(false);
    socket.setTimeout(timeoutMs);
    socket.once('error', onError);
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
    socket.once('close', onClose);
  });
}

export async function runLightweightChecks(domainInput: string) {
  const domain = normalizeDomain(domainInput);
  const findings: Finding[] = [];
  const report: Record<string, any> = { domain, checks: {} };

  const httpsUrl = `https://${domain}/`;
  const httpUrl = `http://${domain}/`;

  // Missing HTTPS
  let httpsOk = false;
  try {
    const { res } = await fetchWithTimeout(httpsUrl, 8000);
    httpsOk = res.status < 500;
  } catch {
    httpsOk = false;
  }

  // Best-effort TCP port discovery (80/443 only, safe + fast).
  try {
    const [port80, port443] = await Promise.all([
      isTcpPortOpen(domain, 80, 2500),
      isTcpPortOpen(domain, 443, 2500)
    ]);
    report.checks.tcpPorts = { port80, port443 };
    if (port80) {
      findings.push({
        issueType: 'HTTP port 80 open',
        severity: 'LOW',
        explanation: 'TCP port 80 appears open for this domain.',
        recommendedFix: 'If you require HTTPS, ensure HTTP requests are redirected to HTTPS and block non-secure traffic.'
      });
    }
  } catch {
    // ignore port probing errors
  }

  if (!httpsOk) {
    findings.push({
      issueType: 'Missing HTTPS',
      severity: 'HIGH',
      explanation: 'Site does not appear to respond over HTTPS.',
      recommendedFix: 'Enable TLS/HTTPS on your hosting and redirect all HTTP traffic to HTTPS.'
    });
    report.checks.missingHttps = true;
  }

  const effectiveUrl = httpsOk ? httpsUrl : httpUrl;

  // Pull HTML + headers (best effort).
  let html = '';
  let finalResStatus: number | null = null;
  const headersLower: Record<string, string> = {};
  try {
    const r = await fetchWithTimeout(effectiveUrl, 10000);
    html = r.text;
    finalResStatus = r.res.status;
    for (const [k, v] of r.res.headers.entries()) headersLower[k.toLowerCase()] = v;
  } catch (e: any) {
    report.error = e?.message ?? String(e);
  }

  report.checks.httpStatus = finalResStatus;

  // Security headers
  const headerChecks: Array<[string, Finding]> = [
    [
      'content-security-policy',
      {
        issueType: 'Missing Content Security Policy',
        severity: 'MEDIUM',
        explanation: 'Content Security Policy (CSP) header was not found.',
        recommendedFix: 'Add a CSP header appropriate for your application to reduce XSS risk.'
      }
    ],
    [
      'strict-transport-security',
      {
        issueType: 'Missing HSTS',
        severity: 'MEDIUM',
        explanation: 'Strict-Transport-Security header was not found.',
        recommendedFix: 'Add HSTS (e.g., max-age, includeSubDomains) after enabling HTTPS.'
      }
    ],
    [
      'x-frame-options',
      {
        issueType: 'Missing X-Frame-Options',
        severity: 'LOW',
        explanation: 'X-Frame-Options header was not found.',
        recommendedFix: 'Set X-Frame-Options (or frame-ancestors in CSP) to prevent clickjacking.'
      }
    ],
    [
      'x-content-type-options',
      {
        issueType: 'Missing X-Content-Type-Options',
        severity: 'LOW',
        explanation: 'X-Content-Type-Options header was not found.',
        recommendedFix: 'Add X-Content-Type-Options: nosniff to reduce MIME sniffing issues.'
      }
    ],
    [
      'referrer-policy',
      {
        issueType: 'Missing Referrer-Policy',
        severity: 'LOW',
        explanation: 'Referrer-Policy header was not found.',
        recommendedFix: 'Set Referrer-Policy to limit referrer leakage.'
      }
    ]
  ];

  for (const [headerName, finding] of headerChecks) {
    const present = Boolean(headersLower[headerName]);
    if (!present) {
      // HSTS only makes sense when HTTPS works.
      if (headerName === 'strict-transport-security' && !httpsOk) continue;
      findings.push(finding);
    }
  }

  // CMS hints
  try {
    const $ = load(html);
    const text = $('body').text().slice(0, 50000);
    const hasWordPress =
      /wp-content|wordpress|wp-includes|\/wp-admin/i.test(html) ||
      /WordPress/i.test(text);

    if (hasWordPress) {
      findings.push({
        issueType: 'Outdated CMS likely (WordPress detected)',
        severity: 'MEDIUM',
        explanation: 'WordPress indicators were detected. Plugins/themes may be outdated.',
        recommendedFix:
          'Update WordPress core and all plugins/themes. Remove unused plugins and keep everything patched.'
      });
      report.checks.wordPressDetected = true;
    }
  } catch {
    // ignore parsing errors
  }

  // Exposed admin panels (path discovery)
  const adminPaths = ['/admin', '/administrator', '/wp-admin', '/login', '/signin', '/controlpanel'];
  const adminFindings: Array<{ path: string; status: number }> = [];
  await Promise.all(
    adminPaths.map(async p => {
      try {
        const { res } = await fetchWithTimeout(`${effectiveUrl.replace(/\\/$/, '')}${p}`, 6000);
        if (res.status < 400) adminFindings.push({ path: p, status: res.status });
      } catch {
        // ignore
      }
    })
  );

  for (const a of adminFindings.slice(0, 5)) {
    findings.push({
      issueType: 'Potential exposed admin panel',
      severity: 'HIGH',
      explanation: `An admin-like path (${a.path}) appears accessible (HTTP ${a.status}).`,
      recommendedFix: 'Restrict admin routes to authenticated users/IP allowlists and ensure proper hardening.'
    });
  }

  // Placeholder for ZAP integration (recommended in production).
  report.zap = { configured: Boolean(process.env.ZAP_URL), note: 'Best-effort ZAP scan will run if ZAP_URL is configured.' };

  // If ZAP is configured, run an active scan and convert its alerts to findings.
  try {
    if (process.env.ZAP_URL) {
      const zapRes = await runZapActiveScan(effectiveUrl);
      report.zap.result = { scanId: zapRes.scanId ?? null, alertCount: zapRes.rawAlerts?.length ?? 0 };
      findings.push(
        ...zapRes.findings.map(f => ({
          issueType: f.issueType,
          severity: f.severity,
          explanation: f.explanation,
          recommendedFix: f.recommendedFix
        }))
      );
    }
  } catch (e: any) {
    report.zap.error = e?.message ? String(e.message) : String(e);
  }

  // Basic sanity cap so a single scan can’t explode output volume.
  const validated = findings.slice(0, 25).map(f =>
    z
      .object({
        issueType: z.string().min(1),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        explanation: z.string(),
        recommendedFix: z.string()
      })
      .parse(f)
  );

  return { findings: validated, report };
}

