import { NextRequest, NextResponse } from 'next/server';
import { getTeamSession } from '@/lib/auth';
import { getLiveActiveRound, getStagesForRound, getSettings } from '@/lib/round';
import { fetchTeamProgress, updateTeamProgress, logAttempt } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';
import { isAnswerCorrect } from '@/lib/answerMatch';

const STAGE_ORDER = ['clue2', 'crewmate', 'clue3', 'clue4', 'final'];

export async function POST(req: NextRequest) {
  try {
    // 1. Validate session
    const session = await getTeamSession(req);
    if (!session) {
      return NextResponse.json(
        { error: 'Session expired or not authorized. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Confirm session's round matches active round from database
    const activeRound = await getLiveActiveRound();
    if (session.round !== activeRound) {
      return NextResponse.json(
        {
          error: 'This round has ended — please log in again',
          roundMismatch: true,
        },
        { status: 409 }
      );
    }

    const { teamCode } = session;
    const body = await req.json();
    const answer = (body.answer || '').toString().trim();

    if (!answer) {
      return NextResponse.json(
        { error: 'Submission cannot be empty, Detective.' },
        { status: 400 }
      );
    }

    // 3. Read team's current stage from database (never trust client)
    const currentStage = await fetchTeamProgress(activeRound, teamCode);

    if (currentStage === 'final') {
      return NextResponse.json(
        {
          error: 'Final stage reached. Hand over the physical key at Empty Stage.',
          currentStage: 'final',
        },
        { status: 400 }
      );
    }

    // 4. Rate limiting enforcement
    const rateLimit = await checkRateLimit(activeRound, teamCode, currentStage);
    if (!rateLimit.allowed) {
      if (rateLimit.reason === 'lockout') {
        return NextResponse.json(
          {
            error: `Too many failed attempts. Locked out for ${rateLimit.remainingSeconds}s.`,
            reason: 'lockout',
            remainingSeconds: rateLimit.remainingSeconds,
          },
          { status: 429 }
        );
      }
      if (rateLimit.reason === 'cooldown') {
        return NextResponse.json(
          {
            error: `Please wait ${rateLimit.remainingSeconds}s before submitting again.`,
            reason: 'cooldown',
            remainingSeconds: rateLimit.remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 5. Look up stage data for the team
    const stages = getStagesForRound(activeRound);
    const teamStages = stages[teamCode];

    if (!teamStages) {
      return NextResponse.json(
        { error: 'No assignment found for your team in this round.' },
        { status: 404 }
      );
    }

    let expectedAnswer = '';
    if (currentStage === 'clue2') {
      expectedAnswer = teamStages.clue2?.codeword || '';
    } else if (currentStage === 'crewmate') {
      expectedAnswer = teamStages.crewmate?.code || '';
    } else if (currentStage === 'clue3') {
      expectedAnswer = teamStages.clue3?.answer || '';
    } else if (currentStage === 'clue4') {
      expectedAnswer = teamStages.clue4?.answer || '';
    }

    const correct = isAnswerCorrect(answer, expectedAnswer);

    // 6. Log attempt to database (round-scoped)
    await logAttempt(activeRound, teamCode, currentStage, answer, correct);

    // 7. Handle incorrect answer
    if (!correct) {
      const settings = getSettings();
      const newWrongCount = (rateLimit.consecutiveWrong || 0) + 1;
      const attemptsRemaining = Math.max(0, settings.maxWrongAttempts - newWrongCount);

      const isNowLockedOut = newWrongCount >= settings.maxWrongAttempts;

      return NextResponse.json(
        {
          correct: false,
          error: "That's not it, Detective.",
          attemptsRemaining: isNowLockedOut ? 0 : attemptsRemaining,
          lockedOut: isNowLockedOut,
          lockoutSeconds: isNowLockedOut ? settings.lockoutSeconds : undefined,
        },
        { status: 400 }
      );
    }

    // 8. Handle correct answer: advance stage
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const nextStage = currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1
      ? STAGE_ORDER[currentIndex + 1]
      : 'final';

    await updateTeamProgress(activeRound, teamCode, nextStage);

    return NextResponse.json({
      correct: true,
      currentStage: nextStage,
      message: 'Verified',
      completed: nextStage === 'final',
    });
  } catch (err: any) {
    console.error('Submit route error:', err);
    return NextResponse.json(
      { error: 'Internal system error processing submission.' },
      { status: 500 }
    );
  }
}
