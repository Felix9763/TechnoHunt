import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from './round';

const TEAM_COOKIE_NAME = 'hunt_team_session';
const ADMIN_COOKIE_NAME = 'hunt_admin_session';

const DEFAULT_TEAM_SECRET = 'technohunt-team-session-secret-key-32chars!';
const DEFAULT_ADMIN_SECRET = 'technohunt-admin-session-secret-key-32chars!';

const teamSecret = new TextEncoder().encode(
  (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
    ? process.env.SESSION_SECRET
    : DEFAULT_TEAM_SECRET
);

const adminSecret = new TextEncoder().encode(
  (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32)
    ? process.env.ADMIN_SESSION_SECRET
    : DEFAULT_ADMIN_SECRET
);

export interface TeamSessionPayload {
  teamCode: string;
  track: string;
  round: string;
  [key: string]: any;
}

export interface AdminSessionPayload {
  isAdmin: boolean;
  [key: string]: any;
}

export async function signTeamSession(payload: TeamSessionPayload): Promise<{ token: string; expiresAt: Date }> {
  const settings = getSettings();
  const eventEnd = new Date(settings.eventEnd);
  // If eventEnd is invalid or in past, fallback to 24h from now
  const expiresAt = isNaN(eventEnd.getTime()) || eventEnd.getTime() < Date.now()
    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
    : eventEnd;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(teamSecret);

  return { token, expiresAt };
}

export async function verifyTeamToken(token: string): Promise<TeamSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, teamSecret);
    return payload as unknown as TeamSessionPayload;
  } catch (err) {
    return null;
  }
}

export async function getTeamSession(req?: NextRequest): Promise<TeamSessionPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(TEAM_COOKIE_NAME)?.value;
  } else {
    const cookieStore = cookies();
    token = cookieStore.get(TEAM_COOKIE_NAME)?.value;
  }
  if (!token) return null;
  return verifyTeamToken(token);
}

export async function setTeamSessionCookie(
  res: NextResponse,
  payload: TeamSessionPayload
): Promise<void> {
  const { token, expiresAt } = await signTeamSession(payload);
  res.cookies.set(TEAM_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearTeamSessionCookie(res: NextResponse): void {
  res.cookies.set(TEAM_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

// ADMIN AUTH HELPERS

export async function signAdminSession(): Promise<{ token: string; expiresAt: Date }> {
  // Admin session expires in 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ isAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(adminSecret);

  return { token, expiresAt };
}

export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, adminSecret);
    if ((payload as any).isAdmin === true) {
      return payload as unknown as AdminSessionPayload;
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function getAdminSession(req?: NextRequest): Promise<AdminSessionPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  } else {
    const cookieStore = cookies();
    token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  }
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function setAdminSessionCookie(res: NextResponse): Promise<void> {
  const { token, expiresAt } = await signAdminSession();
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
