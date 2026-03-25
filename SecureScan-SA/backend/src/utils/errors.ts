import type { Response } from 'express';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function sendError(res: Response, err: unknown) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? null
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

