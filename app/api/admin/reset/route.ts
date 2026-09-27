import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getLiveActiveRound } from '@/lib/round';
import { resetRoundData } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const activeRound = await getLiveActiveRound();
    await resetRoundData(activeRound);

    return NextResponse.json({
      success: true,
      round: activeRound,
      message: `All test data for ${activeRound} has been reset.`,
    });
  } catch (err: any) {
    console.error('Admin reset error:', err);
    return NextResponse.json(
      { error: 'Failed to reset round data.' },
      { status: 500 }
    );
  }
}
