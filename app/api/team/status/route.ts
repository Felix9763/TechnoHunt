import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { fetchTeamRegistration, fetchTeamProgress } from '@/lib/db';
import { getStagesForRound, getSanitizedStageData } from '@/lib/round';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getTeamSession(req);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const reg = await fetchTeamRegistration(session.round, session.teamCode);
    const currentStage = (await fetchTeamProgress(session.round, session.teamCode)) || 'clue2';

    // Build sanitized stage data so the client can fully sync on mount
    const roundId = session.round as import('@/lib/round').RoundId;
    const stages = getStagesForRound(roundId);
    const teamStages = stages[session.teamCode] || {};
    const stageData = getSanitizedStageData(teamStages, currentStage, roundId);

    return NextResponse.json({
      authenticated: true,
      teamCode: session.teamCode,
      track: session.track,
      round: session.round,
      confirmed: reg?.confirmed || false,
      teamName: reg?.team_name || '',
      currentStage,
      stageData,
    });
  } catch (err: any) {
    console.error('Error in team status:', err);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
