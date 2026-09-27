import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let supabaseInstance: SupabaseClient | null = null;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isRealSupabaseConfigured =
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project') &&
  supabaseServiceKey.length > 20 &&
  !supabaseServiceKey.includes('your-supabase');

export function getSupabase(): SupabaseClient | null {
  if (!isRealSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseInstance;
}

// Fallback local file-based database for development/testing when Supabase creds are pending
const LOCAL_DB_PATH = path.join(process.cwd(), 'scratch', 'local_db.json');

interface LocalDbSchema {
  event_state: { id: number; active_round: string };
  team_progress: Record<string, { round: string; team_code: string; current_stage: string; last_updated: string }>;
  attempts: Array<{
    id: number;
    round: string;
    team_code: string;
    stage: string;
    submitted_answer: string;
    correct: boolean;
    created_at: string;
  }>;
  finale_submissions: Record<string, { round: string; team_code: string; position: number | null; submitted_at: string }>;
}

function getLocalDb(): LocalDbSchema {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading local DB, resetting:', err);
  }
  const defaultDb: LocalDbSchema = {
    event_state: { id: 1, active_round: 'round2' },
    team_progress: {},
    attempts: [],
    finale_submissions: {},
  };
  saveLocalDb(defaultDb);
  return defaultDb;
}

function saveLocalDb(data: LocalDbSchema) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local DB:', err);
  }
}

// DB Helper Functions

export async function fetchActiveRound(): Promise<string> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('event_state')
        .select('active_round')
        .eq('id', 1)
        .single();
      if (!error && data?.active_round) {
        return data.active_round;
      }
      if (error) {
        console.warn('Supabase fetchActiveRound error, falling back:', error.message);
      }
    } catch (e) {
      console.warn('Supabase error:', e);
    }
  }
  return getLocalDb().event_state.active_round || 'round2';
}

export async function updateActiveRound(round: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from('event_state')
        .upsert({ id: 1, active_round: round });
      if (error) {
        console.error('Supabase updateActiveRound error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Supabase updateActiveRound exception:', e);
      return false;
    }
  }
  const db = getLocalDb();
  db.event_state.active_round = round;
  saveLocalDb(db);
  return true;
}

export async function fetchTeamProgress(round: string, teamCode: string): Promise<string> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('team_progress')
        .select('current_stage')
        .eq('round', round)
        .eq('team_code', teamCode)
        .single();
      if (!error && data?.current_stage) {
        return data.current_stage;
      }
      // If no row exists yet, initialize it
      await sb
        .from('team_progress')
        .insert({ round, team_code: teamCode, current_stage: 'clue2' });
      return 'clue2';
    } catch (e) {
      console.warn('Supabase fetchTeamProgress error:', e);
    }
  }
  const db = getLocalDb();
  const key = `${round}:${teamCode}`;
  if (!db.team_progress[key]) {
    db.team_progress[key] = {
      round,
      team_code: teamCode,
      current_stage: 'clue2',
      last_updated: new Date().toISOString(),
    };
    saveLocalDb(db);
  }
  return db.team_progress[key].current_stage;
}

export async function updateTeamProgress(round: string, teamCode: string, newStage: string): Promise<boolean> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb
        .from('team_progress')
        .upsert({
          round,
          team_code: teamCode,
          current_stage: newStage,
          last_updated: now,
        });
      if (error) {
        console.error('Supabase updateTeamProgress error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Supabase updateTeamProgress error:', e);
      return false;
    }
  }
  const db = getLocalDb();
  const key = `${round}:${teamCode}`;
  db.team_progress[key] = {
    round,
    team_code: teamCode,
    current_stage: newStage,
    last_updated: now,
  };
  saveLocalDb(db);
  return true;
}

export async function fetchAllTeamProgress(round: string) {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('team_progress')
        .select('round, team_code, current_stage, last_updated')
        .eq('round', round);
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchAllTeamProgress error:', e);
    }
  }
  const db = getLocalDb();
  return Object.values(db.team_progress).filter((p) => p.round === round);
}

export async function logAttempt(
  round: string,
  teamCode: string,
  stage: string,
  submittedAnswer: string,
  correct: boolean
) {
  const now = new Date().toISOString();
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('attempts').insert({
        round,
        team_code: teamCode,
        stage,
        submitted_answer: submittedAnswer,
        correct,
        created_at: now,
      });
      return;
    } catch (e) {
      console.warn('Supabase logAttempt error:', e);
    }
  }
  const db = getLocalDb();
  db.attempts.push({
    id: db.attempts.length + 1,
    round,
    team_code: teamCode,
    stage,
    submitted_answer: submittedAnswer,
    correct,
    created_at: now,
  });
  saveLocalDb(db);
}

export async function fetchStageAttempts(round: string, teamCode: string, stage: string) {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('attempts')
        .select('id, round, team_code, stage, submitted_answer, correct, created_at')
        .eq('round', round)
        .eq('team_code', teamCode)
        .eq('stage', stage)
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchStageAttempts error:', e);
    }
  }
  const db = getLocalDb();
  return db.attempts
    .filter((a) => a.round === round && a.team_code === teamCode && a.stage === stage)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchAllAttempts(round: string, limit = 100) {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('attempts')
        .select('id, round, team_code, stage, submitted_answer, correct, created_at')
        .eq('round', round)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchAllAttempts error:', e);
    }
  }
  const db = getLocalDb();
  return db.attempts
    .filter((a) => a.round === round)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function fetchFinaleSubmissions(round: string) {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('finale_submissions')
        .select('round, team_code, position, submitted_at')
        .eq('round', round)
        .order('submitted_at', { ascending: true });
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchFinaleSubmissions error:', e);
    }
  }
  const db = getLocalDb();
  return Object.values(db.finale_submissions)
    .filter((s) => s.round === round)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
}

export async function markFinaleSubmission(round: string, teamCode: string) {
  const submissions = await fetchFinaleSubmissions(round);
  const existing = submissions.find((s) => s.team_code === teamCode);
  if (existing) {
    return { success: true, position: existing.position, alreadySubmitted: true };
  }
  const newPosition = submissions.length < 3 ? submissions.length + 1 : null;
  const now = new Date().toISOString();

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('finale_submissions').insert({
        round,
        team_code: teamCode,
        position: newPosition,
        submitted_at: now,
      });
      if (!error) {
        return { success: true, position: newPosition, alreadySubmitted: false };
      }
    } catch (e) {
      console.warn('Supabase markFinaleSubmission error:', e);
    }
  }
  const db = getLocalDb();
  const key = `${round}:${teamCode}`;
  db.finale_submissions[key] = {
    round,
    team_code: teamCode,
    position: newPosition,
    submitted_at: now,
  };
  saveLocalDb(db);
  return { success: true, position: newPosition, alreadySubmitted: false };
}

export async function resetRoundData(round: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('team_progress').delete().eq('round', round);
      await sb.from('attempts').delete().eq('round', round);
      await sb.from('finale_submissions').delete().eq('round', round);
    } catch (e) {
      console.warn('Supabase resetRoundData error:', e);
    }
  }

  const db = getLocalDb();
  // Clear team_progress for this round
  Object.keys(db.team_progress).forEach((key) => {
    if (db.team_progress[key].round === round) {
      delete db.team_progress[key];
    }
  });
  // Clear attempts for this round
  db.attempts = db.attempts.filter((a) => a.round !== round);
  // Clear finale_submissions for this round
  Object.keys(db.finale_submissions).forEach((key) => {
    if (db.finale_submissions[key].round === round) {
      delete db.finale_submissions[key];
    }
  });
  saveLocalDb(db);
  return true;
}
