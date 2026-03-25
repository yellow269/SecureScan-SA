import type { Severity } from '@prisma/client';

const severityPenalty: Record<Severity, number> = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 8,
  CRITICAL: 15
};

export function computeSecurityScore(findings: Array<{ severity: Severity }>) {
  const penalty = findings.reduce((sum, f) => sum + (severityPenalty[f.severity] ?? 1), 0);
  const score = Math.max(0, 100 - penalty);
  return { score, penalty };
}

