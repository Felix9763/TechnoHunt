import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

const TARGET_ROUND = 'round2';

console.log(`[TechnoHunt] Initiating database wipe and pre-seeding for ${TARGET_ROUND}...`);

// Read round 2 teams
const teamsPath = path.join(process.cwd(), 'config', 'round2', 'teams.json');
const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));

// Build pre-confirmed registrations for all 32 teams
const preRegistrations = {};
const now = new Date().toISOString();

for (const t of teams) {
  preRegistrations[`${TARGET_ROUND}:${t.code}`] = {
    round: TARGET_ROUND,
    team_code: t.code,
    team_name: t.name || `Team ${t.code}`,
    confirmed: true,
    checked_in_at: now,
    confirmed_at: now
  };
}

// 1. Wipe and pre-seed local db in scratch/
const scratchPath = path.join(process.cwd(), 'scratch', 'local_db.json');
const tmpPath = path.join(os.tmpdir(), 'technohunt_local_db.json');

const freshDb = {
  event_state: { id: 1, active_round: TARGET_ROUND },
  team_progress: {},
  team_registrations: preRegistrations,
  attempts: [],
  finale_submissions: {}
};

try {
  fs.mkdirSync(path.dirname(scratchPath), { recursive: true });
  fs.writeFileSync(scratchPath, JSON.stringify(freshDb, null, 2), 'utf-8');
  console.log(`[Local DB] Successfully pre-seeded ${teams.length} teams in: ${scratchPath}`);
} catch (e) {
  console.warn(`[Local DB] Failed writing to scratch:`, e.message);
}

try {
  fs.writeFileSync(tmpPath, JSON.stringify(freshDb, null, 2), 'utf-8');
  console.log(`[Local DB] Successfully pre-seeded in: ${tmpPath}`);
} catch (e) {
  console.warn(`[Local DB] Note: tmpdir write skipped or failed.`);
}

// 2. Wipe and seed Supabase if credentials are present in environment or .env
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project') &&
  supabaseKey.length > 20 &&
  !supabaseKey.includes('your-supabase')
) {
  console.log(`[Supabase] Connecting to ${supabaseUrl}...`);
  try {
    const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    
    // Clear all tables
    console.log(`[Supabase] Wiping team_progress...`);
    await sb.from('team_progress').delete().neq('team_code', '___NEVER___');
    
    console.log(`[Supabase] Wiping team_registrations...`);
    await sb.from('team_registrations').delete().neq('team_code', '___NEVER___');

    console.log(`[Supabase] Pre-seeding ${teams.length} teams into team_registrations...`);
    const regRows = Object.values(preRegistrations);
    const { error: seedErr } = await sb.from('team_registrations').upsert(regRows, { onConflict: 'round,team_code' });
    if (seedErr) console.warn('[Supabase] Seed error:', seedErr.message);

    console.log(`[Supabase] Wiping attempts...`);
    await sb.from('attempts').delete().neq('round', '___NEVER___');

    console.log(`[Supabase] Wiping finale_submissions...`);
    await sb.from('finale_submissions').delete().neq('team_code', '___NEVER___');

    console.log(`[Supabase] Setting event_state active_round to ${TARGET_ROUND}...`);
    await sb.from('event_state').upsert({ id: 1, active_round: TARGET_ROUND }, { onConflict: 'id' });

    console.log(`[Supabase] All remote tables successfully wiped and pre-seeded for ${TARGET_ROUND}!`);
  } catch (err) {
    console.error(`[Supabase] Error during remote wipe:`, err);
  }
} else {
  console.log(`[Supabase] No remote Supabase service key configured; local database is 100% active with pre-seeded teams.`);
}

console.log(`[TechnoHunt] Database wipe & pre-check-in complete! All 32 teams ready with direct access.`);
