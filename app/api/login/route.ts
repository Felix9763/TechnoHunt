import { NextRequest, NextResponse } from 'next/server';
import { getLiveActiveRound, getTeamsForRound } from '@/lib/round';
import { setTeamSessionCookie } from '@/lib/auth';
import { fetchTeamProgress } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const teamCodeInput = (body.teamCode || '').trim().toUpperCase();
    const pinInput = (body.pin || '').trim();

    if (!teamCodeInput || !pinInput) {
      return NextResponse.json(
        { error: 'Team code and PIN are required, Detective.' },
        { status: 400 }
      );
    }

    const activeRound = await getLiveActiveRound();
    const teams = getTeamsForRound(activeRound);

    const team = teams.find(
      (t) => t.code.toUpperCase() === teamCodeInput && t.pin === pinInput
    );

    if (!team) {
      return NextResponse.json(
        { error: 'Invalid badge or PIN. Check your credentials.' },
        { status: 401 }
      );
    }

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
