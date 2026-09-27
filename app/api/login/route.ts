import { NextRequest, NextResponse } from 'next/server';
import { getLiveActiveRound, getTeamsForRound } from '@/lib/round';
import { setTeamSessionCookie } from '@/lib/auth';
import { fetchTeamProgress } from '@/lib/db';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    const body = await req.json();
    const teamCodeInput = (body.teamCode || '').trim().toUpperCase();
    const pinInput = (body.pin || '').trim();

    if (!teamCodeInput || !pinInput) {
      return NextResponse.json(
        { error: 'Team code and PIN are required, Detective.' },
        { status: 400 }
      );
    }

    const rateLimitKey = `login:${teamCodeInput}:${ip}`;
    const ipRateLimitKey = `login_ip:${ip}`;

    const teamLimit = checkLoginRateLimit(rateLimitKey, 5, 60);
    const ipLimit = checkLoginRateLimit(ipRateLimitKey, 10, 60);

    if (!teamLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts. Locked out for ${teamLimit.remainingSeconds}s.` },
        { status: 429 }
      );
    }

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts from this network. Try again in ${ipLimit.remainingSeconds}s.` },
        { status: 429 }
      );
    }

    const activeRound = await getLiveActiveRound();
    const teams = getTeamsForRound(activeRound);

    const team = teams.find(
      (t) => t.code.toUpperCase() === teamCodeInput && t.pin === pinInput
    );

    if (!team) {
      const fail = recordFailedLogin(rateLimitKey, 5, 60);
      recordFailedLogin(ipRateLimitKey, 10, 60);

      if (fail.isLockedOut) {
        return NextResponse.json(
          { error: `Too many failed attempts. Locked out for ${fail.remainingSeconds}s.` },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid badge or PIN. Check your credentials.' },
        { status: 401 }
      );
    }

    // Reset rate limits on successful authentication
    resetLoginAttempts(rateLimitKey);
    resetLoginAttempts(ipRateLimitKey);

    // Initialize team progress in DB if not already present
    await fetchTeamProgress(activeRound, team.code);

    const res = NextResponse.json({
      success: true,
      teamCode: team.code,
      track: team.track,
      round: activeRound,
      redirect: '/dashboard',
    });

    await setTeamSessionCookie(res, {
      teamCode: team.code,
      track: team.track,
      round: activeRound,
    });

    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'System error during login. Try again.' },
      { status: 500 }
    );
  }
}
