import fs from 'fs';
import path from 'path';
import { fetchActiveRound, updateActiveRound } from './db';

// Static fallbacks to guarantee 100% serverless / Vercel compatibility
import round1TeamsStatic from '@/config/round1/teams.json';
import round1StagesStatic from '@/config/round1/stages.json';
import round2TeamsStatic from '@/config/round2/teams.json';
import round2StagesStatic from '@/config/round2/stages.json';
import settingsStatic from '@/config/settings.json';

export type RoundId = 'round1' | 'round2';

export interface Team {
  code: string;
  pin: string;
  track: string;
}

export interface Settings {
  submitCooldownSeconds: number;
  maxWrongAttempts: number;
  lockoutSeconds: number;
  eventStart: string;
  eventEnd: string;
  finaleOpen: boolean;
}

export interface StageData {
  clue2?: {
    zone: string;
    codeword: string;
    riddle?: string;
    prompt?: string;
  };
  crewmate?: {
    code: string;
    id?: string;
    name?: string;
    photo?: string;
    script?: string;
  };
  clue3?: {
    answer: string;
    nextZone: string;
    prompt?: string;
    cipherType?: string;
    hint?: string;
    intercept?: string;
    nextRiddle?: string;
  };
  clue4?: {
    zone: string;
    answer: string;
    prompt?: string;
  };
  final?: {
    zone?: string;
    directive?: string;
  };
  [key: string]: any;
}

export interface SanitizedStageData {
  clue2?: {
    riddle?: string;
    prompt?: string;
    isPhysicalEnvelope?: boolean;
  };
  crewmate?: {
    id?: string;
    name?: string;
    photo?: string;
    script?: string;
  };
  clue3?: {
    cipherType?: string;
    intercept?: string;
    hint?: string;
    nextRiddle?: string;
  };
  clue4?: {
    prompt?: string;
  };
  final?: {
    zone?: string;
    directive?: string;
  };
}

export function getSanitizedStageData(
  fullData: StageData | null | undefined,
  currentStage: string,
  round: RoundId = 'round1'
): SanitizedStageData {
  if (!fullData) return {};

  const sanitized: SanitizedStageData = {};

  // 1. Clue 2 is always unlocked from the start.
  // In Round 1, the riddle is physical (inside the envelope handed to teams at the start),
  // so we NEVER leak or give away the riddle or prompt on screen.
  // In Round 2, riddles are digital and displayed on screen.
  if (fullData.clue2) {
    const isRound1 = round === 'round1';
    sanitized.clue2 = {
      ...(currentStage === 'clue2'
        ? {
            isPhysicalEnvelope: isRound1,
            ...(!isRound1
              ? {
                  riddle: fullData.clue2.riddle,
                  ...(fullData.clue2.prompt ? { prompt: fullData.clue2.prompt } : {}),
                }
              : {}),
          }
        : {}),
    };
  }

  // 2. Crewmate unlocks once clue 2 is completed (currentStage is crewmate, clue3, clue4, or final)
  if (['crewmate', 'clue3', 'clue4', 'final'].includes(currentStage) && fullData.crewmate) {
    sanitized.crewmate = {
      id: fullData.crewmate.id,
      name: fullData.crewmate.name,
      photo: fullData.crewmate.photo,
      // Witness statement is ONLY revealed after the crewmate code has been authenticated
      ...(['clue3', 'clue4', 'final'].includes(currentStage) ? { script: fullData.crewmate.script } : {}),
    };
    // Note: crewmate code is NEVER provided to client (crewmate gives it in person)
  }

  // 3. Clue 3 unlocks once crewmate code is entered (currentStage is clue3, clue4, or final)
  if (['clue3', 'clue4', 'final'].includes(currentStage) && fullData.clue3) {
    sanitized.clue3 = {
      cipherType: fullData.clue3.cipherType,
      intercept: fullData.clue3.intercept,
      hint: fullData.clue3.hint,
      // nextRiddle is revealed AFTER clue 3 is solved so detectives can deduce the clue4 location
      ...(['clue4', 'final'].includes(currentStage)
        ? {
            nextRiddle: fullData.clue3.nextRiddle,
          }
        : {}),
    };
    // Note: clue3 answer and location names are NEVER provided to client
  }

  // 4. Clue 4 unlocks once clue3 is solved (currentStage is clue4 or final)
  if (['clue4', 'final'].includes(currentStage) && fullData.clue4) {
    sanitized.clue4 = {
      ...(fullData.clue4.prompt ? { prompt: fullData.clue4.prompt } : {}),
    };
    // Note: clue4 answer and zone are NEVER provided to client
  }

  // 5. Final stage details unlocked once clue4 is solved
  if (currentStage === 'final' && fullData.final) {
    sanitized.final = {
      zone: fullData.final.zone,
      directive: fullData.final.directive,
    };
  }

  return sanitized;
}

export function getSettings(): Settings {
  try {
    const filePath = path.join(process.cwd(), 'config', 'settings.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.warn('Using bundled settings.json fallback:', err);
  }
  return (settingsStatic as any) || {
    submitCooldownSeconds: 4,
    maxWrongAttempts: 3,
    lockoutSeconds: 90,
    eventStart: '2026-09-27T08:00:00+05:30',
    eventEnd: '2026-09-28T23:59:59+05:30',
    finaleOpen: false,
  };
}

export function checkRoundConfig(round: RoundId): {
  isReady: boolean;
  teamCount: number;
  stageCount: number;
  reason?: string;
} {
  const teams = getTeamsForRound(round);
  const stages = getStagesForRound(round);
  const teamCount = Array.isArray(teams) ? teams.length : 0;
  const stageCount = typeof stages === 'object' && stages !== null ? Object.keys(stages).length : 0;

  if (teamCount === 0 || stageCount === 0) {
    return {
      isReady: false,
      teamCount,
      stageCount,
      reason: `${round === 'round1' ? 'Round 1' : 'Round 2'} config not loaded yet`,
    };
  }

  return {
    isReady: true,
    teamCount,
    stageCount,
  };
}

export async function getLiveActiveRound(): Promise<RoundId> {
  const round = await fetchActiveRound();
  return round === 'round2' ? 'round2' : 'round1';
}

export async function setLiveActiveRound(round: RoundId): Promise<{ success: boolean; error?: string }> {
  const status = checkRoundConfig(round);
  if (!status.isReady) {
    return {
      success: false,
      error: status.reason || `Cannot switch to ${round}: configuration is incomplete or empty.`,
    };
  }
  const ok = await updateActiveRound(round);
  if (!ok) {
    return { success: false, error: 'Database update failed.' };
  }
  return { success: true };
}

export function getTeamsForRound(round: RoundId): Team[] {
  try {
    const teamsPath = path.join(process.cwd(), 'config', round, 'teams.json');
    if (fs.existsSync(teamsPath)) {
      return JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));
    }
  } catch (err) {
    console.warn(`Using bundled teams.json fallback for ${round}:`, err);
  }
  return round === 'round1' ? (round1TeamsStatic as Team[]) : (round2TeamsStatic as Team[]);
}

export function getStagesForRound(round: RoundId): Record<string, StageData> {
  try {
    const stagesPath = path.join(process.cwd(), 'config', round, 'stages.json');
    if (fs.existsSync(stagesPath)) {
      return JSON.parse(fs.readFileSync(stagesPath, 'utf-8'));
    }
  } catch (err) {
    console.warn(`Using bundled stages.json fallback for ${round}:`, err);
  }
  return round === 'round1'
    ? (round1StagesStatic as Record<string, StageData>)
    : (round2StagesStatic as Record<string, StageData>);
}

export async function getActiveRoundData(): Promise<{
  activeRound: RoundId;
  teams: Team[];
  stages: Record<string, StageData>;
  settings: Settings;
}> {
  const activeRound = await getLiveActiveRound();
  const teams = getTeamsForRound(activeRound);
  const stages = getStagesForRound(activeRound);
  const settings = getSettings();
  return { activeRound, teams, stages, settings };
}
