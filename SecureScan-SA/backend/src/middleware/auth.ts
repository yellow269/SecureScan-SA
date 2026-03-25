import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';

export type AuthUser = { userId: string; role: 'USER' | 'ADMIN' };

function getToken(req: Request): string | null {
  const cookieToken = (req as any).cookies?.token;
  if (cookieToken) return String(cookieToken);

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getToken(req);
    if (!token) throw new ApiError(401, 'Not authenticated');

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    if (!decoded?.userId) throw new ApiError(401, 'Not authenticated');

    (req as any).authUser = {
      userId: String(decoded.userId),
      role: decoded.role === 'ADMIN' ? 'ADMIN' : 'USER'
    } satisfies AuthUser;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authUser = (req as any).authUser as AuthUser | undefined;
  if (!authUser?.userId) return next(new ApiError(401, 'Not authenticated'));
  if (authUser.role !== 'ADMIN') return next(new ApiError(403, 'Admin only'));
  next();
}

