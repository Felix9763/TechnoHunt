import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  getLiveActiveRound,
  getTeamsForRound,
  checkRoundConfig,
  getSettings,
} from '@/lib/round';
import {
  fetchAllTeamProgress,
  fetchAllAttempts,
  fetchFinaleSubmissions,
} from '@/lib/db';

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

    // Map progress by teamCode for fast lookup
    const progressMap: Record<string, { current_stage: string; last_updated: string }> = {};
    progressList.forEach((p) => {
      progressMap[p.team_code] = {
        current_stage: p.current_stage,
        last_updated: p.last_updated,
      };
    });

    return NextResponse.json({
      activeRound,
      round1,
      round2,
      teams,
      progress: progressMap,
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
