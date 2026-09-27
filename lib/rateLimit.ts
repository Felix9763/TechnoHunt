import { fetchStageAttempts } from './db';
import { getSettings } from './round';

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'cooldown' | 'lockout';
  remainingSeconds?: number;
  consecutiveWrong?: number;
}

export async function checkRateLimit(
  round: string,
  teamCode: string,
  stage: string
): Promise<RateLimitResult> {
  const settings = getSettings();
  const attempts = await fetchStageAttempts(round, teamCode, stage);

  if (!attempts || attempts.length === 0) {
    return { allowed: true, consecutiveWrong: 0 };
  }

  const now = Date.now();
  const mostRecent = attempts[0];
  const mostRecentTime = new Date(mostRecent.created_at).getTime();
  const elapsedSinceLastAttempt = (now - mostRecentTime) / 1000;

  // 1. Check cooldown (applies after every attempt)
  if (elapsedSinceLastAttempt < settings.submitCooldownSeconds) {
    const remainingSeconds = Math.ceil(settings.submitCooldownSeconds - elapsedSinceLastAttempt);
    return {
      allowed: false,
      reason: 'cooldown',
      remainingSeconds,
    };
  }

  // 2. Count consecutive wrong attempts
  let consecutiveWrong = 0;
  let lastWrongTime: number | null = null;

  for (const attempt of attempts) {
    if (attempt.correct) {
      break; // Streak of wrong attempts ended by a correct attempt
    }
    consecutiveWrong++;
    if (lastWrongTime === null) {
      lastWrongTime = new Date(attempt.created_at).getTime();
    }
  }

  // 3. Check lockout
  if (consecutiveWrong >= settings.maxWrongAttempts && lastWrongTime !== null) {
    const elapsedSinceLastWrong = (now - lastWrongTime) / 1000;
    if (elapsedSinceLastWrong < settings.lockoutSeconds) {
      const remainingSeconds = Math.ceil(settings.lockoutSeconds - elapsedSinceLastWrong);
      return {
        allowed: false,
        reason: 'lockout',
        remainingSeconds,
        consecutiveWrong,
      };
    }
  }

  return {
    allowed: true,
    consecutiveWrong,
  };
}
