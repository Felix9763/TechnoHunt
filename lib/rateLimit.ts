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

// IN-MEMORY RATE LIMITING FOR LOGIN / ADMIN ENDPOINTS (BRUTE-FORCE DEFENSE)
interface LoginAttemptRecord {
  failures: number;
  lastFailureTime: number;
  lockoutUntil: number;
}

const loginAttemptsMap = new Map<string, LoginAttemptRecord>();

export function checkLoginRateLimit(
  key: string,
  maxFailures = 5,
  lockoutDurationSeconds = 60
): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);
  if (!record) return { allowed: true };

  if (record.lockoutUntil > now) {
    const remainingSeconds = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // If last failure was more than 5 minutes ago and not locked out, clear
  if (now - record.lastFailureTime > 5 * 60 * 1000) {
    loginAttemptsMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(
  key: string,
  maxFailures = 5,
  lockoutDurationSeconds = 60
): { isLockedOut: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = loginAttemptsMap.get(key) || {
    failures: 0,
    lastFailureTime: now,
    lockoutUntil: 0,
  };

  // If last failure was > 5 minutes ago, reset failure count
  if (now - record.lastFailureTime > 5 * 60 * 1000) {
    record.failures = 0;
  }

  record.failures += 1;
  record.lastFailureTime = now;

  if (record.failures >= maxFailures) {
    record.lockoutUntil = now + lockoutDurationSeconds * 1000;
    loginAttemptsMap.set(key, record);
    return { isLockedOut: true, remainingSeconds: lockoutDurationSeconds };
  }

  loginAttemptsMap.set(key, record);
  return { isLockedOut: false };
}

export function resetLoginAttempts(key: string) {
  loginAttemptsMap.delete(key);
}

