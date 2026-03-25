import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { apiRateLimit, authRateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { ApiError, sendError } from '../utils/errors';

export const authRouter = Router();

authRouter.post('/signup', authRateLimit, async (req, res) => {
  try {
    const Body = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(72)
    });
    const { email, password } = Body.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({ id: user.id, email: user.email, role: user.role, token });
  } catch (err) {
    sendError(res, err);
  }
});

authRouter.post('/login', authRateLimit, async (req, res) => {
  try {
    const Body = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });
    const { email, password } = Body.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, 'Invalid email or password');

    const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ id: user.id, email: user.email, role: user.role, token });
  } catch (err) {
    sendError(res, err);
  }
});

authRouter.post('/logout', requireAuth, async (_req, res) => {
  res.clearCookie('token');
  res.status(204).send();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const authUser = (req as any).authUser as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, email: true, role: true }
    });
    if (!user) throw new ApiError(404, 'User not found');
    res.json(user);
  } catch (err) {
    sendError(res, err);
  }
});

// Password reset placeholders (email sending can be added later).
authRouter.post('/forgot-password', apiRateLimit, async (_req, res) => {
  res.status(200).json({ ok: true });
});

authRouter.post('/reset-password', apiRateLimit, async (_req, res) => {
  res.status(200).json({ ok: true });
});

