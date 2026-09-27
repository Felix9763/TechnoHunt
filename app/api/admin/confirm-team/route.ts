import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getLiveActiveRound } from '@/lib/round';
import { confirmTeamRegistration } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const teamCode = (body.teamCode || '').trim().toUpperCase();
    const teamName = (body.teamName || '').trim();

    if (!teamCode) {
      return NextResponse.json({ error: 'Team code is required.' }, { status: 400 });
    }

    if (!teamName) {
      return NextResponse.json({ error: 'Please provide a team name to assign.' }, { status: 400 });
    }

    const activeRound = await getLiveActiveRound();
    const ok = await confirmTeamRegistration(activeRound, teamCode, teamName);

    if (!ok) {
      return NextResponse.json({ error: 'Failed to confirm team registration.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      teamCode,
      teamName,
      message: `Team ${teamCode} assigned name "${teamName}" and confirmed!`,
    });
  } catch (err: any) {
    console.error('Error confirming team registration:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
