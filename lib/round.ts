import fs from 'fs';
import path from 'path';
import { fetchActiveRound, updateActiveRound } from './db';

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
  [key: string]: any;
}

export interface SanitizedStageData {
  clue2?: {
    zone: string;
    riddle?: string;
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
    nextZone?: string;
    nextRiddle?: string;
  };
  clue4?: {
    zone: string;
  };
}

export function getSanitizedStageData(
  fullData: StageData | null | undefined,
  currentStage: string
): SanitizedStageData {
  if (!fullData) return {};

  const sanitized: SanitizedStageData = {};

  // 1. Clue 2 is always unlocked from the start
  if (fullData.clue2) {
    sanitized.clue2 = {
      zone: fullData.clue2.zone || '',
      ...(currentStage === 'clue2' ? { riddle: fullData.clue2.riddle } : {}),
    };
  }

  // 2. Crewmate unlocks once clue 2 is completed (currentStage is crewmate, clue3, clue4, or final)
  if (['crewmate', 'clue3', 'clue4', 'final'].includes(currentStage) && fullData.crewmate) {
    sanitized.crewmate = {
      id: fullData.crewmate.id,
      name: fullData.crewmate.name,
      photo: fullData.crewmate.photo,
      ...(currentStage === 'crewmate' ? { script: fullData.crewmate.script } : {}),
    };
    // Note: crewmate code is NEVER provided to client (crewmate gives it in person)
  }

  // 3. Clue 3 unlocks once crewmate code is entered (currentStage is clue3, clue4, or final)
  if (['clue3', 'clue4', 'final'].includes(currentStage) && fullData.clue3) {
    sanitized.clue3 = {
      cipherType: fullData.clue3.cipherType,
      intercept: fullData.clue3.intercept,
      hint: fullData.clue3.hint,
      // nextZone and nextRiddle are only revealed AFTER clue 3 is solved (at clue4 or final)
      ...(['clue4', 'final'].includes(currentStage)
        ? {
            nextZone: fullData.clue3.nextZone,
            nextRiddle: fullData.clue3.nextRiddle,
          }
        : {}),
    };
    // Note: clue3 answer is NEVER provided to client
  }

  // 4. Clue 4 unlocks once clue3 is solved (currentStage is clue4 or final)
  if (['clue4', 'final'].includes(currentStage) && fullData.clue4) {
    sanitized.clue4 = {
      zone: fullData.clue4.zone || fullData.clue3?.nextZone || '',
    };
    // Note: clue4 answer is NEVER provided to client
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
    console.error('Failed to read settings.json:', err);
  }
  return {
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
  try {
    const teamsPath = path.join(process.cwd(), 'config', round, 'teams.json');
    const stagesPath = path.join(process.cwd(), 'config', round, 'stages.json');

    if (!fs.existsSync(teamsPath) || !fs.existsSync(stagesPath)) {
      return {
        isReady: false,
        teamCount: 0,
        stageCount: 0,
        reason: `${round} config files missing`,
      };
    }

    const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));
    const stages = JSON.parse(fs.readFileSync(stagesPath, 'utf-8'));

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
  } catch (err: any) {
    return {
      isReady: false,
      teamCount: 0,
      stageCount: 0,
      reason: err?.message || 'Error parsing config',
    };
  }
}

export async function getLiveActiveRound(): Promise<RoundId> {
  const round = await fetchActiveRound();
  return round === 'round1' ? 'round1' : 'round2';
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
    console.error(`Failed to load teams for ${round}:`, err);
  }
  return [];
}

export function getStagesForRound(round: RoundId): Record<string, StageData> {
  try {
    const stagesPath = path.join(process.cwd(), 'config', round, 'stages.json');
    if (fs.existsSync(stagesPath)) {
      return JSON.parse(fs.readFileSync(stagesPath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Failed to load stages for ${round}:`, err);
  }
  return {};
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
