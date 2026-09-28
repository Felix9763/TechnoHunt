import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';

const TARGET_ROUND = 'round2';

console.log(`[TechnoHunt] Initiating database wipe and reset for ${TARGET_ROUND}...`);

// 1. Wipe and initialize local db in scratch/
const scratchPath = path.join(process.cwd(), 'scratch', 'local_db.json');
const tmpPath = path.join(os.tmpdir(), 'technohunt_local_db.json');

const freshDb = {
  event_state: { id: 1, active_round: TARGET_ROUND },
  team_progress: {},
  team_registrations: {},
  attempts: [],
  finale_submissions: {}
};

try {
  fs.mkdirSync(path.dirname(scratchPath), { recursive: true });
  fs.writeFileSync(scratchPath, JSON.stringify(freshDb, null, 2), 'utf-8');
  console.log(`[Local DB] Successfully wiped and initialized: ${scratchPath}`);
} catch (e) {
  console.warn(`[Local DB] Failed writing to scratch:`, e.message);
}

try {
  fs.writeFileSync(tmpPath, JSON.stringify(freshDb, null, 2), 'utf-8');
  console.log(`[Local DB] Successfully wiped and initialized: ${tmpPath}`);
} catch (e) {
  console.warn(`[Local DB] Note: tmpdir write skipped or failed.`);
}

// 2. Wipe Supabase if credentials are present in environment or .env
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

    console.log(`[Supabase] Wiping attempts...`);
    await sb.from('attempts').delete().neq('round', '___NEVER___');

    console.log(`[Supabase] Wiping finale_submissions...`);
    await sb.from('finale_submissions').delete().neq('team_code', '___NEVER___');

    console.log(`[Supabase] Setting event_state active_round to ${TARGET_ROUND}...`);
    await sb.from('event_state').upsert({ id: 1, active_round: TARGET_ROUND }, { onConflict: 'id' });

    console.log(`[Supabase] All remote tables successfully wiped and reset to ${TARGET_ROUND}!`);
  } catch (err) {
    console.error(`[Supabase] Error during remote wipe:`, err);
  }
} else {
  console.log(`[Supabase] No remote Supabase service key configured; local database is 100% active.`);
}

console.log(`[TechnoHunt] Database wipe complete. Ready for Round 2!`);
