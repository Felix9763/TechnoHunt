import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getLiveActiveRound, setLiveActiveRound, checkRoundConfig, RoundId } from '@/lib/round';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const activeRound = await getLiveActiveRound();
  const round1Status = checkRoundConfig('round1');
  const round2Status = checkRoundConfig('round2');

  return NextResponse.json({
    activeRound,
    round1: round1Status,
    round2: round2Status,
  });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const targetRound: RoundId = body.round;

    if (targetRound !== 'round1' && targetRound !== 'round2') {
      return NextResponse.json(
        { error: 'Invalid round identifier. Must be "round1" or "round2".' },
        { status: 400 }
      );
    }

    const res = await setLiveActiveRound(targetRound);
    if (!res.success) {
      return NextResponse.json(
        { error: res.error || 'Cannot switch to round.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      activeRound: targetRound,
      message: `Active round successfully changed to ${targetRound}.`,
    });
  } catch (err: any) {
    console.error('Admin round switch error:', err);
    return NextResponse.json(
      { error: 'Internal error updating round.' },
      { status: 500 }
    );
  }
}
