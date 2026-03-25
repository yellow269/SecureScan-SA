import { z } from 'zod';

export const DomainSchema = z
  .string()
  .trim()
  .max(253)
  .refine(v => !/\s/.test(v), 'Domain must not contain spaces')
  .refine(v => !/[^a-zA-Z0-9.-]/.test(v.replace(/^https?:\/\//i, '')), 'Invalid characters')
  .refine(v => v.includes('.'), 'Domain must include a dot');

export function normalizeDomain(input: string): string {
  const raw = input.trim();
  const withoutScheme = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  return withoutScheme.toLowerCase();
}

export const CadenceSchema = z.enum(['daily', 'weekly', 'monthly']);

