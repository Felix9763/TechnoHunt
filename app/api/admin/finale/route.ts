import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getLiveActiveRound } from '@/lib/round';
import { markFinaleSubmission } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const teamCode = (body.teamCode || '').trim().toUpperCase();

    if (!teamCode) {
      return NextResponse.json(
        { error: 'Team code is required.' },
        { status: 400 }
      );
    }

    const activeRound = await getLiveActiveRound();
    const result = await markFinaleSubmission(activeRound, teamCode);

    return NextResponse.json({
      success: true,
      round: activeRound,
      teamCode,
      position: result.position,
      alreadySubmitted: result.alreadySubmitted,
    });
  } catch (err: any) {
    console.error('Admin finale submission error:', err);
    return NextResponse.json(
      { error: 'Internal error marking finale submission.' },
      { status: 500 }
    );
  }
}
