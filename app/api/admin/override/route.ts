import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getLiveActiveRound } from '@/lib/round';
import { updateTeamProgress } from '@/lib/db';

const VALID_STAGES = ['clue2', 'crewmate', 'clue3', 'clue4', 'final'];

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const teamCode = (body.teamCode || '').trim().toUpperCase();
    const stage = (body.stage || '').trim().toLowerCase();

    if (!teamCode || !stage) {
      return NextResponse.json(
        { error: 'Team code and stage are required.' },
        { status: 400 }
      );
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const activeRound = await getLiveActiveRound();
    const ok = await updateTeamProgress(activeRound, teamCode, stage);

    if (!ok) {
      return NextResponse.json(
        { error: 'Failed to update team stage in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      teamCode,
      stage,
      round: activeRound,
    });
  } catch (err: any) {
    console.error('Admin override error:', err);
    return NextResponse.json(
      { error: 'Internal error processing stage override.' },
      { status: 500 }
    );
  }
}
