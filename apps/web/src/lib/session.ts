/**
 * Session management: a signed JWT (jose) in an httpOnly cookie, backed by a
 * Session row for revocation. See ADR-0001, Decision 2.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { SESSION_COOKIE, env, isProduction } from '@tavakoli/config';
import { prisma, type User, type UserRole } from '@tavakoli/database';

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/** Issue a session: sign a JWT, persist a Session row, set the cookie. */
export async function createSession(
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const token = await new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(token),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/** Read + validate the current session. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = payload.sub;
    if (!userId) return null;

    const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: { id: true, email: true, name: true, role: true },
    });
    return user;
  } catch {
    return null;
  }
});

/** Revoke the current session and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .updateMany({ where: { tokenHash: tokenHash(token) }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}
