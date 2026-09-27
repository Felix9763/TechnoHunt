import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  getLiveActiveRound,
  getTeamsForRound,
  getStagesForRound,
  checkRoundConfig,
  getSettings,
} from '@/lib/round';
import {
  fetchAllTeamProgress,
  fetchAllAttempts,
  fetchFinaleSubmissions,
  fetchAllTeamRegistrations,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const activeRound = await getLiveActiveRound();
    const round1 = checkRoundConfig('round1');
    const round2 = checkRoundConfig('round2');
    const teams = getTeamsForRound(activeRound);
    const progressList = await fetchAllTeamProgress(activeRound);
    const attempts = await fetchAllAttempts(activeRound, 100);
    const finale = await fetchFinaleSubmissions(activeRound);
    const settings = getSettings();

    const progressMap: Record<string, { current_stage: string; last_updated: string }> = {};
    progressList.forEach((p) => {
      progressMap[p.team_code] = {
        current_stage: p.current_stage,
        last_updated: p.last_updated,
      };
    });

    const stages = getStagesForRound(activeRound);
    const registrations = await fetchAllTeamRegistrations(activeRound);

    return NextResponse.json({
      activeRound,
      round1,
      round2,
      teams,
      stages,
      progress: progressMap,
      registrations,
      attempts,
      finale,
      settings,
    });
  } catch (err: any) {
    console.error('Admin data fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch admin data.' },
      { status: 500 }
    );
  }
}
