import crypto from 'crypto';
import { env } from '../config/env';

function sortedKeys(obj: Record<string, any>) {
  return Object.keys(obj).sort();
}

export function generatePayfastSignature(data: Record<string, any>): string {
  const pfData = { ...data, passphrase: env.PAYFAST_PASSPHRASE };

  const keys = sortedKeys(pfData).filter(key => {
    const v = pfData[key];
    return v !== '' && v !== null && v !== undefined;
  });

  const string = keys.map(k => `${k}=${encodeURIComponent(pfData[k])}`).join('&');

  return crypto.createHash('md5').update(string).digest('hex');
}

export function verifyPayfastWebhookSignature(body: Record<string, any>): boolean {
  const receivedSignature =
    String(body.signature ?? body['Signature'] ?? body['SIGNATURE'] ?? '').trim();
  if (!receivedSignature) return false;

  const { signature: _sig1, Signature: _sig2, SIGNATURE: _sig3, ...rest } = body;
  const computed = generatePayfastSignature(rest);
  return computed === receivedSignature;
}

export function buildPayfastBillingReference(userId: string) {
  // Used to link webhook callbacks back to our subscription row.
  return `securescan_sa_${userId}`;
}

