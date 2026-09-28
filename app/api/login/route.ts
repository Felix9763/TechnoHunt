import { NextRequest, NextResponse } from 'next/server';
import { getLiveActiveRound, getTeamsForRound } from '@/lib/round';
import { setTeamSessionCookie } from '@/lib/auth';
import { fetchTeamProgress, checkInTeam, fetchTeamRegistration } from '@/lib/db';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

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

    // Rate limiting keys: per team-code PIN lock, per team+IP, and per IP
    const teamPinKey = `login_team_pin:${teamCodeInput}`;
    const comboKey = `login_combo:${teamCodeInput}:${ip}`;
    const ipKey = `login_ip:${ip}`;

    const teamPinLimit = checkLoginRateLimit(teamPinKey, 4, 60);
    const comboLimit = checkLoginRateLimit(comboKey, 5, 60);
    const ipLimit = checkLoginRateLimit(ipKey, 10, 60);

    if (!teamPinLimit.allowed) {
      return NextResponse.json(
        { error: `Too many incorrect PIN attempts for Team ${teamCodeInput}. Locked out for ${teamPinLimit.remainingSeconds}s.` },
        { status: 429 }
      );
    }

    if (!comboLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Terminal locked out for ${comboLimit.remainingSeconds}s.` },
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
      const pinFail = recordFailedLogin(teamPinKey, 4, 60);
      recordFailedLogin(comboKey, 5, 60);
      recordFailedLogin(ipKey, 10, 60);

      if (pinFail.isLockedOut) {
        return NextResponse.json(
          { error: `Too many incorrect PIN attempts for Team ${teamCodeInput}. Terminal locked out for ${pinFail.remainingSeconds}s.` },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid team code or PIN. Check your envelope.' },
        { status: 401 }
      );
    }

    // Reset rate limits on successful authentication
    resetLoginAttempts(teamPinKey);
    resetLoginAttempts(comboKey);
    resetLoginAttempts(ipKey);

    // Initialize team progress in DB if not already present
    await fetchTeamProgress(activeRound, team.code);

    // Check in team in database (marks them checked in, awaits admin confirmation)
    const reg = await checkInTeam(activeRound, team.code);

    const res = NextResponse.json({
      success: true,
      teamCode: team.code,
      track: team.track,
      round: activeRound,
      confirmed: reg.confirmed,
      teamName: reg.team_name || '',
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
